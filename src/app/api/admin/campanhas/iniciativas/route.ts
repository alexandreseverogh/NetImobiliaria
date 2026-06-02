import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/marketing/prisma';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { requireApiPermission } from '@/lib/auth/apiPermissions';

export const dynamic = 'force-dynamic';

// GET /api/admin/campanhas/iniciativas?status=&clientId=&page=&limit=
export async function GET(request: NextRequest) {
  try {
    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status   = searchParams.get('status')   || undefined;
    const clientId = searchParams.get('clientId') || undefined;
    const page     = Math.max(1, Number(searchParams.get('page')  || '1'));
    const limit    = Math.min(100, Math.max(1, Number(searchParams.get('limit') || '20')));

    const where: any = { tenantId: payload.tenantId };
    if (status) where.status = status;
    // 'own' = campanhas do próprio tenant (clientId IS NULL)
    if (clientId === 'own') where.clientId = null;
    else if (clientId)      where.clientId = clientId;

    const [items, total] = await Promise.all([
      prisma.marketingInitiative.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: { select: { campaigns: true } },
        },
      }),
      prisma.marketingInitiative.count({ where }),
    ]);

    return NextResponse.json({ items, total, page, limit });
  } catch (error: any) {
    console.error('GET /iniciativas error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao listar iniciativas' }, { status: 500 });
  }
}

// POST /api/admin/campanhas/iniciativas
export async function POST(request: NextRequest) {
  try {
    // Verificar permissão de criação server-side
    const denied = await requireApiPermission(request, 'campanhasmarketingdigital', 'CREATE');
    if (denied) return denied;

    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name, description, goalDescription, totalBudgetPlanned,
      startDate, endDate, status, primaryKpi, primaryKpiTarget,
      clientId, campaignIds,
    } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });
    }

    const initiative = await prisma.marketingInitiative.create({
      data: {
        tenantId:           payload.tenantId,
        clientId:           clientId || null,
        name:               name.trim(),
        description:        description || null,
        goalDescription:    goalDescription || null,
        totalBudgetPlanned: totalBudgetPlanned ? Number(totalBudgetPlanned) : null,
        startDate:          startDate ? new Date(startDate) : null,
        endDate:            endDate   ? new Date(endDate)   : null,
        status:             status || 'PLANNED',
        primaryKpi:         primaryKpi || null,
        primaryKpiTarget:   primaryKpiTarget ? Number(primaryKpiTarget) : null,
        createdBy:          payload.userId || null,
      },
    });

    // Link existing campaigns if provided
    if (Array.isArray(campaignIds) && campaignIds.length > 0) {
      await prisma.campaign.updateMany({
        where: { id: { in: campaignIds }, tenantId: payload.tenantId },
        data: { initiativeId: initiative.id },
      });
    }

    return NextResponse.json(initiative, { status: 201 });
  } catch (error: any) {
    console.error('POST /iniciativas error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao criar iniciativa' }, { status: 500 });
  }
}
