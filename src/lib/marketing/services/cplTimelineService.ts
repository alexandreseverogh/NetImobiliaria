import { prisma } from '@/lib/marketing/prisma';
import { resolveCampaignIdsBySegment } from '@/lib/marketing/segmentUtils';

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

  const leadsByDayRaw: { date: Date; count: bigint }[] = await prisma.$queryRaw`
    SELECT DATE(created_at) as date, COUNT(*)::int as count
    FROM campanhasmarketingdigital."CtaInteraction"
    WHERE tenant_id = ${tenantId}::uuid
      AND campaign_id = ANY(${campaignIds})
      AND event_type = 'WHATSAPP_CLICK'
      AND created_at >= ${startDate}::timestamp
      AND created_at <= ${endDate}::timestamp
    GROUP BY DATE(created_at)
  `;

  const toDateKey = (d: Date) => d.toISOString().split('T')[0];

  const spendMap = new Map<string, number>();
  for (const row of spendByDay) spendMap.set(toDateKey(row.date), row._sum.spend ?? 0);

  const leadsMap = new Map<string, number>();
  for (const row of leadsByDayRaw) leadsMap.set(toDateKey(new Date(row.date)), Number(row.count));

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
