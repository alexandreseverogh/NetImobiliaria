import pool from '@/lib/database/connection';

export interface HookStat {
  hookType: string;
  label: string;
  count: number;
  share: number;       // 0-100
  avgCpl: number | null;
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
  other:        'Outro',
};

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

export async function getHookSaturation(
  tenantId: string,
  clientId?: string | null,
): Promise<HookSaturationResult> {
  const params: unknown[] = [tenantId];
  let clientWhere = '';

  if (!clientId || clientId === 'own') {
    clientWhere = 'AND cam.client_id IS NULL';
  } else if (clientId !== 'all' && clientId !== 'segment') {
    params.push(clientId);
    clientWhere = `AND cam.client_id = $${params.length}::uuid`;
  }

  const { rows } = await pool.query(`
    SELECT
      COALESCE(ca.hook_type, 'other') AS hook_type,
      COUNT(DISTINCT ca.id)::int AS creative_count,
      ROUND(AVG(
        CASE WHEN agg.leads > 0 AND agg.spend > 0
             THEN agg.spend / agg.leads ELSE NULL END
      )::numeric, 2) AS avg_cpl,
      ROUND(AVG(
        CASE WHEN agg.impressions > 0
             THEN agg.clicks * 100.0 / agg.impressions ELSE NULL END
      )::numeric, 2) AS avg_ctr
    FROM campanhasmarketingdigital."CreativeAsset" ca
    JOIN campanhasmarketingdigital."Campaign" cam
      ON cam.id = ca.campaign_id
    LEFT JOIN (
      SELECT "campaignId",
             SUM(spend)::float       AS spend,
             SUM(leads)::int         AS leads,
             SUM(impressions)::int   AS impressions,
             SUM(clicks)::int        AS clicks
      FROM campanhasmarketingdigital."Insight"
      WHERE tenant_id = $1::uuid
      GROUP BY "campaignId"
    ) agg ON agg."campaignId" = cam.id
    WHERE cam.tenant_id = $1::uuid
      AND cam.status IN ('ACTIVE', 'PAUSED')
      ${clientWhere}
    GROUP BY COALESCE(ca.hook_type, 'other')
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
    avgCpl: r.avg_cpl != null ? Number(r.avg_cpl) : null,
    avgCtr: r.avg_ctr != null ? Number(r.avg_ctr) : null,
  }));

  const diversityIndex = shannonDiversityIndex(rows.map((r: any) => r.creative_count));
  const dominant = hookStats[0];
  const saturationAlert = dominant.share >= 70;

  const missing = Object.keys(HOOK_LABELS)
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
