/**
 * creativeAnalysisService.ts
 * FASE 6 — Creative Intelligence Layer
 *
 * Analisa criativos (imagem) via Vision LLM (Anthropic Claude).
 * Popula CreativeAnalysis com estrutura, narrativa e copy.
 */

import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

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

// ── Vision LLM call ────────────────────────────────────────────────────────────

async function callVisionLlm(
  imageBase64: string,
  mimeType: string,
  apiKey: string,
  model: string,
): Promise<CreativeAnalysisResult> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey });

  const prompt = `Você é um especialista em análise de criativos para anúncios de performance digital.
Analise esta imagem e retorne APENAS um JSON válido, sem markdown, sem texto extra.

{
  "has_people": boolean,
  "has_property": boolean,
  "has_text_overlay": boolean,
  "is_ugc_style": boolean,
  "is_corporate_style": boolean,
  "hook_type": "urgency|curiosity|social_proof|benefit|story|problem|other",
  "emotional_tone": "aspirational|fear|joy|trust|excitement|neutral",
  "angle": "investment|lifestyle|family|price|urgency|social|luxury|other",
  "cta_style": "direct|soft|question|command|none",
  "scene_description": "descrição objetiva da cena em 1 frase",
  "key_visual_elements": ["elemento1", "elemento2"],
  "confidence": 0.85
}`;

  const msg = await client.messages.create({
    model,
    max_tokens: 800,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: mimeType as any, data: imageBase64 },
        },
        { type: 'text', text: prompt },
      ],
    }],
  });

  const text = msg.content[0]?.type === 'text' ? msg.content[0].text.trim() : '';
  // Strip markdown code fences if present
  const clean = text.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
  return JSON.parse(clean) as CreativeAnalysisResult;
}

// ── Get LLM config ────────────────────────────────────────────────────────────

async function getLlmConfig(): Promise<{ apiKey: string; model: string }> {
  let apiKey = process.env.ANTHROPIC_API_KEY || '';
  let model  = 'claude-opus-4-5';

  try {
    const res = await getPool().query(
      `SELECT "llmProvider", "llmModel", "llmApiKey"
       FROM campanhasmarketingdigital."Settings"
       WHERE tenant_id IS NULL LIMIT 1`
    );
    const cfg = res.rows[0];
    if (cfg?.llmApiKey)   apiKey = cfg.llmApiKey;
    if (cfg?.llmModel)    model  = cfg.llmModel;
  } catch { /* fallback to env */ }

  return { apiKey, model };
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
    // 3. Ler imagem do disco
    const absolutePath = path.join(process.cwd(), 'public', asset.storage_path);
    if (!fs.existsSync(absolutePath)) throw new Error(`Arquivo não encontrado: ${absolutePath}`);

    const buffer = fs.readFileSync(absolutePath);
    const imageBase64 = buffer.toString('base64');
    const mimeType = asset.mime_type || 'image/jpeg';

    // 4. Obter config LLM e chamar Vision
    const { apiKey, model } = await getLlmConfig();
    if (!apiKey) throw new Error('API Key não configurada. Configure em Master → IA da Plataforma.');

    let result: CreativeAnalysisResult;
    try {
      result = await callVisionLlm(imageBase64, mimeType, apiKey, model);
    } catch (visionErr: any) {
      // Se vision falhar (modelo sem suporte), usar resultado vazio
      console.warn('[CreativeAnalysis] Vision falhou, usando fallback:', visionErr.message);
      result = { ...EMPTY_RESULT, confidence: 0 };
    }

    // 5. Persistir resultado
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
        analysis_status     = 'done',
        analyzed_at         = NOW()
      WHERE asset_id = $1`,
      [
        assetId,
        result.has_people, result.has_property, result.has_text_overlay,
        result.is_ugc_style, result.is_corporate_style,
        result.hook_type, result.emotional_tone, result.angle, result.cta_style,
        result.scene_description, result.key_visual_elements || [],
        model, result.confidence || 0.8,
        JSON.stringify(result),
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
}): Promise<CreativeConcept[]> {
  const { apiKey, model } = await getLlmConfig();
  if (!apiKey) throw new Error('API Key não configurada.');

  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey });

  const prompt = `Você é um especialista em criação de anúncios para o segmento ${params.segment}.

Com base no padrão vencedor abaixo, gere 5 conceitos de novos criativos.

PADRÃO VENCEDOR:
- Estilo: ${params.style}
- Hook: ${params.hook_type}
- Ângulo: ${params.angle}
- Tom emocional: ${params.emotional_tone}
- CTR médio: ${params.avg_ctr}%
- CPL médio: R$ ${params.avg_cpl}
- Anúncios testados: ${params.ads_count}

Retorne APENAS este JSON válido (sem markdown):
{
  "concepts": [
    {
      "format": "image|video_15s|video_30s|carousel",
      "scene": "descrição visual detalhada da cena",
      "hook_text": "texto de abertura (primeiros 3 segundos ou primeira linha)",
      "body": "texto do anúncio (2-3 frases diretas)",
      "headline": "headline impactante (máx 40 chars)",
      "cta": "texto do CTA",
      "why_it_works": "motivo breve baseado no padrão"
    }
  ]
}`;

  const msg = await client.messages.create({
    model,
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = msg.content[0]?.type === 'text' ? msg.content[0].text.trim() : '{}';
  const clean = text.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
  const parsed = JSON.parse(clean);
  return parsed.concepts || [];
}
