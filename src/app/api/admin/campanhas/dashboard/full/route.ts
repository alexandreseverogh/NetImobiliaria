import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/marketing/prisma';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { resolveCampaignIdsBySegment } from '@/lib/marketing/segmentUtils';
import { getProvisionedNetworkCodes } from '@/lib/marketing/services/networkProvisioning';
import {
  getLeadEvents, sumLeads, leadsByDay,
  leadsByCampaign as groupLeadsByCampaign,
  leadsByNetwork as groupLeadsByNetwork,
} from '@/lib/marketing/services/leadEvents';

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
    let clientId          = searchParams.get('clientId');
    if (clientId === 'segment' || clientId === 'all') clientId = null;
    const segmentId       = searchParams.get('segmentId');
    const objectiveFilter = searchParams.get('objectiveFilter');
    const statusFilter    = searchParams.get('statusFilter');
    const adSetId         = searchParams.get('adSetId');
    const networkFilter   = searchParams.get('network'); // código da rede (meta/google/tiktok) — PARTE D1

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

    // FASE 1 (Google Ads) A7 — mapa campaignId → código da rede (meta/google/...), pra
    // classificar spend/leads por rede sem repetir o JOIN a cada agregação.
    const networkRows = await prisma.$queryRaw<{ id: string; code: string }[]>`
      SELECT id, code FROM public.ad_networks
    `;
    const networkCodeById = new Map(networkRows.map(r => [r.id, r.code]));
    const campaignNetworkCode = new Map(
      campaigns.map(c => [c.id, (c as any).networkId ? (networkCodeById.get((c as any).networkId) || 'meta') : 'meta']),
    );

    // PARTE D1 — redes disponíveis no escopo ATUAL (antes do filtro de rede em si), pra alimentar
    // o seletor "Todas / Meta / Google / TikTok" no topo do dashboard sem colapsar as opções
    // quando o usuário já tiver escolhido uma rede específica.
    const availableNetworks = Array.from(new Set(campaigns.map(c => campaignNetworkCode.get(c.id) || 'meta'))).sort();

    // Rede descontinuada: aparece no escopo atual (tem Insight real contribuindo pros cálculos
    // abaixo) mas não está mais contratada pelo tenant agora. Dado histórico continua contando
    // nos números (decisão deliberada — nunca escondido retroativamente), só avisa que uma
    // parte do que compõe esses cálculos vem de uma rede que não é mais parte do contrato.
    const provisionedNetworks = await getProvisionedNetworkCodes(payload.tenantId);
    const discontinuedNetworks = availableNetworks.filter(n => !provisionedNetworks.has(n));

    if (networkFilter) {
      campaigns = campaigns.filter(c => (campaignNetworkCode.get(c.id) || 'meta') === networkFilter);
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

    // Fonte única de "o que é lead" (ciente de rede e de mecanismo de CTA — WhatsApp, formulário
    // hospedado, Formulário Instantâneo do Meta, conversão real do Google) — ver leadEvents.ts.
    // Achado 2026-07-21: antes cada métrica desta rota tinha sua PRÓPRIA query só com
    // WHATSAPP_CLICK, causando o card de KPI "Leads" mostrar um número diferente do
    // comparativo cplByNetwork na MESMA resposta. Agora tudo deriva do mesmo array de eventos.
    const [currentInsights, prevInsights, currentLeadEvents, prevLeadEvents] = await Promise.all([
      prisma.insight.findMany({ where: insightWhere, orderBy: { date: 'desc' } }),
      prisma.insight.findMany({
        where: prevInsightWhere,
      }),
      getLeadEvents(payload.tenantId, { campaignIds, startDate, endDate }),
      getLeadEvents(payload.tenantId, { campaignIds, startDate: prevStart, endDate: prevEnd }),
    ]);
    const currentLeadCount = sumLeads(currentLeadEvents);
    const prevLeadCount = sumLeads(prevLeadEvents);

    const calcTotals = (insights: any[]) => {
      const spend = insights.reduce((s, i) => s + i.spend, 0);
      const clicks = insights.reduce((s, i) => s + i.clicks, 0);
      const impressions = insights.reduce((s, i) => s + i.impressions, 0);
      const reach = insights.reduce((s, i) => s + i.reach, 0);
      const conversions = insights.reduce((s, i) => s + i.conversions, 0);

      // FIX: Insight não tem coluna adNetwork (nunca existiu) — rede vem de
      // Campaign.networkId, resolvido via campaignNetworkCode acima.
      const spendByNetwork = insights.reduce((acc, i) => {
        const code = campaignNetworkCode.get(i.campaignId) || 'meta';
        acc[code] = (acc[code] || 0) + i.spend;
        return acc;
      }, {} as Record<string, number>);

      return {
        spend, clicks, impressions, reach, conversions,
        ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
        cpc: clicks > 0 ? spend / clicks : 0,
        cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
        spendByNetwork
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

    const normalizedDailyLeads = Array.from(leadsByDay(currentLeadEvents).entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const leadsByCampaign = Object.fromEntries(groupLeadsByCampaign(currentLeadEvents));

    const funnelData = {
      impressions: currentTotals.impressions,
      clicks: currentTotals.clicks,
      leads: currentLeadCount,
      conversions: currentTotals.conversions,
    };

    const leadsByNetwork = Object.fromEntries(groupLeadsByNetwork(currentLeadEvents));

    // Spend + CPL por rede — sustenta o comparativo "CPL Meta × Google" do dashboard.
    // Reaproveita currentTotals.spendByNetwork (já corrigido acima) — sem query extra.
    const cplByNetwork = Object.entries(currentTotals.spendByNetwork as Record<string, number>).reduce(
      (acc, [network, spend]) => {
        const leads = leadsByNetwork[network] || 0;
        acc[network] = { spend, leads, cpl: leads > 0 ? spend / leads : null };
        return acc;
      },
      {} as Record<string, { spend: number; leads: number; cpl: number | null }>,
    );

    return NextResponse.json({
      currentPeriod: { insights: currentInsights, totals: currentTotals, leadCount: currentLeadCount },
      previousPeriod: { totals: prevTotals, leadCount: prevLeadCount },
      deltas,
      campaigns,
      adSets: allAdSets,
      dailyLeads: normalizedDailyLeads,
      leadsByNetwork,
      leadsByCampaign,
      cplByNetwork,
      availableNetworks,
      discontinuedNetworks,
      funnelData,
    });
  } catch (error: any) {
    console.error('Erro no GET /dashboard/full:', error);
    return NextResponse.json({ error: error.message || 'Erro ao buscar dados do dashboard' }, { status: 500 });
  }
}
