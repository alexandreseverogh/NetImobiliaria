import { prisma } from '@/lib/marketing/prisma';
import { leadSourceForNetwork } from '@/lib/marketing/services/networkLeadSource';

/**
 * Fonte única de verdade pra "o que é um lead" no módulo de Campanhas — extraído de
 * cplTimelineService.ts depois de uma auditoria (sessão 2026-07-21) encontrar ~15 arquivos
 * diferentes reimplementando a MESMA contagem, cada um só com `CtaInteraction.WHATSAPP_CLICK`,
 * sem form leads nem conversões do Google. Isso causava: (a) inconsistência visível na mesma
 * tela (cplByNetwork mostrando um número, o card de KPI "Leads" mostrando outro); (b) decisões
 * de IA erradas (campanha de Google/formulário marcada como "0 leads" e recomendada pra pausar).
 *
 * TODO consumidor de "quantos leads teve essa campanha/período" deve usar `getLeadEvents` (ou
 * os helpers de agregação abaixo) em vez de escrever a própria query — nenhum lugar deveria
 * saber, por conta própria, que WhatsApp e Google contam lead de formas diferentes.
 */

export interface LeadEvent {
  date: string;       // YYYY-MM-DD
  campaignId: string;
  network: string;     // código resolvido (meta/google/...)
  count: number;
}

export interface GetLeadEventsOptions {
  campaignIds: string[];
  startDate: Date;
  endDate: Date;
}

export async function getLeadEvents(tenantId: string, opts: GetLeadEventsOptions): Promise<LeadEvent[]> {
  const { campaignIds, startDate, endDate } = opts;
  if (campaignIds.length === 0) return [];

  // Resolve a rede de cada campanha no escopo, pra decidir por campanha qual método de lead usar
  // (mesmo padrão de campaignNetworkCode em dashboard/full/route.ts).
  const [campaignsWithNetwork, networkRows] = await Promise.all([
    prisma.campaign.findMany({ where: { id: { in: campaignIds } }, select: { id: true, networkId: true } }),
    prisma.$queryRaw<{ id: string; code: string }[]>`SELECT id, code FROM public.ad_networks`,
  ]);
  const networkCodeById = new Map(networkRows.map(r => [r.id, r.code]));
  const networkByCampaignId = new Map<string, string>();
  const campaignsByLeadSource = new Map<string, string[]>(); // leadSource -> campaignIds
  for (const c of campaignsWithNetwork) {
    const networkCode = (c as any).networkId ? (networkCodeById.get((c as any).networkId) || 'meta') : 'meta';
    networkByCampaignId.set(c.id, networkCode);
    const method = leadSourceForNetwork(networkCode);
    const list = campaignsByLeadSource.get(method) || [];
    list.push(c.id);
    campaignsByLeadSource.set(method, list);
  }

  const events: LeadEvent[] = [];
  const toDateKey = (d: Date) => d.toISOString().split('T')[0];

  // cta_engagement (Meta): clique de WhatsApp + submissão de formulário (Formulário Instantâneo
  // do Meta incluso — vem marcado como CtaSubmission igual formulário hospedado aqui). Os dois
  // são mutuamente exclusivos por anúncio (Ad.ctaType só pode ser um), então somar nunca conta
  // o mesmo lead 2x — EXCETO submissões com cta_type='WHATSAPP_MESSAGE', que são o eco de uma
  // resposta de WhatsApp já contada como WHATSAPP_CLICK (inboundProcessor.ts grava as duas).
  const ctaEngagementCampaignIds = campaignsByLeadSource.get('cta_engagement') || [];
  if (ctaEngagementCampaignIds.length > 0) {
    const [whatsappClicksRaw, formSubmissionsRaw] = await Promise.all([
      prisma.$queryRaw<{ date: Date; campaign_id: string; count: bigint }[]>`
        SELECT DATE(created_at) as date, campaign_id, COUNT(*)::int as count
        FROM campanhasmarketingdigital."CtaInteraction"
        WHERE tenant_id = ${tenantId}::uuid
          AND campaign_id = ANY(${ctaEngagementCampaignIds})
          AND event_type = 'WHATSAPP_CLICK'
          AND created_at >= ${startDate}::timestamp
          AND created_at <= ${endDate}::timestamp
        GROUP BY DATE(created_at), campaign_id
      `,
      prisma.$queryRaw<{ date: Date; campaign_id: string; count: bigint }[]>`
        SELECT DATE(created_at) as date, campaign_id, COUNT(*)::int as count
        FROM campanhasmarketingdigital."CtaSubmission"
        WHERE tenant_id = ${tenantId}::uuid
          AND campaign_id = ANY(${ctaEngagementCampaignIds})
          AND lead_uuid IS NOT NULL
          AND cta_type != 'WHATSAPP_MESSAGE'
          AND created_at >= ${startDate}::timestamp
          AND created_at <= ${endDate}::timestamp
        GROUP BY DATE(created_at), campaign_id
      `,
    ]);
    for (const row of whatsappClicksRaw) {
      events.push({ date: toDateKey(new Date(row.date)), campaignId: row.campaign_id, network: networkByCampaignId.get(row.campaign_id) || 'meta', count: Number(row.count) });
    }
    for (const row of formSubmissionsRaw) {
      events.push({ date: toDateKey(new Date(row.date)), campaignId: row.campaign_id, network: networkByCampaignId.get(row.campaign_id) || 'meta', count: Number(row.count) });
    }
  }

  // insight_conversions (Google/YouTube): conversão real já sincronizada da própria API da rede.
  const conversionsCampaignIds = campaignsByLeadSource.get('insight_conversions') || [];
  if (conversionsCampaignIds.length > 0) {
    const conversionsByDay = await prisma.insight.groupBy({
      by: ['date', 'campaignId'],
      where: { campaignId: { in: conversionsCampaignIds }, date: { gte: startDate, lte: endDate } },
      _sum: { conversions: true },
    });
    for (const row of conversionsByDay) {
      const count = row._sum.conversions ?? 0;
      if (count === 0) continue;
      events.push({ date: toDateKey(row.date), campaignId: row.campaignId, network: networkByCampaignId.get(row.campaignId) || 'google', count });
    }
  }

  return events;
}

export function sumLeads(events: LeadEvent[]): number {
  return events.reduce((s, e) => s + e.count, 0);
}

export function leadsByDay(events: LeadEvent[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const e of events) map.set(e.date, (map.get(e.date) ?? 0) + e.count);
  return map;
}

export function leadsByCampaign(events: LeadEvent[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const e of events) map.set(e.campaignId, (map.get(e.campaignId) ?? 0) + e.count);
  return map;
}

export function leadsByNetwork(events: LeadEvent[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const e of events) map.set(e.network, (map.get(e.network) ?? 0) + e.count);
  return map;
}
