/**
 * llmClient.ts — Factory multi-provider para LLM
 *
 * - anthropic  → @anthropic-ai/sdk (SDK nativo)
 * - todos os outros → openai SDK com baseURL customizada (OpenAI-compatible)
 *
 * Interface unificada: LlmClient.complete(prompt, maxTokens) → string
 */

import { Pool } from 'pg';

export interface LlmClient {
  provider: string;
  model: string;
  complete(prompt: string, maxTokens?: number): Promise<string>;
}

// Pool isolado para consultas de settings/modelos
let _pool: Pool | null = null;
function getPool(): Pool {
  if (!_pool) _pool = new Pool({ connectionString: process.env.MARKETING_DATABASE_URL });
  return _pool;
}

/** Busca configuração LLM do tenant (provider, model, apiKey) */
async function getTenantLlmConfig(tenantId: string) {
  try {
    const res = await getPool().query(
      `SELECT "llmProvider", "llmModel", "llmApiKey"
       FROM campanhasmarketingdigital."Settings"
       WHERE tenant_id = $1::uuid LIMIT 1`,
      [tenantId]
    );
    return res.rows[0] || null;
  } catch {
    return null;
  }
}

/** Busca baseUrl do modelo na tabela LlmModel */
async function getModelBaseUrl(provider: string, modelId: string): Promise<string | null> {
  try {
    const res = await getPool().query(
      `SELECT base_url FROM campanhasmarketingdigital."LlmModel"
       WHERE provider = $1 AND model_id = $2 AND is_active = true LIMIT 1`,
      [provider, modelId]
    );
    return res.rows[0]?.base_url || null;
  } catch {
    return null;
  }
}

/** Cria cliente Anthropic nativo */
async function makeAnthropicClient(apiKey: string, model: string): Promise<LlmClient> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey });

  return {
    provider: 'anthropic',
    model,
    async complete(prompt: string, maxTokens = 2000): Promise<string> {
      const msg = await client.messages.create({
        model,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      });
      return msg.content[0]?.type === 'text' ? msg.content[0].text : '';
    },
  };
}

/** Cria cliente OpenAI-compatible (openai, gemini, groq, deepseek, kimi, openrouter, qwen) */
async function makeOpenAICompatibleClient(
  apiKey: string,
  model: string,
  baseURL: string,
  provider: string
): Promise<LlmClient> {
  const { default: OpenAI } = await import('openai');
  const client = new OpenAI({ apiKey, baseURL });

  return {
    provider,
    model,
    async complete(prompt: string, maxTokens = 2000): Promise<string> {
      const res = await client.chat.completions.create({
        model,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      });
      return res.choices[0]?.message?.content || '';
    },
  };
}

/**
 * Retorna um LlmClient usando a configuração GLOBAL da plataforma (tenant_id IS NULL).
 * Usado por todos os motores LLM de campanhas.
 * Fallback: ANTHROPIC_API_KEY do .env.
 */
export async function getLlmClientForCampaigns(): Promise<LlmClient> {
  let provider = 'anthropic';
  let model    = 'claude-sonnet-4-6';
  let apiKey   = process.env.ANTHROPIC_API_KEY || '';

  try {
    const res = await getPool().query(
      `SELECT "llmProvider", "llmModel", "llmApiKey"
       FROM campanhasmarketingdigital."Settings"
       WHERE tenant_id IS NULL LIMIT 1`
    );
    const cfg = res.rows[0];
    if (cfg?.llmProvider) provider = cfg.llmProvider;
    if (cfg?.llmModel)    model    = cfg.llmModel;
    if (cfg?.llmApiKey)   apiKey   = cfg.llmApiKey;
  } catch {
    // fallback to env
  }

  if (!apiKey) {
    throw new Error('Nenhuma API Key configurada para campanhas. Configure em Master → IA da Plataforma.');
  }

  if (provider === 'anthropic') {
    return makeAnthropicClient(apiKey, model);
  }

  const baseURL = await getModelBaseUrl(provider, model);
  if (!baseURL) {
    throw new Error(`Provider "${provider}" ou modelo "${model}" não encontrado na tabela LlmModel.`);
  }

  return makeOpenAICompatibleClient(apiKey, model, baseURL, provider);
}

/**
 * Retorna um LlmClient configurado para o tenant.
 * Fallback: ANTHROPIC_API_KEY do .env se tenant não tiver configuração.
 */
export async function getLlmClient(tenantId?: string | null): Promise<LlmClient> {
  let provider = 'anthropic';
  let model    = 'claude-sonnet-4-5';
  let apiKey   = process.env.ANTHROPIC_API_KEY || '';

  if (tenantId) {
    const cfg = await getTenantLlmConfig(tenantId);
    if (cfg?.llmProvider) provider = cfg.llmProvider;
    if (cfg?.llmModel)    model    = cfg.llmModel;
    if (cfg?.llmApiKey)   apiKey   = cfg.llmApiKey;
  }

  if (!apiKey) {
    throw new Error(`Nenhuma API Key configurada para o provider "${provider}". Configure em Configurações → IA.`);
  }

  if (provider === 'anthropic') {
    return makeAnthropicClient(apiKey, model);
  }

  // Para todos os outros: OpenAI-compatible
  const baseURL = await getModelBaseUrl(provider, model);
  if (!baseURL) {
    throw new Error(`Provider "${provider}" ou modelo "${model}" não encontrado na tabela LlmModel.`);
  }

  return makeOpenAICompatibleClient(apiKey, model, baseURL, provider);
}

/** @deprecated Use getLlmClient() — mantido para compatibilidade */
export async function getAnthropicClient(tenantId?: string | null) {
  const client = await getLlmClient(tenantId);
  return { client: null as any, model: client.model, _llmClient: client };
}
