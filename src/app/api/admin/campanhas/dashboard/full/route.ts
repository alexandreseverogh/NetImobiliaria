import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/marketing/prisma';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { resolveCampaignIdsBySegment } from '@/lib/marketing/segmentUtils';

export const dynamic = 'force-dynamic';

function pctDelta(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

export async function GET(request: NextRequest) {
  try {
    const payload = getTokenPayload(request);
    if (!payload || !payload.tenantId) {
      return NextResponse.json({ error: 'Tenant não encontrado ou usuário não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startStr        = searchParams.get('startDate');
    const endStr          = searchParams.get('endDate');
    const campaignId      = searchParams.get('campaignId');
    const clientId        = searchParams.get('clientId');
    const segmentId       = searchParams.get('segmentId');
    const objectiveFilter = searchParams.get('objectiveFilter');
    const statusFilter    = searchParams.get('statusFilter');
    const adSetId         = searchParams.get('adSetId');

    // Se vier só YYYY-MM-DD (sem horário), expande para 23:59:59.999 UTC para cobrir o dia inteiro.
    const endDate = endStr
      ? (endStr.length === 10 ? new Date(endStr + 'T23:59:59.999Z') : new Date(endStr))
      : new Date();
    const startDate = startStr
      ? new Date(startStr)
      : new Date(endDate.getTime() - 30 * 86400000);

    const periodMs = endDate.getTime() - startDate.getTime();
    const prevEnd  = new Date(startDate.getTime());
    const prevStart = new Date(startDate.getTime() - periodMs);

    const campaignWhere: any = { tenantId: payload.tenantId };
    if (objectiveFilter) campaignWhere.objective = objectiveFilter;
    if (statusFilter)    campaignWhere.status    = statusFilter;
    if (clientId === 'own') {
      campaignWhere.clientId = null;
    } else if (clientId) {
      campaignWhere.clientId = clientId;
    }

    // Isolamento por segmento — nunca misturar segmentos distintos
    if (segmentId) {
      const segmentCampaignIds = await resolveCampaignIdsBySegment(
        payload.tenantId,
        segmentId,
        clientId ?? undefined,
      );
      campaignWhere.id = { in: segmentCampaignIds };
      // clientId já foi aplicado dentro de resolveCampaignIdsBySegment; remover do where Prisma
      // para evitar dupla filtragem (o IN já garante o isolamento)
      delete campaignWhere.clientId;
    }

    let campaigns = await prisma.campaign.findMany({
      where: campaignWhere,
      include: { adSets: { include: { ads: true } } },
      orderBy: { createdAt: 'desc' },
    });

    if (campaignId) {
      campaigns = campaigns.filter(c => c.id === campaignId);
    }

    const campaignIds = campaigns.map(c => c.id);

    const insightWhere: any = {
      tenantId: payload.tenantId,
      campaignId: { in: campaignIds },
      date: { gte: startDate, lte: endDate },
    };
    if (adSetId) insightWhere.adSetId = adSetId;

    const prevInsightWhere = {
      ...insightWhere,
      date: { gte: prevStart, lt: prevEnd }
    };

    const [currentInsights, prevInsights, currentLeadCount, prevLeadCount] = await Promise.all([
      prisma.insight.findMany({ where: insightWhere, orderBy: { date: 'desc' } }),
      prisma.insight.findMany({
        where: prevInsightWhere,
      }),
      prisma.lead.count({
        where: { tenantId: payload.tenantId, campaignId: { in: campaignIds }, clickedAt: { gte: startDate, lte: endDate } },
      }),
      prisma.lead.count({
        where: { tenantId: payload.tenantId, campaignId: { in: campaignIds }, clickedAt: { gte: prevStart, lt: prevEnd } },
      }),
    ]);

    const calcTotals = (insights: any[]) => {
      const spend = insights.reduce((s, i) => s + i.spend, 0);
      const clicks = insights.reduce((s, i) => s + i.clicks, 0);
      const impressions = insights.reduce((s, i) => s + i.impressions, 0);
      const reach = insights.reduce((s, i) => s + i.reach, 0);
      const conversions = insights.reduce((s, i) => s + i.conversions, 0);
      return {
        spend, clicks, impressions, reach, conversions,
        ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
        cpc: clicks > 0 ? spend / clicks : 0,
        cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
      };
    }

    const currentTotals = calcTotals(currentInsights);
    const prevTotals = calcTotals(prevInsights);

    const deltas = {
      spend: pctDelta(currentTotals.spend, prevTotals.spend),
      clicks: pctDelta(currentTotals.clicks, prevTotals.clicks),
      impressions: pctDelta(currentTotals.impressions, prevTotals.impressions),
      reach: pctDelta(currentTotals.reach, prevTotals.reach),
      conversions: pctDelta(currentTotals.conversions, prevTotals.conversions),
      ctr: pctDelta(currentTotals.ctr, prevTotals.ctr),
      cpc: pctDelta(currentTotals.cpc, prevTotals.cpc),
      cpm: pctDelta(currentTotals.cpm, prevTotals.cpm),
      leads: pctDelta(currentLeadCount, prevLeadCount),
    };

    const allAdSets = campaigns.flatMap(c => c.adSets.map((as_: any) => ({
      id: as_.id,
      name: as_.name,
      campaignId: c.id,
      campaignName: c.name,
    })));

    const campaignIdsQuery = campaignIds.length > 0 ? campaignIds : ['00000000-0000-0000-0000-000000000000'];

    const dailyLeadsRaw: any[] = await prisma.$queryRaw`
      SELECT DATE("clickedAt") as date, COUNT(*)::int as count
      FROM campanhasmarketingdigital."Lead"
      WHERE "tenant_id" = ${payload.tenantId}::uuid
        AND "campaignId" = ANY(${campaignIdsQuery})
        AND "clickedAt" >= ${startDate}::timestamp
        AND "clickedAt" <= ${endDate}::timestamp
      GROUP BY DATE("clickedAt")
      ORDER BY date ASC
    `;

    const normalizedDailyLeads = dailyLeadsRaw.map(r => ({
      date: r.date instanceof Date ? r.date.toISOString().split('T')[0] : r.date,
      count: Number(r.count)
    }));

    const funnelData = {
      impressions: currentTotals.impressions,
      clicks: currentTotals.clicks,
      leads: currentLeadCount,
      conversions: currentTotals.conversions,
    };

    return NextResponse.json({
      currentPeriod: { insights: currentInsights, totals: currentTotals, leadCount: currentLeadCount },
      previousPeriod: { totals: prevTotals, leadCount: prevLeadCount },
      deltas,
      campaigns,
      adSets: allAdSets,
      dailyLeads: normalizedDailyLeads,
      funnelData,
    });
  } catch (error: any) {
    console.error('Erro no GET /dashboard/full:', error);
    return NextResponse.json({ error: error.message || 'Erro ao buscar dados do dashboard' }, { status: 500 });
  }
}
