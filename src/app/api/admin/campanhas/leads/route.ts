import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/marketing/prisma';
import { getTokenPayload } from '@/lib/auth/jwt-node';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const payload = getTokenPayload(request);
    if (!payload || !payload.tenantId) {
      return NextResponse.json({ error: 'Tenant não encontrado ou usuário não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');
    const clientId   = searchParams.get('clientId');
    const startDate  = searchParams.get('startDate');
    const endDate    = searchParams.get('endDate');
    const page       = parseInt(searchParams.get('page') || '1');
    const limit      = parseInt(searchParams.get('limit') || '50');

    const where: any = { tenantId: payload.tenantId };
    if (campaignId) {
      where.campaignId = campaignId;
    } else if (clientId === 'own') {
      where.clientId = null;
    } else if (clientId) {
      where.clientId = clientId;
    }
    if (startDate || endDate) {
      where.clickedAt = {};
      if (startDate) where.clickedAt.gte = new Date(startDate);
      if (endDate) where.clickedAt.lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        orderBy: { clickedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.lead.count({ where }),
    ]);

    return NextResponse.json({ leads, total, page, limit });
  } catch (error) {
    console.error('Erro no GET /leads:', error);
    return NextResponse.json({ error: 'Erro ao listar leads' }, { status: 500 });
  }
}
