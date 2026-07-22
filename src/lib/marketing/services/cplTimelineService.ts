import { prisma } from '@/lib/marketing/prisma';
import { resolveCampaignIdsBySegment } from '@/lib/marketing/segmentUtils';
import { leadSourceForNetwork } from '@/lib/marketing/services/networkLeadSource';

export interface CplTimelinePoint {
  date: string;   // YYYY-MM-DD
  spend: number;
  leads: number;
  cpl: number;    // 0 quando leads=0 (nunca divide por zero)
}

export interface CplTimelineResult {
  data: CplTimelinePoint[];
  totals: { spend: number; leads: number; cpl: number };
}

export interface CplTimelineOptions {
  startDate: Date;
  endDate: Date;
  clientId?: string | null;   // 'own' | uuid | undefined (undefined = todo o tenant)
  segmentId?: string | null;
  campaignId?: string | null;
}

/**
 * Agregação reutilizável de CPL por dia — extrai a lógica que antes só existia (a) derivada no
 * cliente em dashboard/page.tsx, zipando spend/leads já vindos de /dashboard/full, ou (b) embutida
 * dentro de /dashboard/segment (CPL por dia por cliente). Nenhum dos dois expunha um endpoint
 * genérico reutilizável — este serviço vira a fonte única pra qualquer consumidor futuro
 * (relatórios, alertas, exports), sem repetir a query em cada lugar novo.
 *
 * Diferença importante em relação à derivação antiga do dashboard: `Insight` tem uma linha por
 * CAMPANHA por dia, não uma por dia — somar corretamente por dia (GROUP BY date) é o que evita
 * contar o mesmo total de leads do dia várias vezes (uma por campanha ativa naquele dia).
 *
 * Ciente de rede (achado 2026-07-21): "lead" não significa a mesma coisa em toda rede — Meta usa
 * engajamento de CTA (clique de WhatsApp OU submissão de formulário, os dois mutuamente
 * exclusivos por anúncio), Google já retorna conversão real da própria API (Insight.conversions).
 * Contar só clique de WhatsApp fazia campanha de Google real E campanha de Meta com CTA de
 * formulário aparecerem com leads:0. Ver src/lib/marketing/services/networkLeadSource.ts pro
 * registro de qual método cada rede usa — terreno pronto pra novas redes sem mexer aqui.
 */
