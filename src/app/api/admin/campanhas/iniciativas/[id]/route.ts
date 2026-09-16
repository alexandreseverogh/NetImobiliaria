import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/marketing/prisma';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { requireApiPermission } from '@/lib/auth/apiPermissions';
import { getLeadEvents, sumLeads } from '@/lib/marketing/services/leadEvents';

export const dynamic = 'force-dynamic';

type Params = { params: { id: string } };

// GET /api/admin/campanhas/iniciativas/[id]
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const initiative = await prisma.marketingInitiative.findFirst({
      where: { id: params.id, tenantId: payload.tenantId },
      include: {
        campaigns: {
          select: {
            id: true, name: true, status: true, objective: true,
            metaCampaignId: true, createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!initiative) {
      return NextResponse.json({ error: 'Iniciativa não encontrada' }, { status: 404 });
    }

    // Aggregate insights for all linked campaigns
    const campaignIds = initiative.campaigns.map(c => c.id);
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const insightAgg = campaignIds.length > 0
      ? await prisma.insight.aggregate({
          where: { campaignId: { in: campaignIds }, date: { gte: since } },
          _sum: { impressions: true, clicks: true, spend: true, conversions: true, reach: true },
          _avg: { ctr: true, cpc: true, cpm: true },
        })
      : null;

    // Fonte única de lead (WhatsApp + formulário + conversão real do Google) — antes só
    // WHATSAPP_CLICK, zerando leads de iniciativas com campanha de Google real vinculada.
    // Sem filtro de data (mesmo comportamento de sempre — all-time, diferente do since=30d
    // usado só pra métricas de Insight acima).
    const leadsCount = campaignIds.length > 0
      ? sumLeads(await getLeadEvents(payload.tenantId, { campaignIds, startDate: new Date(0), endDate: new Date() }))
      : 0;

    return NextResponse.json({
      ...initiative,
      metrics: {
        totalImpressions: insightAgg?._sum.impressions ?? 0,
        totalClicks:      insightAgg?._sum.clicks      ?? 0,
        totalSpend:       insightAgg?._sum.spend        ?? 0,
        totalConversions: insightAgg?._sum.conversions  ?? 0,
        totalReach:       insightAgg?._sum.reach        ?? 0,
        avgCtr:           insightAgg?._avg.ctr          ?? 0,
        avgCpc:           insightAgg?._avg.cpc          ?? 0,
        avgCpm:           insightAgg?._avg.cpm          ?? 0,
        totalLeads:       leadsCount,
      },
    });
  } catch (error: any) {
    console.error('GET /iniciativas/[id] error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao buscar iniciativa' }, { status: 500 });
  }
}

// PATCH /api/admin/campanhas/iniciativas/[id]
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    // Verificar permissão de edição server-side
    const denied = await requireApiPermission(request, 'campanhasmarketingdigital', 'UPDATE');
    if (denied) return denied;

    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const existing = await prisma.marketingInitiative.findFirst({
      where: { id: params.id, tenantId: payload.tenantId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Iniciativa não encontrada' }, { status: 404 });
    }

    const body = await request.json();
    const {
      name, description, goalDescription, totalBudgetPlanned,
      startDate, endDate, status, primaryKpi, primaryKpiTarget, clientId,
    } = body;

    const updated = await prisma.marketingInitiative.update({
      where: { id: params.id },
      data: {
        ...(name               !== undefined && { name: name.trim() }),
        ...(description        !== undefined && { description }),
        ...(goalDescription    !== undefined && { goalDescription }),
        ...(totalBudgetPlanned !== undefined && { totalBudgetPlanned: totalBudgetPlanned ? Number(totalBudgetPlanned) : null }),
        ...(startDate          !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(endDate            !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(status             !== undefined && { status }),
        ...(primaryKpi         !== undefined && { primaryKpi }),
        ...(primaryKpiTarget   !== undefined && { primaryKpiTarget: primaryKpiTarget ? Number(primaryKpiTarget) : null }),
        ...(clientId           !== undefined && { clientId: clientId || null }),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('PATCH /iniciativas/[id] error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao atualizar iniciativa' }, { status: 500 });
  }
}

// DELETE /api/admin/campanhas/iniciativas/[id]
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    // Verificar permissão de exclusão server-side
    const denied = await requireApiPermission(request, 'campanhasmarketingdigital', 'DELETE');
    if (denied) return denied;

    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const existing = await prisma.marketingInitiative.findFirst({
      where: { id: params.id, tenantId: payload.tenantId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Iniciativa não encontrada' }, { status: 404 });
    }

    // Unlink campaigns first (FK is SET NULL but let's be explicit)
    await prisma.campaign.updateMany({
      where: { initiativeId: params.id },
      data: { initiativeId: null },
    });

    await prisma.marketingInitiative.delete({ where: { id: params.id } });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('DELETE /iniciativas/[id] error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao excluir iniciativa' }, { status: 500 });
  }
}
