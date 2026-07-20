import pool from '@/lib/database/connection';

/**
 * PARTE D1 (correção) — o filtro de rede do dashboard só tinha sido conectado em
 * /dashboard/full; os demais endpoints (insights/ai, dashboard/funnel, dashboard/predictions,
 * dashboard/anticipation) continuavam trazendo dado de TODAS as redes mesmo com um filtro
 * ativo — pior que incompleto, era enganoso (ex.: Actionable Alerts citando campanha Google
 * com o filtro em "Meta"). Este helper resolve o código de rede (meta/google/tiktok...) de um
 * conjunto de campanhas via `ad_networks`, com o mesmo fallback 'meta' já usado em
 * dashboard/full/route.ts para campanhas sem network_id (legado, anterior à FASE 1 Google Ads).
 */
export async function resolveCampaignNetworkCodes(
  campaignIds: { id: string; networkId?: string | null }[],
): Promise<Map<string, string>> {
  const { rows } = await pool.query<{ id: string; code: string }>('SELECT id, code FROM public.ad_networks');
  const codeById = new Map(rows.map(r => [r.id, r.code]));
  return new Map(campaignIds.map(c => [c.id, c.networkId ? (codeById.get(c.networkId) ?? 'meta') : 'meta']));
}

/** Filtra uma lista de campanhas por código de rede. `network` vazio/undefined = sem filtro (todas). */
export async function filterCampaignsByNetwork<T extends { id: string; networkId?: string | null }>(
  campaigns: T[],
  network: string | null | undefined,
): Promise<T[]> {
  if (!network) return campaigns;
  const codes = await resolveCampaignNetworkCodes(campaigns);
  return campaigns.filter(c => (codes.get(c.id) ?? 'meta') === network);
}
