import pool from '@/lib/database/connection';
import { resolveSegment } from '@/lib/intelligence/segmentResolver';
import { resolveBenchmarks } from '@/lib/intelligence/benchmarkResolver';
import { getLeadEvents, sumLeads } from './leadEvents';

export interface HookStat {
  hookType: string;
  label: string;
  count: number;
  share: number;       // 0-100
  avgCtr: number | null;
}

export interface HookSaturationResult {
  hookStats: HookStat[];
  totalCreatives: number;
  diversityIndex: number;    // 0-100 (Shannon), higher = more diverse
  dominantHook: string | null;
  dominantShare: number;     // 0-100
  saturationAlert: boolean;  // dominantShare >= 70
  suggestion: string | null;
}

export const HOOK_LABELS: Record<string, string> = {
  urgency:      'Urgência',
  curiosity:    'Curiosidade',
  social_proof: 'Prova Social',
  benefit:      'Benefício',
  story:        'História',
  problem:      'Problema',
  price:        'Preço',
  investment:   'Investimento',
  lifestyle:    'Lifestyle',
  family:       'Família',
  social:       'Social',
  luxury:       'Luxo',
  other:        'Outro',
};

// Enum real de hook_type (mesmo do prompt creative_vision_analysis) — "price"/"investment"/
// "lifestyle"/"family"/"social"/"luxury" são valores do campo ANGLE, nunca de hook_type; nunca
// devem entrar numa lista de "hooks pra experimentar" (bug real corrigido nesta sessão: a
// sugestão de diversificação usava Object.keys(HOOK_LABELS) inteiro, então podia sortear um
// desses valores de angle como se fosse um hook de verdade).
export const REAL_HOOK_TYPES = [
  'urgency', 'curiosity', 'social_proof', 'benefit', 'story', 'problem',
] as const;

// Subconjunto de REAL_HOOK_TYPES sustentável só com o que está visível na própria imagem, sem
// precisar de nenhum fato externo verificável (contagem de clientes, estoque restante, resultado
// de tratamento, etc.). Urgência ("últimas unidades") e Prova Social ("já são X famílias") SEMPRE
// exigem um dado real por trás — nunca aparecem aqui, mesmo como sugestão com lacuna, porque em
// cenários reais (ex.: lançamento na planta) esse dado literalmente não existe ainda.
export const SAFE_COLD_START_HOOKS = ['curiosity', 'benefit', 'story', 'problem'] as const;

function shannonDiversityIndex(counts: number[]): number {
  const total = counts.reduce((a, b) => a + b, 0);
  if (total === 0) return 100;
  const active = counts.filter(c => c > 0);
  if (active.length <= 1) return 0;
  let H = 0;
  for (const c of active) {
    const p = c / total;
    H -= p * Math.log2(p);
  }
  const maxH = Math.log2(active.length);
  return maxH === 0 ? 100 : Math.round((H / maxH) * 100);
}

function buildClientWhere(params: unknown[], clientId: string | null | undefined, column: string): string {
  if (!clientId || clientId === 'own') return `AND ${column} IS NULL`;
  if (clientId === 'all' || clientId === 'segment') return '';
  params.push(clientId);
  return `AND ${column} = $${params.length}::uuid`;
}

