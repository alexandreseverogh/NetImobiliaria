/**
 * creativeAnalysisService.ts
 * FASE 6 — Creative Intelligence Layer
 *
 * Analisa criativos (imagem) via Vision LLM.
 * Usa o mesmo provider/modelo/key configurados em Master → IA da Plataforma
 * (linha global da Settings, tenant_id IS NULL).
 *
 * Suporte multi-provider:
 *   anthropic           → Anthropic SDK (messages com image block base64)
 *   openai | gemini |   → OpenAI-compatible SDK (chat.completions com image_url data URL)
 *   groq | deepseek |
 *   openrouter | ...
 */

import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { resolvePromptTemplate } from '@/lib/intelligence/promptResolver';

let _pool: Pool | null = null;
function getPool(): Pool {
  if (!_pool) _pool = new Pool({ connectionString: process.env.MARKETING_DATABASE_URL });
  return _pool;
}

export interface CreativeAnalysisResult {
  has_people: boolean;
  has_property: boolean;
  has_text_overlay: boolean;
  is_ugc_style: boolean;
  is_corporate_style: boolean;
  hook_type: string;
  emotional_tone: string;
  angle: string;
  cta_style: string;
  scene_description: string;
  key_visual_elements: string[];
  confidence: number;
}

const EMPTY_RESULT: CreativeAnalysisResult = {
  has_people: false, has_property: false, has_text_overlay: false,
  is_ugc_style: false, is_corporate_style: false,
  hook_type: 'other', emotional_tone: 'neutral',
  angle: 'other', cta_style: 'none',
  scene_description: 'Imagem não pôde ser analisada.',
  key_visual_elements: [], confidence: 0,
};

// Enum real de hook_type ditado pro modelo no prompt creative_vision_analysis. O LLM não
// respeita esse enum de forma confiável (achado real: 8 criativos gravados com "price"/
// "investment" — valores que só são válidos no campo ANGLE, um conceito diferente de hook —
// contaminando o cálculo de saturação de hook em hookSaturationService.ts). Clampar aqui
// garante que só o schema real seja persistido, sem depender só da obediência do prompt.
const VALID_HOOK_TYPES = new Set([
  'urgency', 'curiosity', 'social_proof', 'benefit', 'story', 'problem', 'other',
]);

/** Substitui {{variavel}} pelo valor correspondente no mapa. */
function applyVariables(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

// ── Get LLM config (lê a linha global do Master) ──────────────────────────────

async function getLlmConfig(): Promise<{ apiKey: string; model: string; provider: string; baseUrl?: string }> {
  let provider = 'anthropic';
  let model    = 'claude-sonnet-4-6';
  let apiKey   = '';
  let baseUrl: string | undefined;

  // Sempre usa a linha global (tenant_id IS NULL) — configurada em Master → IA da Plataforma
  try {
    const res = await getPool().query(
      `SELECT "llmProvider", "llmModel", "llmApiKey"
       FROM campanhasmarketingdigital."Settings"
       WHERE tenant_id IS NULL
       ORDER BY id LIMIT 1`
    );
    const cfg = res.rows[0];
    if (cfg?.llmProvider) provider = cfg.llmProvider;
    if (cfg?.llmModel)    model    = cfg.llmModel;
    if (cfg?.llmApiKey)   apiKey   = cfg.llmApiKey;
  } catch (err) {
    console.error('[getLlmConfig] Erro ao ler Settings global:', err);
  }

  if (provider !== 'anthropic') {
    try {
      const res = await getPool().query(
        `SELECT base_url FROM campanhasmarketingdigital."LlmModel"
         WHERE provider = $1 AND model_id = $2 AND is_active = true LIMIT 1`,
        [provider, model]
      );
      baseUrl = res.rows[0]?.base_url ?? undefined;
    } catch { /* ignore */ }
  }

  return { provider, model, apiKey, baseUrl };
}

// ── Vision LLM call — multi-provider ─────────────────────────────────────────

async function callVisionLlm(
  imageBase64: string,
  mimeType: string,
  cfg: Awaited<ReturnType<typeof getLlmConfig>>,
  visionPrompt: string,
): Promise<CreativeAnalysisResult> {
  const { provider, model, apiKey, baseUrl } = cfg;

  let rawText: string;

  if (provider === 'anthropic') {
    // ── Anthropic SDK nativo ──────────────────────────────────────────────────
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model,
      max_tokens: 800,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mimeType as any, data: imageBase64 } },
          { type: 'text', text: visionPrompt },
        ],
      }],
    });
    rawText = msg.content[0]?.type === 'text' ? msg.content[0].text.trim() : '';
  } else {
    // ── OpenAI-compatible (OpenAI, Gemini via OpenAI-compat, Groq, DeepSeek…) ─
    if (!baseUrl) throw new Error(`baseUrl não encontrada para provider "${provider}" / modelo "${model}"`);
    const { default: OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey, baseURL: baseUrl });
    const res = await client.chat.completions.create({
      model,
      max_tokens: 800,
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
          { type: 'text', text: visionPrompt },
        ] as any,
      }],
    });
    rawText = res.choices[0]?.message?.content?.trim() ?? '';
  }

  // Strip markdown code fences
  const clean = rawText.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
  return JSON.parse(clean) as CreativeAnalysisResult;
}

