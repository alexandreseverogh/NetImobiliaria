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
    const clientId   = searchParams.get('clientId');
    const startDate  = searchParams.get('startDate');
    const endDate    = searchParams.get('endDate');
    const campaignId = searchParams.get('campaignId');

    // ── Prisma where (count + groupBy) ─────────────────────────────────────────
    const where: any = { tenantId: payload.tenantId };
    if (clientId === 'own') {
      where.clientId = null;
    } else if (clientId) {
      where.clientId = clientId;
    }
    if (campaignId) where.campaignId = campaignId;
    if (startDate || endDate) {
      where.clickedAt = {};
      if (startDate) where.clickedAt.gte = new Date(startDate);
      if (endDate)   where.clickedAt.lte = new Date(endDate);
    }

    const totalLeads = await prisma.lead.count({ where });

    const leadsByCampaign = await prisma.lead.groupBy({
      by: ['campaignId'],
      where,
      _count: { id: true },
    });

    // ── Raw SQL leadsByDay — mesmos filtros dinâmicos ───────────────────────────
    const parsedStartDate = startDate ? new Date(startDate) : new Date(0);
    const parsedEndDate   = endDate   ? new Date(endDate)   : new Date();

    // Monta WHERE cláusulas e params dinamicamente (seguro: sem interpolação de string)
    const conditions: string[] = [
      `"tenant_id" = $1::uuid`,
      `"clickedAt" >= $2::timestamp`,
      `"clickedAt" <= $3::timestamp`,
    ];
    const params: unknown[] = [payload.tenantId, parsedStartDate, parsedEndDate];

    if (clientId === 'own') {
      conditions.push(`"client_id" IS NULL`);
    } else if (clientId) {
      params.push(clientId);
      conditions.push(`"client_id" = $${params.length}::uuid`);
    }

    if (campaignId) {
      params.push(campaignId);
      conditions.push(`"campaign_id" = $${params.length}::uuid`);
    }

    const sql = `
      SELECT DATE("clickedAt") as date, COUNT(*)::int as count
      FROM campanhasmarketingdigital."Lead"
      WHERE ${conditions.join(' AND ')}
      GROUP BY DATE("clickedAt")
      ORDER BY date DESC
      LIMIT 30
    `;

    const leadsByDay: any[] = await prisma.$queryRawUnsafe(sql, ...params);

    // Normaliza BigInt / Date para JSON
    const normalizedLeadsByDay = leadsByDay.map(r => ({
      date:  r.date instanceof Date ? r.date.toISOString().split('T')[0] : r.date,
      count: Number(r.count),
    }));

    return NextResponse.json({ totalLeads, leadsByCampaign, leadsByDay: normalizedLeadsByDay });
  } catch (error) {
    console.error('Erro no GET /leads/stats:', error);
    return NextResponse.json({ error: 'Erro ao buscar estatísticas' }, { status: 500 });
  }
}