export async function getCplTimeline(
  tenantId: string,
  opts: CplTimelineOptions,
): Promise<CplTimelineResult> {
  const { startDate, endDate, clientId, segmentId, campaignId } = opts;

  let campaignIds: string[] | null = null;

  if (segmentId) {
    // Isolamento por segmento — nunca misturar segmentos distintos (mesma regra de /dashboard/full)
    campaignIds = await resolveCampaignIdsBySegment(tenantId, segmentId, clientId ?? undefined);
  } else {
    const campaignWhere: any = { tenantId };
    if (clientId === 'own') campaignWhere.clientId = null;
    else if (clientId) campaignWhere.clientId = clientId;
    const campaigns = await prisma.campaign.findMany({ where: campaignWhere, select: { id: true } });
    campaignIds = campaigns.map(c => c.id);
  }

  if (campaignId) campaignIds = campaignIds.filter(id => id === campaignId);

  if (campaignIds.length === 0) {
    return { data: [], totals: { spend: 0, leads: 0, cpl: 0 } };
  }

  const spendByDay = await prisma.insight.groupBy({
    by: ['date'],
    where: { campaignId: { in: campaignIds }, date: { gte: startDate, lte: endDate } },
    _sum: { spend: true },
    orderBy: { date: 'asc' },
  });

  // Resolve a rede de cada campanha no escopo (mesmo padrão de campaignNetworkCode em
  // dashboard/full/route.ts) pra decidir, por campanha, qual método de lead usar.
  const [campaignsWithNetwork, networkRows] = await Promise.all([
    prisma.campaign.findMany({ where: { id: { in: campaignIds } }, select: { id: true, networkId: true } }),
    prisma.$queryRaw<{ id: string; code: string }[]>`SELECT id, code FROM public.ad_networks`,
  ]);
  const networkCodeById = new Map(networkRows.map(r => [r.id, r.code]));
  const campaignsByLeadSource = new Map<string, string[]>(); // leadSource -> campaignIds
  for (const c of campaignsWithNetwork) {
    const networkCode = (c as any).networkId ? (networkCodeById.get((c as any).networkId) || 'meta') : 'meta';
    const method = leadSourceForNetwork(networkCode);
    const list = campaignsByLeadSource.get(method) || [];
    list.push(c.id);
    campaignsByLeadSource.set(method, list);
  }

  const leadsMap = new Map<string, number>();
  const addLeads = (date: Date, count: number) => {
    const key = toDateKey(date);
    leadsMap.set(key, (leadsMap.get(key) ?? 0) + count);
  };

  // CTA de WhatsApp e CTA de formulário são mutuamente exclusivos por anúncio (Ad.ctaType só
  // pode ser um), então somar clique de WhatsApp + submissão de formulário aqui nunca conta o
  // mesmo lead 2x — ver networkLeadSource.ts.
  const ctaEngagementCampaignIds = campaignsByLeadSource.get('cta_engagement') || [];
  if (ctaEngagementCampaignIds.length > 0) {
    const [whatsappClicksRaw, formSubmissionsRaw] = await Promise.all([
      prisma.$queryRaw<{ date: Date; count: bigint }[]>`
        SELECT DATE(created_at) as date, COUNT(*)::int as count
        FROM campanhasmarketingdigital."CtaInteraction"
        WHERE tenant_id = ${tenantId}::uuid
          AND campaign_id = ANY(${ctaEngagementCampaignIds})
          AND event_type = 'WHATSAPP_CLICK'
          AND created_at >= ${startDate}::timestamp
          AND created_at <= ${endDate}::timestamp
        GROUP BY DATE(created_at)
      `,
      // cta_type != 'WHATSAPP_MESSAGE' — uma resposta real de WhatsApp também grava uma
      // CtaSubmission (via inboundProcessor.ts), então incluir CTA de WhatsApp aqui contaria o
      // mesmo lead 2x (1x como WHATSAPP_CLICK acima, 1x como submissão). Só formulário conta.
      prisma.$queryRaw<{ date: Date; count: bigint }[]>`
        SELECT DATE(created_at) as date, COUNT(*)::int as count
        FROM campanhasmarketingdigital."CtaSubmission"
        WHERE tenant_id = ${tenantId}::uuid
          AND campaign_id = ANY(${ctaEngagementCampaignIds})
          AND lead_uuid IS NOT NULL
          AND cta_type != 'WHATSAPP_MESSAGE'
          AND created_at >= ${startDate}::timestamp
          AND created_at <= ${endDate}::timestamp
        GROUP BY DATE(created_at)
      `,
    ]);
    for (const row of whatsappClicksRaw) addLeads(new Date(row.date), Number(row.count));
    for (const row of formSubmissionsRaw) addLeads(new Date(row.date), Number(row.count));
  }

  const conversionsCampaignIds = campaignsByLeadSource.get('insight_conversions') || [];
  if (conversionsCampaignIds.length > 0) {
    const conversionsByDay = await prisma.insight.groupBy({
      by: ['date'],
      where: { campaignId: { in: conversionsCampaignIds }, date: { gte: startDate, lte: endDate } },
      _sum: { conversions: true },
    });
    for (const row of conversionsByDay) addLeads(row.date, row._sum.conversions ?? 0);
  }

  function toDateKey(d: Date) { return d.toISOString().split('T')[0]; }

  const spendMap = new Map<string, number>();
  for (const row of spendByDay) spendMap.set(toDateKey(row.date), row._sum.spend ?? 0);

  const allDates = new Set<string>([...Array.from(spendMap.keys()), ...Array.from(leadsMap.keys())]);
  const data: CplTimelinePoint[] = Array.from(allDates).sort().map(date => {
    const spend = spendMap.get(date) ?? 0;
    const leads = leadsMap.get(date) ?? 0;
    return { date, spend, leads, cpl: leads > 0 ? spend / leads : 0 };
  });

  const totalSpend = data.reduce((s, p) => s + p.spend, 0);
  const totalLeads = data.reduce((s, p) => s + p.leads, 0);

  return {
    data,
    totals: { spend: totalSpend, leads: totalLeads, cpl: totalLeads > 0 ? totalSpend / totalLeads : 0 },
  };
}