// ── Main: analyzeCreativeAsset ─────────────────────────────────────────────────

export async function analyzeCreativeAsset(assetId: string): Promise<void> {
  const pool = getPool();

  // 1. Buscar asset
  const assetRes = await pool.query(
    `SELECT id, storage_path, storage_url, mime_type, tenant_id
     FROM campanhasmarketingdigital."CreativeAsset"
     WHERE id = $1`,
    [assetId]
  );
  if (!assetRes.rows.length) throw new Error(`Asset ${assetId} não encontrado`);
  const asset = assetRes.rows[0];

  // 2. Marcar como "running"
  await pool.query(
    `INSERT INTO campanhasmarketingdigital."CreativeAnalysis"
       (asset_id, tenant_id, analysis_status)
     VALUES ($1, $2, 'running')
     ON CONFLICT (asset_id) DO UPDATE SET analysis_status = 'running', error_message = NULL`,
    [assetId, asset.tenant_id]
  );

  try {
    // 3. Ler imagem — tenta disco local primeiro, cai para URL (MinIO/S3) se não encontrar
    const absolutePath = path.join(process.cwd(), 'public', asset.storage_path);
    let buffer: Buffer;

    if (fs.existsSync(absolutePath)) {
      buffer = fs.readFileSync(absolutePath);
    } else if (asset.storage_url) {
      // Variações geradas por IA ficam no MinIO — busca via HTTP
      let fetchUrl: string = asset.storage_url;
      if (fetchUrl.startsWith('/')) {
        const base = (process.env.PUBLIC_DOMAIN || 'http://localhost:3001').replace(/\/$/, '');
        fetchUrl = `${base}${fetchUrl}`;
      }
      const res = await fetch(fetchUrl, { signal: AbortSignal.timeout(15_000) });
      if (!res.ok) throw new Error(`Falha ao buscar imagem via URL (${res.status}): ${fetchUrl}`);
      buffer = Buffer.from(await res.arrayBuffer());
    } else {
      throw new Error(`Arquivo não encontrado em disco nem URL: ${absolutePath}`);
    }

    const imageBase64 = buffer.toString('base64');
    const mimeType = asset.mime_type || 'image/jpeg';

    // 4. Obter config LLM, prompt do banco e chamar Vision
    const llmCfg = await getLlmConfig();
    if (!llmCfg.apiKey) throw new Error('API Key não configurada. Configure em Master → IA da Plataforma.');

    const visionPrompt = await resolvePromptTemplate('creative_vision_analysis', null);
    if (!visionPrompt) throw new Error('Prompt template não encontrado: creative_vision_analysis. Execute a migration SQL.');

    console.log(`[CreativeAnalysis] Usando provider=${llmCfg.provider} modelo=${llmCfg.model}`);

    let result: CreativeAnalysisResult;
    try {
      result = await callVisionLlm(imageBase64, mimeType, llmCfg, visionPrompt);
    } catch (visionErr: any) {
      console.warn('[CreativeAnalysis] Vision falhou:', visionErr.message);

      // Detectar erro de modelo sem suporte a Vision (Groq, etc.)
      const msg: string = visionErr.message ?? '';
      if (
        msg.includes('content must be a string') ||
        msg.includes('does not support images') ||
        msg.includes('image_url') ||
        msg.includes('vision') ||
        msg.includes('multimodal')
      ) {
        throw new Error(
          `O modelo "${llmCfg.model}" (${llmCfg.provider}) não suporta análise de imagens (Vision). ` +
          `Configure um modelo com suporte Vision em Master → IA da Plataforma ` +
          `(ex: claude-3-5-sonnet, gpt-4o, llama-4-scout-17b-16e-instruct).`
        );
      }
      // Re-lançar para cair no catch externo que grava analysis_status = 'failed'
      throw new Error(`Vision LLM falhou: ${msg}`);
    }

    // Clampa hook_type contra o enum real do prompt — nunca persistir um valor que só
    // faz sentido no campo angle (ex.: "price"/"investment"/"luxury").
    if (!VALID_HOOK_TYPES.has(result.hook_type)) {
      console.warn(
        `[CreativeAnalysis] hook_type fora do enum: "${result.hook_type}" (asset ${assetId}) — gravando como "other"`
      );
      result.hook_type = 'other';
    }

    // 5. Persistir resultado
    const finalStatus = (result.confidence ?? 0) > 0 ? 'done' : 'failed';
    await pool.query(
      `UPDATE campanhasmarketingdigital."CreativeAnalysis" SET
        has_people          = $2,
        has_property        = $3,
        has_text_overlay    = $4,
        is_ugc_style        = $5,
        is_corporate_style  = $6,
        hook_type           = $7,
        emotional_tone      = $8,
        angle               = $9,
        cta_style           = $10,
        scene_description   = $11,
        key_visual_elements = $12,
        llm_model_used      = $13,
        llm_confidence      = $14,
        raw_analysis        = $15,
        analysis_status     = $16,
        analyzed_at         = NOW()
      WHERE asset_id = $1`,
      [
        assetId,
        result.has_people, result.has_property, result.has_text_overlay,
        result.is_ugc_style, result.is_corporate_style,
        result.hook_type, result.emotional_tone, result.angle, result.cta_style,
        result.scene_description, result.key_visual_elements || [],
        llmCfg.model,
        result.confidence ?? 0,   // nunca usar || 0.8 — gravar o valor real
        JSON.stringify(result),
        finalStatus,
      ]
    );

    console.log(`✅ [CreativeAnalysis] Asset ${assetId} analisado com sucesso`);
  } catch (err: any) {
    console.error(`❌ [CreativeAnalysis] Asset ${assetId} falhou:`, err.message);
    await pool.query(
      `UPDATE campanhasmarketingdigital."CreativeAnalysis"
       SET analysis_status = 'failed', error_message = $2
       WHERE asset_id = $1`,
      [assetId, err.message]
    );
  }
}

