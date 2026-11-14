import { prisma } from '@/lib/marketing/prisma';
import { leadSourceForNetwork } from '@/lib/marketing/services/networkLeadSource';

/**
 * Fonte única de verdade pra "o que é um lead" no módulo de Campanhas — extraído de
 * cplTimelineService.ts depois de uma auditoria (sessão 2026-07-21) encontrar ~15 arquivos
 * diferentes reimplementando a MESMA contagem.
 *
 * Regra de contagem (aprovada 2026-11-13):
 *  - Um lead de CTA (WhatsApp ou formulário) conta quando a pessoa REALMENTE responde/envia,
 *    não no clique. O clique (CtaInteraction WHATSAPP_CLICK) continua logado pra analytics de
 *    cliques, mas não entra no CPL: no clique não se sabe quem é a pessoa.
 *  - Deduplicação por pessoa + campanha: a mesma pessoa conta UMA vez por campanha a cada
 *    LEAD_DEDUPE_WINDOW_DAYS. A janela é medida a partir do último evento CONTADO (um lead
 *    contado abre uma janela nova de 30 dias).
 *  - Identidade = lead_uuid do CRM (que já deduplica por telefone/e-mail).
 *  - Google/YouTube usam a conversão real vinda da própria API da rede (sem dedupe local).
 *
 * TODO consumidor de "quantos leads teve essa campanha/período" deve usar `getLeadEvents` (ou
 * os helpers de agregação abaixo) em vez de escrever a própria query.
 */

/** Janela de deduplicação por pessoa + campanha, em dias. Aprovada em 30 dias. */
export const LEAD_DEDUPE_WINDOW_DAYS = 30;
const DAY_MS = 86_400_000;

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

  // cta_engagement (Meta): lead = pessoa que respondeu no WhatsApp OU enviou formulário.
  // Ambos vêm de CtaSubmission com lead_uuid preenchido. Respostas de WhatsApp gravam
  // cta_type='WHATSAPP_MESSAGE' e formulários gravam o tipo do formulário — os dois contam, com
  // a mesma deduplicação por pessoa + campanha. Não há mais contagem por clique.
  const ctaEngagementCampaignIds = campaignsByLeadSource.get('cta_engagement') || [];
  if (ctaEngagementCampaignIds.length > 0) {
    // Busca também a janela anterior ao período, pra saber se uma pessoa já foi contada
    // nos últimos LEAD_DEDUPE_WINDOW_DAYS antes do início do período.
    const lookbackStart = new Date(startDate.getTime() - LEAD_DEDUPE_WINDOW_DAYS * DAY_MS);
    const submissions = await prisma.$queryRaw<{ created_at: Date; campaign_id: string; lead_uuid: string }[]>`
      SELECT created_at, campaign_id, lead_uuid
      FROM campanhasmarketingdigital."CtaSubmission"
      WHERE tenant_id = ${tenantId}::uuid
        AND campaign_id = ANY(${ctaEngagementCampaignIds})
        AND lead_uuid IS NOT NULL
        AND created_at >= ${lookbackStart}::timestamp
        AND created_at <= ${endDate}::timestamp
      ORDER BY created_at ASC
    `;

    // Deduplicação: um evento é contado só se a mesma (pessoa, campanha) não foi contada nos
    // LEAD_DEDUPE_WINDOW_DAYS anteriores. Eventos da janela anterior alimentam o controle, mas
    // não são emitidos.
    const windowMs = LEAD_DEDUPE_WINDOW_DAYS * DAY_MS;
    const lastCountedAt = new Map<string, number>(); // "lead|campanha" -> ms do último contado
    const aggregated = new Map<string, LeadEvent>(); // "data|campanha" -> evento
    const periodStartMs = startDate.getTime();
    for (const row of submissions) {
      const t = new Date(row.created_at).getTime();
      const key = `${row.lead_uuid}|${row.campaign_id}`;
      const prev = lastCountedAt.get(key);
      if (prev !== undefined && t - prev < windowMs) continue; // mesma pessoa, ainda dentro da janela
      lastCountedAt.set(key, t);
      if (t < periodStartMs) continue; // contado antes do período: só alimenta o controle
      const date = toDateKey(new Date(row.created_at));
      const aggKey = `${date}|${row.campaign_id}`;
      const existing = aggregated.get(aggKey);
      if (existing) existing.count += 1;
      else aggregated.set(aggKey, {
        date,
        campaignId: row.campaign_id,
        network: networkByCampaignId.get(row.campaign_id) || 'meta',
        count: 1,
      });
    }
    events.push(...aggregated.values());
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
