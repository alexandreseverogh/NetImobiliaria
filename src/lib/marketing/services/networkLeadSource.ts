/**
 * Como cada rede de anúncio define "lead" nesta plataforma — nem toda rede usa CTA de WhatsApp
 * como sinal de interesse (Meta usa; o Google Ads já retorna conversões reais da própria API,
 * sem precisar de clique de WhatsApp nenhum). Ver achado registrado em docs/CHECKPOINT.md
 * (sessão 2026-07-21): CPL por rede estava silenciosamente mostrando `leads: 0` pra campanhas
 * de Google reais só porque elas não geram CtaInteraction.WHATSAPP_CLICK.
 *
 * Terreno pronto pra novas redes (FASE 11 — LinkedIn/TikTok, mesmo padrão de
 * src/lib/marketing/networks/factory.ts): quando o adapter real dessas redes existir, só
 * adicionar 1 entrada aqui com o método correto de lead — nenhum consumidor
 * (cplTimelineService, dashboard/full, etc.) precisa mudar.
 */

export type LeadSourceMethod =
  | 'whatsapp_click'      // CtaInteraction.event_type = 'WHATSAPP_CLICK' (Meta)
  | 'insight_conversions'; // Insight.conversions, já sincronizado da própria API da rede (Google/YouTube)

export const LEAD_SOURCE_BY_NETWORK: Record<string, LeadSourceMethod> = {
  meta: 'whatsapp_click',
  // Cobre também YouTube — roda sob o mesmo adapter/credenciais do Google Ads (decisão
  // 2026-05-29, docs/claude-memory ou histórico de CHECKPOINT.md — "YouTube = canal sob
  // Google Ads, sem row separado em ad_networks").
  google: 'insight_conversions',
};

/** Rede sem entrada explícita (ainda não implementada, ex.: linkedin/tiktok hoje) cai aqui. */
export const DEFAULT_LEAD_SOURCE: LeadSourceMethod = 'whatsapp_click';

export function leadSourceForNetwork(code: string): LeadSourceMethod {
  return LEAD_SOURCE_BY_NETWORK[code] ?? DEFAULT_LEAD_SOURCE;
}