export async function getHookSaturation(
  tenantId: string,
  clientId?: string | null,
): Promise<HookSaturationResult> {
  const params: unknown[] = [tenantId];
  const clientWhere = buildClientWhere(params, clientId, 'ca.client_id');

  const { rows } = await pool.query(`
    SELECT
      COALESCE(an.hook_type, 'other') AS hook_type,
      COUNT(DISTINCT ca.id)::int AS creative_count,
      ROUND(AVG(
        CASE WHEN ins.impressions > 0
             THEN ins.clicks * 100.0 / ins.impressions ELSE NULL END
      )::numeric, 2) AS avg_ctr
    FROM campanhasmarketingdigital."CreativeAsset" ca
    JOIN campanhasmarketingdigital."CreativeAnalysis" an
      ON an.asset_id = ca.id
    LEFT JOIN campanhasmarketingdigital."Campaign" cam
      ON cam.id = ca.campaign_id
    LEFT JOIN (
      SELECT "campaignId",
             SUM(impressions)::int AS impressions,
             SUM(clicks)::int      AS clicks
      FROM campanhasmarketingdigital."Insight"
      WHERE tenant_id = $1::uuid
      GROUP BY "campaignId"
    ) ins ON ins."campaignId" = cam.id
    WHERE ca.tenant_id = $1::uuid
      AND an.hook_type IS NOT NULL
      ${clientWhere}
    GROUP BY COALESCE(an.hook_type, 'other')
    ORDER BY creative_count DESC
  `, params);

  if (rows.length === 0) {
    return {
      hookStats: [], totalCreatives: 0, diversityIndex: 100,
      dominantHook: null, dominantShare: 0, saturationAlert: false, suggestion: null,
    };
  }

  const total = rows.reduce((s: number, r: any) => s + r.creative_count, 0);

  const hookStats: HookStat[] = rows.map((r: any) => ({
    hookType: r.hook_type,
    label: HOOK_LABELS[r.hook_type] ?? r.hook_type,
    count: r.creative_count,
    share: Math.round((r.creative_count / total) * 100),
    avgCtr: r.avg_ctr != null ? Number(r.avg_ctr) : null,
  }));

  const diversityIndex = shannonDiversityIndex(rows.map((r: any) => r.creative_count));
  const dominant = hookStats[0];
  // alerta em ≥50%: amarelo (50-69%), vermelho (≥70%)
  const saturationAlert = dominant.share >= 50;

  // Só sorteia entre hooks REAIS (nunca um valor de angle) pra sugerir como alternativa.
  const missing = REAL_HOOK_TYPES
    .filter(k => k !== dominant.hookType && !hookStats.find(h => h.hookType === k));
  const suggestion = saturationAlert && missing.length > 0
    ? `Experimente hooks de ${missing.slice(0, 2).map(k => HOOK_LABELS[k]).join(' ou ')} para diversificar`
    : saturationAlert
    ? 'Varie os tipos de hook para reduzir a saturação'
    : null;

  return {
    hookStats, totalCreatives: total, diversityIndex,
    dominantHook: dominant.hookType, dominantShare: dominant.share,
    saturationAlert, suggestion,
  };
}

// ── Contexto pra sugestão concreta de hook (Caminho A "com histórico" vs Caminho B
// "sem histórico", decidido em conversa com o usuário) ─────────────────────────────

export interface HookHistoryMaturity {
  hookType: string;
  label: string;
  leads: number;
  daysRunning: number;
  avgCtr: number | null;
  avgCpl: number | null;
}

export interface HookSuggestionScene {
  assetId: string;
  sceneDescription: string;
  keyVisualElements: string[];
}

export interface HookSuggestionContext {
  hasHistory: boolean;
  /** Preenchido só quando hasHistory=true — o hook real com sinal maduro o bastante pra
   *  alimentar o gerador existente (generateCreativeConcepts, "Padrões Vencedores"). */
  historyHook: HookHistoryMaturity | null;
  /** Hooks seguros (SAFE_COLD_START_HOOKS) ainda ausentes do portfólio — candidatos ao
   *  Caminho B quando não há histórico maduro. */
  missingSafeHooks: string[];
  segmentName: string;
  /** Cenas reais (já extraídas pela Vision no upload) pra ancorar sugestões do Caminho B —
   *  nunca inventadas, sempre de criativos reais já analisados deste tenant/cliente. */
  scenes: HookSuggestionScene[];
}

const EPOCH_START = new Date('2000-01-01T00:00:00Z');

async function computeHookMaturity(
  tenantId: string,
  campaignIds: string[],
): Promise<{ leads: number; daysRunning: number; avgCpl: number | null }> {
  if (campaignIds.length === 0) return { leads: 0, daysRunning: 0, avgCpl: null };

  const [daysRows, spendRows, events] = await Promise.all([
    pool.query<{ days: string }>(
      `SELECT COUNT(DISTINCT date)::int AS days
       FROM campanhasmarketingdigital."Insight"
       WHERE tenant_id = $1::uuid AND "campaignId" = ANY($2::text[])`,
      [tenantId, campaignIds],
    ),
    pool.query<{ spend: string }>(
      `SELECT COALESCE(SUM(spend), 0)::numeric AS spend
       FROM campanhasmarketingdigital."Insight"
       WHERE tenant_id = $1::uuid AND "campaignId" = ANY($2::text[])`,
      [tenantId, campaignIds],
    ),
    getLeadEvents(tenantId, { campaignIds, startDate: EPOCH_START, endDate: new Date() }),
  ]);

  const leads = sumLeads(events);
  const daysRunning = Number(daysRows.rows[0]?.days ?? 0);
  const spend = Number(spendRows.rows[0]?.spend ?? 0);
  const avgCpl = leads > 0 ? spend / leads : null;

  return { leads, daysRunning, avgCpl };
}

