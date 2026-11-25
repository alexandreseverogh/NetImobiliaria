import type { InsightData } from '@/lib/marketing-api';

/**
 * Métricas agregadas de um conjunto de campanhas.
 *
 * Soma os brutos (gasto, impressões, cliques, alcance, conversões, leads, views de 3s) e
 * RECALCULA as taxas a partir dos totais — nunca soma nem tira média das taxas da Meta,
 * porque taxa não é aditiva (média de CTR ≠ CTR do conjunto).
 */
export interface AggregatedMetrics {
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  conversions: number;
  leads: number;
  videoViews3s: number;
  ctr: number;        // cliques ÷ impressões × 100
  cpc: number;        // gasto ÷ cliques
  cpm: number;        // gasto ÷ impressões × 1000
  cpl: number | null; // gasto ÷ leads (null sem lead)
  hookRate: number | null; // views 3s ÷ impressões × 100 (null sem vídeo)
}

/** Série diária (gasto e conversões) de UMA campanha, a partir dos brutos por dia do período. */
export function campaignDailySeries(
  insights: InsightData[],
  campaignId: string,
): { date: string; spend: number; conversions: number }[] {
  const byDate = new Map<string, { date: string; spend: number; conversions: number }>();
  for (const ins of insights) {
    if (ins.campaignId !== campaignId) continue;
    const date = String(ins.date).slice(0, 10);
    const row = byDate.get(date) ?? { date, spend: 0, conversions: 0 };
    row.spend += ins.spend || 0;
    row.conversions += ins.conversions || 0;
    byDate.set(date, row);
  }
  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * CPL diário de UMA campanha: gasto do dia ÷ leads do dia (leads vêm do mesmo evento de lead
 * que alimenta o consolidado). Dias sem lead ficam com cpl null, nunca zero.
 */
export function campaignCplSeries(
  insights: InsightData[],
  dailyLeads: { date: string; count: number }[],
  campaignId: string,
): { date: string; spend: number; leads: number; cpl: number | null }[] {
  const leadsByDate = new Map(dailyLeads.map(d => [String(d.date).slice(0, 10), d.count]));
  return campaignDailySeries(insights, campaignId).map(d => {
    const leads = leadsByDate.get(d.date) ?? 0;
    return { date: d.date, spend: d.spend, leads, cpl: leads > 0 ? d.spend / leads : null };
  });
}

export function aggregateMetrics(
  insights: InsightData[],
  leadsByCampaign: Record<string, number>,
  campaignIds?: Set<string>,
  videoHookByCampaign?: Record<string, { views3s: number; impressions: number }>,
): AggregatedMetrics {
  let spend = 0, impressions = 0, reach = 0, clicks = 0, conversions = 0;
  // Hook Rate: só anúncios de vídeo (fonte por anúncio). Sem esse mapa, cai na soma da campanha.
  let videoViews3s = 0, videoImpressions = 0;

  for (const ins of insights) {
    if (campaignIds && !campaignIds.has(ins.campaignId)) continue;
    spend += ins.spend || 0;
    impressions += ins.impressions || 0;
    reach += ins.reach || 0;
    clicks += ins.clicks || 0;
    conversions += ins.conversions || 0;
  }

  if (videoHookByCampaign) {
    for (const [cid, v] of Object.entries(videoHookByCampaign)) {
      if (campaignIds && !campaignIds.has(cid)) continue;
      videoViews3s += v.views3s || 0;
      videoImpressions += v.impressions || 0;
    }
  }

  // Leads vêm por campanha (leadsByCampaign). Somamos só as campanhas do conjunto.
  let leads = 0;
  for (const [cid, n] of Object.entries(leadsByCampaign)) {
    if (campaignIds && !campaignIds.has(cid)) continue;
    leads += n || 0;
  }

  return {
    spend,
    impressions,
    reach,
    clicks,
    conversions,
    leads,
    videoViews3s,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    cpc: clicks > 0 ? spend / clicks : 0,
    cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
    cpl: leads > 0 ? spend / leads : null,
    hookRate: videoViews3s > 0 && videoImpressions > 0 ? (videoViews3s / videoImpressions) * 100 : null,
  };
}
