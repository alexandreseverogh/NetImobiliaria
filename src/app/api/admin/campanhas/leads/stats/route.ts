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
    const clientId  = searchParams.get('clientId');
    const startDate = searchParams.get('startDate');
    const endDate   = searchParams.get('endDate');

    const where: any = { tenantId: payload.tenantId };
    if (clientId === 'own') {
      where.clientId = null;
    } else if (clientId) {
      where.clientId = clientId;
    }
    if (startDate || endDate) {
      where.clickedAt = {};
      if (startDate) where.clickedAt.gte = new Date(startDate);
      if (endDate) where.clickedAt.lte = new Date(endDate);
    }

    const totalLeads = await prisma.lead.count({ where });

    const leadsByCampaign = await prisma.lead.groupBy({
      by: ['campaignId'],
      where,
      _count: { id: true },
    });

    const parsedStartDate = startDate ? new Date(startDate) : new Date(0);
    const parsedEndDate = endDate ? new Date(endDate) : new Date();

    const leadsByDay: any[] = await prisma.$queryRaw`
      SELECT DATE("clickedAt") as date, COUNT(*)::int as count
      FROM campanhasmarketingdigital."Lead"
      WHERE "tenant_id" = ${payload.tenantId}::uuid
        AND "clickedAt" >= ${parsedStartDate}::timestamp
        AND "clickedAt" <= ${parsedEndDate}::timestamp
      GROUP BY DATE("clickedAt")
      ORDER BY date DESC
      LIMIT 30
    `;

    // Normalizando dados do prisma raw para json
    const normalizedLeadsByDay = leadsByDay.map(r => ({
      date: r.date instanceof Date ? r.date.toISOString().split('T')[0] : r.date,
      count: Number(r.count)
    }));

    return NextResponse.json({ 
      totalLeads, 
      leadsByCampaign, 
      leadsByDay: normalizedLeadsByDay 
    });
  } catch (error) {
    console.error('Erro no GET /leads/stats:', error);
    return NextResponse.json({ error: 'Erro ao buscar estatísticas' }, { status: 500 });
  }
}