// ── Concept Generator ──────────────────────────────────────────────────────────

export interface CreativeConcept {
  format: string;
  scene: string;
  hook_text: string;
  body: string;
  headline: string;
  cta: string;
  why_it_works: string;
}

export async function generateCreativeConcepts(params: {
  segment: string;
  style: string;
  hook_type: string;
  angle: string;
  emotional_tone: string;
  avg_ctr: string;
  avg_cpl: string;
  ads_count: string;
  tenantId?: string | null;
}): Promise<CreativeConcept[]> {
  const llmCfg = await getLlmConfig();
  if (!llmCfg.apiKey) throw new Error('API Key não configurada.');

  const conceptTemplate = await resolvePromptTemplate('creative_concept_generation', null);
  if (!conceptTemplate) throw new Error('Prompt template não encontrado: creative_concept_generation. Execute a migration SQL.');

  const prompt = applyVariables(conceptTemplate, {
    segment:       params.segment,
    style:         params.style,
    hook_type:     params.hook_type,
    angle:         params.angle,
    emotional_tone: params.emotional_tone,
    avg_ctr:       params.avg_ctr,
    avg_cpl:       params.avg_cpl,
    ads_count:     params.ads_count,
  });

  let rawText: string;

  if (llmCfg.provider === 'anthropic') {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: llmCfg.apiKey });
    const msg = await client.messages.create({
      model: llmCfg.model, max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });
    rawText = msg.content[0]?.type === 'text' ? msg.content[0].text.trim() : '{}';
  } else {
    if (!llmCfg.baseUrl) throw new Error(`baseUrl não encontrada para provider "${llmCfg.provider}"`);
    const { default: OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey: llmCfg.apiKey, baseURL: llmCfg.baseUrl });
    const res = await client.chat.completions.create({
      model: llmCfg.model, max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });
    rawText = res.choices[0]?.message?.content?.trim() ?? '{}';
  }

  const clean = rawText.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
  const parsed = JSON.parse(clean);
  return parsed.concepts || [];
}
