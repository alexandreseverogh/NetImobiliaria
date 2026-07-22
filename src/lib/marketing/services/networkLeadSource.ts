/**
 * Como cada rede de anúncio define "lead" nesta plataforma — nem toda rede/CTA usa o mesmo
 * sinal de interesse.
 *
 * - `cta_engagement` (Meta) — o CTA do anúncio pode ser WhatsApp (redireciona pro wa.me,
 *   gera `CtaInteraction.event_type='WHATSAPP_CLICK'`) OU formulário (redireciona pra
 *   `/l/{slug}`, o preenchimento real gera `CtaSubmission` com `lead_uuid` preenchido). Os dois
 *   são mutuamente exclusivos por anúncio (`Ad.ctaType` só pode ser um), então somar os dois
 *   nunca conta o mesmo lead 2x. Achado 2026-07-21: só contava WHATSAPP_CLICK — campanha com
 *   CTA de formulário aparecia com leads:0 mesmo tendo submissões reais e atribuídas.
 * - `insight_conversions` (Google/YouTube) — a própria API da rede já retorna a conversão real
 *   (Insight.conversions), sem depender de clique de WhatsApp nem formulário desta plataforma.
 *
 * Terreno pronto pra novas redes (FASE 11 — LinkedIn/TikTok, mesmo padrão de
 * src/lib/marketing/networks/factory.ts): quando o adapter real dessas redes existir, só
 * adicionar 1 entrada aqui com o método correto de lead — nenhum consumidor
 * (cplTimelineService, dashboard/full, etc.) precisa mudar.
 */

export type LeadSourceMethod =
  | 'cta_engagement'       // CtaInteraction.WHATSAPP_CLICK + CtaSubmission com lead_uuid (Meta)
  | 'insight_conversions'; // Insight.conversions, já sincronizado da própria API da rede (Google/YouTube)

export const LEAD_SOURCE_BY_NETWORK: Record<string, LeadSourceMethod> = {
  meta: 'cta_engagement',
  // Cobre também YouTube — roda sob o mesmo adapter/credenciais do Google Ads (decisão
  // 2026-05-29, docs/claude-memory ou histórico de CHECKPOINT.md — "YouTube = canal sob
  // Google Ads, sem row separado em ad_networks").
  google: 'insight_conversions',
};

/** Rede sem entrada explícita (ainda não implementada, ex.: linkedin/tiktok hoje) cai aqui. */
export const DEFAULT_LEAD_SOURCE: LeadSourceMethod = 'cta_engagement';

export function leadSourceForNetwork(code: string): LeadSourceMethod {
  return LEAD_SOURCE_BY_NETWORK[code] ?? DEFAULT_LEAD_SOURCE;
}
