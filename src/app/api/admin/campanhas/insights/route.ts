import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/marketing/prisma';
import { getTokenPayload } from '@/lib/auth/jwt-node';

export const dynamic = 'force-dynamic';

// GET /api/admin/campanhas/insights
export async function GET(request: NextRequest) {
  try {
    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');
    const clientId   = searchParams.get('clientId');
    const startDate  = searchParams.get('startDate');
    const endDate    = searchParams.get('endDate');

    const where: any = { tenantId: payload.tenantId };
    if (campaignId) {
      where.campaignId = campaignId;
    } else if (clientId === 'own') {
      // insights apenas de campanhas próprias (sem cliente)
      where.campaign = { clientId: null };
    } else if (clientId) {
      where.campaign = { clientId };
    }
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const insights = await prisma.insight.findMany({
      where,
      orderBy: { date: 'desc' },
      take: 500,
    });

    return NextResponse.json(insights);
  } catch (error: any) {
    console.error('GET /insights error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao listar insights' }, { status: 500 });
  }
}
