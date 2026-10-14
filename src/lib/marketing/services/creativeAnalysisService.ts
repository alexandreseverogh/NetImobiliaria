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
import { resolveSegment } from '@/lib/intelligence/segmentResolver';
import { resolveAngleScope, matchAngle } from './angleResolver';
import { getSegmentHookTypes, getSegmentCtaStyles, getSegmentBooleanChecks, matchTaxonomyOption, type TaxonomyOption, type BooleanCheck } from './creativeTaxonomyResolver';

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
  // Correção P3 (docs/PLANO_INTEGRACAO_JEV.md §5.2) — hook_type/angle/cta_style agora são
  // validados contra a taxonomia real do segmento; sem match, ficam null (nunca forçados pra
  // um valor que pode nem existir num catálogo customizado).
  hook_type: string | null;
  emotional_tone: string;
  angle: string | null;
  cta_style: string | null;
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

// Correção P3 (docs/PLANO_INTEGRACAO_JEV.md §5.2) — hook_type/cta_style/angle deixaram de ser
// validados contra um enum fixo em código (VALID_HOOK_TYPES, abaixo) ou simplesmente não
// validados (cta_style nunca teve clamp nenhum; angle era uma 3ª fonte desalinhada de
// `segment_angle_terms`/`angles.ts`). Agora as 3 dimensões são resolvidas por SEGMENTO
// (`segment_hook_type_terms`/`segment_cta_style_terms`/`segment_angle_terms`), curadas pelo
// Master, com fallback transparente pra esta mesma lista legada enquanto um segmento ainda
// não tiver taxonomia própria cadastrada (nunca deveria acontecer — a migração já faz backfill
// de todo segmento ativo — mas mantido como rede de segurança, mesmo padrão de angleResolver.ts).
const LEGACY_HOOK_TYPES: TaxonomyOption[] = [
  { slug: 'urgency', label: 'Urgência' }, { slug: 'curiosity', label: 'Curiosidade' },
  { slug: 'social_proof', label: 'Prova Social' }, { slug: 'benefit', label: 'Benefício' },
  { slug: 'story', label: 'História' }, { slug: 'problem', label: 'Problema' }, { slug: 'other', label: 'Outro' },
];
const LEGACY_CTA_STYLES: TaxonomyOption[] = [
  { slug: 'direct', label: 'Direto' }, { slug: 'soft', label: 'Suave' }, { slug: 'question', label: 'Pergunta' },
  { slug: 'command', label: 'Comando' }, { slug: 'none', label: 'Nenhum' },
];
const LEGACY_BOOLEAN_CHECKS: BooleanCheck[] = [
  { key: 'has_people', label: 'Tem pessoa(s) visível(is) na imagem' },
  { key: 'has_property', label: 'Tem o item/ativo principal do anúncio visível na imagem' },
  { key: 'has_text_overlay', label: 'Tem texto sobreposto na imagem' },
  { key: 'is_ugc_style', label: 'Estilo UGC (parece conteúdo de usuário, não produção profissional)' },
  { key: 'is_corporate_style', label: 'Estilo corporativo/institucional' },
];

function optionsListText(options: TaxonomyOption[]): string {
  return options.map(o => `${o.slug} — ${o.label}`).join('\n');
}
function checksContextText(checks: BooleanCheck[]): string {
  return checks.map(c => `${c.key}: ${c.label}`).join('\n');
}

