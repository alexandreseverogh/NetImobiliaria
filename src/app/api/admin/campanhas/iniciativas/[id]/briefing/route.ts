import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/marketing/prisma';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { invokeForContext } from '@/lib/intelligence/llmInvoker';
import { resolveBenchmark } from '@/lib/intelligence/benchmarkResolver';
import { resolveSegment } from '@/lib/intelligence/segmentResolver';
import { requireApiPermission } from '@/lib/auth/apiPermissions';

export const dynamic = 'force-dynamic';

type Params = { params: { id: string } };

// POST /api/admin/campanhas/iniciativas/[id]/briefing
export async function POST(request: NextRequest, { params }: Params) {
  try {
    // Verificar permissão de criação server-side
    const denied = await requireApiPermission(request, 'campanhasmarketingdigital', 'CREATE');
    if (denied) return denied;

    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const initiative = await prisma.marketingInitiative.findFirst({
      where: { id: params.id, tenantId: payload.tenantId },
      include: {
        campaigns: {
          select: { id: true, name: true, status: true, objective: true },
        },
      },
    });

    if (!initiative) {
      return NextResponse.json({ error: 'Iniciativa não encontrada' }, { status: 404 });
    }

    const campaignIds = initiative.campaigns.map(c => c.id);
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [insightAgg, leadsCount] = await Promise.all([
      campaignIds.length > 0
        ? prisma.insight.aggregate({
            where: { campaignId: { in: campaignIds }, date: { gte: since } },
            _sum: { impressions: true, clicks: true, spend: true, conversions: true, reach: true },
            _avg: { ctr: true, cpc: true },
          })
        : null,
      campaignIds.length > 0
        ? prisma.lead.count({ where: { campaignId: { in: campaignIds } } })
        : 0,
    ]);

    const totalSpend = insightAgg?._sum.spend ?? 0;
    const totalLeads = leadsCount;
    const avgCpl     = totalLeads > 0 ? totalSpend / totalLeads : 0;
    const avgCtr     = insightAgg?._avg.ctr ?? 0;

    // Resolve segment for benchmarks
    const segment = await resolveSegment(payload.tenantId, initiative.clientId ?? null);
    const segmentId = segment?.id ?? null;
    const [benchmarkCpl, benchmarkCtr] = await Promise.all([
      resolveBenchmark('cpl_ideal', payload.tenantId, segmentId, initiative.clientId),
      resolveBenchmark('ctr_min',   payload.tenantId, segmentId, initiative.clientId),
    ]);

    const campaignsSummary = initiative.campaigns.length === 0
      ? 'Nenhuma campanha vinculada.'
      : initiative.campaigns.map(c => `- ${c.name} (${c.status}): ${c.objective}`).join('\n');

    const variables: Record<string, string> = {
      initiative_name:      initiative.name,
      goal_description:     initiative.goalDescription || 'Não definido',
      start_date:           initiative.startDate?.toISOString().slice(0, 10) || 'Não definido',
      end_date:             initiative.endDate?.toISOString().slice(0, 10)   || 'Não definido',
      total_budget_planned: initiative.totalBudgetPlanned?.toString() || '0',
      total_spent:          totalSpend.toFixed(2),
      primary_kpi:          initiative.primaryKpi || 'Leads',
      primary_kpi_target:   initiative.primaryKpiTarget?.toString() || 'Não definido',
      campaign_count:       String(initiative.campaigns.length),
      campaigns_summary:    campaignsSummary,
      total_impressions:    String(insightAgg?._sum.impressions ?? 0),
      total_clicks:         String(insightAgg?._sum.clicks      ?? 0),
      total_leads:          String(totalLeads),
      avg_ctr:              avgCtr.toFixed(2),
      avg_cpl:              avgCpl.toFixed(2),
      avg_cpc:              (insightAgg?._avg.cpc ?? 0).toFixed(2),
      total_spend:          totalSpend.toFixed(2),
      benchmark_cpl:        benchmarkCpl.toFixed(2),
      benchmark_ctr:        benchmarkCtr.toFixed(2),
    };

    const content = await invokeForContext({
      templateKey: 'initiative_consolidated_briefing',
      tenantId:    payload.tenantId,
      clientId:    initiative.clientId,
      variables,
      maxTokens:   2500,
    });

    return NextResponse.json({ content, generatedAt: new Date().toISOString() });
  } catch (error: any) {
    console.error('POST /iniciativas/[id]/briefing error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao gerar briefing' }, { status: 500 });
  }
}
