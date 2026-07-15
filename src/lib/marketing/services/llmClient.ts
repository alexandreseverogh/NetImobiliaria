/**
 * llmClient.ts — Factory multi-provider para LLM
 *
 * - anthropic  → @anthropic-ai/sdk (SDK nativo)
 * - todos os outros → openai SDK com baseURL customizada (OpenAI-compatible)
 *
 * Interface unificada: LlmClient.complete(prompt, maxTokens) → string
 */

import { Pool } from 'pg';

export interface LlmToolDef {
  name: string;
  description: string;
  parameters: { type: 'object'; properties: Record<string, any>; required?: string[] };
}

export interface LlmToolCall {
  id: string;
  name: string;
  input: Record<string, any>;
}

/** Histórico normalizado do loop de tool-use — provider-agnóstico (ver completeWithTools). */
export type LlmMessage =
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string; toolCalls?: LlmToolCall[] }
  | { role: 'tool_result'; toolCallId: string; content: string };

export interface LlmToolResponse {
  content: string;
  toolCalls: LlmToolCall[];
}

export interface LlmClient {
  provider: string;
  model: string;
  complete(prompt: string, maxTokens?: number): Promise<string>;
  /** Uma rodada do loop de tool-use — o chamador decide se executa toolCalls e chama de novo. */
  completeWithTools(system: string, messages: LlmMessage[], tools: LlmToolDef[], maxTokens?: number): Promise<LlmToolResponse>;
}

/**
 * Fallback defensivo: alguns modelos (ex.: llama-3.3-70b no Groq) não usam o campo estruturado
 * de tool-calling da API — escrevem a "chamada" como texto solto no content, algo como
 * `<function.agrupar_imovel '{"campo": "estado_fk"}'</function>`. Isso não é um bug do NOSSO
 * código (a API já devolve `tool_calls` vazio nesse caso) — é o modelo não sendo fine-tuned pra
 * usar o formato certo. Detecta e recupera esse padrão como se fossem tool_calls reais, só
 * quando a API não retornou nenhum tool_call estruturado — nunca interfere no caminho normal.
 */