export async function getHookSuggestionContext(
  tenantId: string,
  clientId?: string | null,
): Promise<HookSuggestionContext> {
  const [saturation, segment] = await Promise.all([
    getHookSaturation(tenantId, clientId),
    resolveSegment(tenantId, clientId),
  ]);

  const segmentName = segment?.name || 'Geral';
  const benchmarks = await resolveBenchmarks(
    ['min_leads_scale', 'min_days_running'],
    tenantId,
    segment?.id ?? null,
    clientId,
  );
  const minLeads = benchmarks.min_leads_scale || 5;
  const minDays  = benchmarks.min_days_running || 3;

  // Campanhas por hook real (nunca 'other') — pra checar maturidade de sinal.
  const params: unknown[] = [tenantId];
  const clientWhere = buildClientWhere(params, clientId, 'ca.client_id');
  const { rows: campaignRows } = await pool.query<{ hook_type: string; campaign_id: string | null }>(`
    SELECT an.hook_type, ca.campaign_id
    FROM campanhasmarketingdigital."CreativeAsset" ca
    JOIN campanhasmarketingdigital."CreativeAnalysis" an ON an.asset_id = ca.id
    WHERE ca.tenant_id = $1::uuid
      AND an.hook_type = ANY(ARRAY[${REAL_HOOK_TYPES.map(h => `'${h}'`).join(',')}])
      AND ca.campaign_id IS NOT NULL
      ${clientWhere}
  `, params);

  const campaignIdsByHook = new Map<string, Set<string>>();
  for (const r of campaignRows) {
    if (!r.campaign_id) continue;
    const set = campaignIdsByHook.get(r.hook_type) || new Set<string>();
    set.add(r.campaign_id);
    campaignIdsByHook.set(r.hook_type, set);
  }

  let historyHook: HookHistoryMaturity | null = null;
  for (const stat of saturation.hookStats) {
    if (stat.hookType === 'other') continue;
    const ids = Array.from(campaignIdsByHook.get(stat.hookType) || []);
    if (ids.length === 0) continue;
    const maturity = await computeHookMaturity(tenantId, ids);
    if (maturity.leads >= minLeads && maturity.daysRunning >= minDays) {
      if (!historyHook || maturity.leads > historyHook.leads) {
        historyHook = {
          hookType: stat.hookType,
          label: stat.label,
          leads: maturity.leads,
          daysRunning: maturity.daysRunning,
          avgCtr: stat.avgCtr,
          avgCpl: maturity.avgCpl,
        };
      }
    }
  }

  const missingSafeHooks = SAFE_COLD_START_HOOKS
    .filter(k => !saturation.hookStats.find(h => h.hookType === k));

  let scenes: HookSuggestionScene[] = [];
  if (!historyHook) {
    const sceneParams: unknown[] = [tenantId];
    const sceneClientWhere = buildClientWhere(sceneParams, clientId, 'ca.client_id');
    const { rows: sceneRows } = await pool.query<{
      asset_id: string; scene_description: string | null; key_visual_elements: string[] | null;
    }>(`
      SELECT ca.id AS asset_id, an.scene_description, an.key_visual_elements
      FROM campanhasmarketingdigital."CreativeAsset" ca
      JOIN campanhasmarketingdigital."CreativeAnalysis" an ON an.asset_id = ca.id
      WHERE ca.tenant_id = $1::uuid
        AND an.analysis_status = 'done'
        AND an.scene_description IS NOT NULL
        AND an.scene_description <> ''
        ${sceneClientWhere}
      ORDER BY an.analyzed_at DESC
      LIMIT 6
    `, sceneParams);
    scenes = sceneRows.map(r => ({
      assetId: r.asset_id,
      sceneDescription: r.scene_description || '',
      keyVisualElements: r.key_visual_elements || [],
    }));
  }

  return {
    hasHistory: historyHook !== null,
    historyHook,
    missingSafeHooks,
    segmentName,
    scenes,
  };
}