/** Substitui {{variavel}} pelo valor correspondente no mapa. */
function applyVariables(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

// ── Get LLM config (lê a linha global do Master) ──────────────────────────────

async function getLlmConfig(): Promise<{ apiKey: string; model: string; provider: string; baseUrl?: string }> {
  let provider = 'anthropic';
  let model    = 'claude-sonnet-4-5';
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
    // Fetch cru, não o SDK `openai` — mesmo motivo documentado em llmClient.ts/
    // postChatCompletion: o pacote quebra de forma reproduzível (400 "no body") contra o shim
    // OpenAI-compat do Gemini, dentro do runtime RSC do Next.js/webpack. Replicado aqui pra não
    // reintroduzir o mesmo bug já corrigido no motor de texto.
    if (!baseUrl) throw new Error(`baseUrl não encontrada para provider "${provider}" / modelo "${model}"`);
    const res = await fetch(`${baseUrl.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        max_tokens: 800,
        // Gemini (reasoning model por padrão) gasta o orçamento inteiro em "pensamento" interno
        // antes de emitir texto visível — confirmado ao vivo: sem isso, finish_reason:'length'
        // com completion_tokens:0, mesmo com max_tokens alto. Campo ignorado sem erro pelos
        // demais providers (Groq/DeepSeek/OpenAI/Kimi/OpenRouter/Qwen), então seguro deixar
        // condicional só ao provider real, sem quebrar os outros.
        ...(provider === 'gemini' ? { reasoning_effort: 'none' } : {}),
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
            { type: 'text', text: visionPrompt },
          ],
        }],
      }),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`LLM request failed (${res.status}): ${text.slice(0, 500) || '(corpo vazio)'}`);
    const data = JSON.parse(text);
    rawText = data.choices?.[0]?.message?.content?.trim() ?? '';
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

    const visionPromptRaw = await resolvePromptTemplate('creative_vision_analysis', null);
    if (!visionPromptRaw) throw new Error('Prompt template não encontrado: creative_vision_analysis. Execute a migration SQL.');

    // Correção P3 — resolve a taxonomia REAL do segmento deste criativo (via tenant/cliente do
    // asset), com fallback transparente pra legada se o segmento não tiver cadastro próprio.
    const segment = await resolveSegment(asset.tenant_id, asset.client_id ?? null).catch(() => null);
    const angleScope = await resolveAngleScope(asset.tenant_id, asset.client_id ?? null);
    const hookOptions: TaxonomyOption[] = segment
      ? await getSegmentHookTypes(segment.id).catch(() => [])
      : [];
    const ctaOptions: TaxonomyOption[] = segment
      ? await getSegmentCtaStyles(segment.id).catch(() => [])
      : [];
    const booleanChecks: BooleanCheck[] = segment
      ? await getSegmentBooleanChecks(segment.id).catch(() => [])
      : [];
    const effectiveHookOptions = hookOptions.length > 0 ? hookOptions : LEGACY_HOOK_TYPES;
    const effectiveCtaOptions  = ctaOptions.length  > 0 ? ctaOptions  : LEGACY_CTA_STYLES;
    const effectiveChecks      = booleanChecks.length > 0 ? booleanChecks : LEGACY_BOOLEAN_CHECKS;

    const visionPrompt = applyVariables(visionPromptRaw, {
      angle_options: optionsListText(angleScope.options),
      hook_options:  optionsListText(effectiveHookOptions),
      cta_options:   optionsListText(effectiveCtaOptions),
      boolean_checks_context: checksContextText(effectiveChecks),
    });

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
          `(ex: claude-sonnet-4-5, gpt-4o, gemini-flash-latest).`
        );
      }
      // Re-lançar para cair no catch externo que grava analysis_status = 'failed'
      throw new Error(`Vision LLM falhou: ${msg}`);
    }

    // Correção P3 — clampa as 3 dimensões categóricas contra a taxonomia REAL do segmento
    // (nunca mais um Set fixo em código) — e, diferente da versão anterior, nunca força um
    // valor fora da taxonomia pra dentro dela (ex.: 'other' pode nem existir num catálogo
    // customizado) — sem match, grava null (honesto), igual ao classificador em lote (P1).
    const matchedHook = matchTaxonomyOption(result.hook_type, effectiveHookOptions);
    if (!matchedHook) {
      console.warn(`[CreativeAnalysis] hook_type fora da taxonomia do segmento: "${result.hook_type}" (asset ${assetId}) — gravando null`);
    }
    result.hook_type = matchedHook;

    const matchedCta = matchTaxonomyOption(result.cta_style, effectiveCtaOptions);
    if (!matchedCta) {
      console.warn(`[CreativeAnalysis] cta_style fora da taxonomia do segmento: "${result.cta_style}" (asset ${assetId}) — gravando null`);
    }
    result.cta_style = matchedCta;

    const matchedAngle = matchAngle(result.angle, angleScope.options);
    if (!matchedAngle) {
      console.warn(`[CreativeAnalysis] angle fora da taxonomia do segmento: "${result.angle}" (asset ${assetId}) — gravando null`);
    }
    result.angle = matchedAngle;

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

/** Chama o LLM configurado (linha global, mesma cascata multi-provider do resto do arquivo)
 *  com um prompt de texto puro e devolve o JSON já sem markdown — compartilhado pelos dois
 *  geradores (padrão vencedor + sugestão visual sem histórico). */
async function callTextLlmForJson(
  prompt: string,
  llmCfg: Awaited<ReturnType<typeof getLlmConfig>>,
  maxTokens = 2000,
): Promise<any> {
  let rawText: string;

  if (llmCfg.provider === 'anthropic') {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: llmCfg.apiKey });
    const msg = await client.messages.create({
      model: llmCfg.model, max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    });
    rawText = msg.content[0]?.type === 'text' ? msg.content[0].text.trim() : '{}';
  } else {
    if (!llmCfg.baseUrl) throw new Error(`baseUrl não encontrada para provider "${llmCfg.provider}"`);
    const { default: OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey: llmCfg.apiKey, baseURL: llmCfg.baseUrl });
    const res = await client.chat.completions.create({
      model: llmCfg.model, max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    });
    rawText = res.choices[0]?.message?.content?.trim() ?? '{}';
  }

  const clean = rawText.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
  return JSON.parse(clean);
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

  const parsed = await callTextLlmForJson(prompt, llmCfg);
  return parsed.concepts || [];
}

// ── Sugestão de hook sem histórico (Caminho B) ──────────────────────────────────
//
// Diferente de generateCreativeConcepts (que se ancora em CTR/CPL real — "padrão vencedor"),
// este gerador nunca tem métrica de performance real por trás (é exatamente o cenário de
// "sem histórico" — empresa nova, lançamento na planta, etc.). Por isso: (1) só cobre os 4
// hooks de SAFE_COLD_START_HOOKS (nunca Urgência-de-estoque nem Prova Social, que exigem um
// fato externo verificável que não existe aqui); (2) o prompt é ancorado só nas cenas REAIS já
// descritas pela Vision no upload de cada criativo — nunca inventa número, estatística,
// certificação ou qualquer alegação que não esteja literalmente na cena.

export interface VisualHookSuggestion {
  hookType: string;
  sceneAssetId: string | null;
  hookText: string;
  why: string;
}

export async function generateVisualHookSuggestions(params: {
  segment: string;
  missingHooks: string[];  // subconjunto de SAFE_COLD_START_HOOKS
  hookLabels: Record<string, string>;
  scenes: { assetId: string; sceneDescription: string; keyVisualElements: string[] }[];
}): Promise<VisualHookSuggestion[]> {
  if (params.scenes.length === 0 || params.missingHooks.length === 0) return [];

  const llmCfg = await getLlmConfig();
  if (!llmCfg.apiKey) throw new Error('API Key não configurada.');

  const template = await resolvePromptTemplate('creative_hook_suggestion_coldstart', null);
  if (!template) throw new Error('Prompt template não encontrado: creative_hook_suggestion_coldstart. Execute a migration SQL.');

  const scenesText = params.scenes
    .map((s, i) => `${i}. ${s.sceneDescription}${s.keyVisualElements.length ? ' — elementos visíveis: ' + s.keyVisualElements.join(', ') : ''}`)
    .join('\n');

  const missingHooksText = params.missingHooks.map(k => params.hookLabels[k] ?? k).join(', ');

  const prompt = applyVariables(template, {
    segment:       params.segment,
    missing_hooks: missingHooksText,
    scenes:        scenesText,
  });

  const parsed = await callTextLlmForJson(prompt, llmCfg);
  const suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];

  return suggestions.map((s: any) => {
    const idx = Number(s.scene_ref);
    const scene = Number.isInteger(idx) ? params.scenes[idx] : undefined;
    return {
      hookType: typeof s.hook_type === 'string' ? s.hook_type : 'other',
      sceneAssetId: scene?.assetId ?? null,
      hookText: typeof s.hook_text === 'string' ? s.hook_text : '',
      why: typeof s.why === 'string' ? s.why : '',
    };
  }).filter((s: VisualHookSuggestion) => s.hookText);
}