function parsePseudoToolCalls(content: string): LlmToolCall[] {
  const calls: LlmToolCall[] = [];
  const re = /<function\.([a-zA-Z_]\w*)\s*'?(\{[\s\S]*?\})'?\s*<\/function>/g;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = re.exec(content)) !== null) {
    try {
      const input = JSON.parse(match[2]);
      calls.push({ id: `pseudo-${Date.now()}-${i++}`, name: match[1], input });
    } catch {
      // JSON malformado dentro do pseudo-bloco — ignora esse trecho, não derruba o turno inteiro.
    }
  }
  return calls;
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
    async completeWithTools(system: string, messages: LlmMessage[], tools: LlmToolDef[], maxTokens = 1024): Promise<LlmToolResponse> {
      const anthropicMessages: any[] = [];
      for (const m of messages) {
        if (m.role === 'user') {
          anthropicMessages.push({ role: 'user', content: m.content });
        } else if (m.role === 'assistant') {
          const content: any[] = [];
          if (m.content) content.push({ type: 'text', text: m.content });
          for (const tc of m.toolCalls ?? []) content.push({ type: 'tool_use', id: tc.id, name: tc.name, input: tc.input });
          anthropicMessages.push({ role: 'assistant', content });
        } else if (m.role === 'tool_result') {
          // Anthropic exige todos os tool_result de uma rodada num único bloco 'user' —
          // agrupa com o anterior se ele já for esse bloco.
          const block = { type: 'tool_result', tool_use_id: m.toolCallId, content: m.content };
          const last = anthropicMessages[anthropicMessages.length - 1];
          if (last?.role === 'user' && Array.isArray(last.content) && last.content[0]?.type === 'tool_result') {
            last.content.push(block);
          } else {
            anthropicMessages.push({ role: 'user', content: [block] });
          }
        }
      }

      // tools omitido quando vazio — a API rejeita `tools: []` (usado na rodada final
      // do loop de tool-use, que força uma resposta em texto sem novas ferramentas).
      const req: any = { model, max_tokens: maxTokens, system, messages: anthropicMessages };
      if (tools.length > 0) req.tools = tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.parameters }));
      const msg = await client.messages.create(req);

      let content = '';
      const toolCalls: LlmToolCall[] = [];
      for (const block of msg.content) {
        if (block.type === 'text') content += block.text;
        else if (block.type === 'tool_use') toolCalls.push({ id: block.id, name: block.name, input: block.input as Record<string, any> });
      }
      return { content, toolCalls };
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
    async completeWithTools(system: string, messages: LlmMessage[], tools: LlmToolDef[], maxTokens = 1024): Promise<LlmToolResponse> {
      const oaMessages: any[] = [{ role: 'system', content: system }];
      for (const m of messages) {
        if (m.role === 'user') {
          oaMessages.push({ role: 'user', content: m.content });
        } else if (m.role === 'assistant') {
          oaMessages.push({
            role: 'assistant',
            content: m.content || null,
            tool_calls: (m.toolCalls?.length ?? 0) > 0
              ? m.toolCalls!.map((tc) => ({ id: tc.id, type: 'function', function: { name: tc.name, arguments: JSON.stringify(tc.input) } }))
              : undefined,
          });
        } else if (m.role === 'tool_result') {
          oaMessages.push({ role: 'tool', tool_call_id: m.toolCallId, content: m.content });
        }
      }

      // tools omitido quando vazio — mesma razão do branch Anthropic (rodada final do loop).
      const req: any = { model, max_tokens: maxTokens, messages: oaMessages };
      if (tools.length > 0) req.tools = tools.map((t) => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.parameters } }));

      // Nota: cheguei a testar um fallback aqui — se a API rejeitar por "tool call validation"
      // (ex.: Groq gpt-oss-120b gerando nome de ferramenta com caractere Unicode parecido mas
      // diferente, tipo "а"/"р" cirílicos em vez de latinos), repetir a MESMA chamada sem `tools`
      // pra pelo menos devolver algo. Testado ao vivo e REVERTIDO: sem tools, o modelo às vezes
      // responde com dado 100% inventado (chegou a citar "São Paulo" pra um tenant que só tem
      // imóveis em Pernambuco) de forma confiante — pior que a mensagem de desculpa genérica, que
      // pelo menos é honesta sobre a falha. Deixa o erro subir normalmente (tratado no chamador).
      const res = await client.chat.completions.create(req);

      const choice = res.choices[0]?.message;
      let toolCalls: LlmToolCall[] = (choice?.tool_calls ?? []).map((tc: any) => ({
        id: tc.id, name: tc.function.name, input: JSON.parse(tc.function.arguments || '{}'),
      }));
      let content = choice?.content ?? '';

      if (toolCalls.length === 0 && content) {
        const pseudo = parsePseudoToolCalls(content);
        if (pseudo.length > 0) {
          toolCalls = pseudo;
          content = ''; // texto bruto da pseudo-chamada nunca deve chegar ao visitante
        }
      }

      return { content, toolCalls };
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
  let apiKey   = '';

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
    // fallback
  }

  if (provider === 'anthropic' && !apiKey) {
    try {
      const res = await getPool().query(
        `SELECT anthropic_api_key FROM public.tenants ORDER BY slug = 'master' DESC, id LIMIT 1`
      );
      if (res.rows[0]?.anthropic_api_key) {
        apiKey = res.rows[0].anthropic_api_key;
      }
    } catch {}
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
 */
export async function getLlmClient(tenantId?: string | null): Promise<LlmClient> {
  let provider = 'anthropic';
  let model    = 'claude-sonnet-4-5';
  let apiKey   = '';

  if (tenantId) {
    try {
      const tenantRes = await getPool().query(
        `SELECT anthropic_api_key FROM public.tenants WHERE id = $1::uuid LIMIT 1`,
        [tenantId]
      );
      if (tenantRes.rows[0]?.anthropic_api_key) {
        apiKey = tenantRes.rows[0].anthropic_api_key;
      }
    } catch {}
  }

  if (tenantId) {
    const cfg = await getTenantLlmConfig(tenantId);
    if (cfg?.llmProvider) provider = cfg.llmProvider;
    if (cfg?.llmModel)    model    = cfg.llmModel;
    if (cfg?.llmApiKey && !apiKey)   apiKey = cfg.llmApiKey;
  }

  if (provider === 'anthropic' && !apiKey) {
    try {
      const res = await getPool().query(
        `SELECT anthropic_api_key FROM public.tenants ORDER BY slug = 'master' DESC, id LIMIT 1`
      );
      if (res.rows[0]?.anthropic_api_key) {
        apiKey = res.rows[0].anthropic_api_key;
      }
    } catch {}
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
