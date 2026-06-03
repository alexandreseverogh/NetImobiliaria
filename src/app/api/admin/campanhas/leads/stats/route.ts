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

    const leadsByCampaignRaw = await prisma.lead.groupBy({
      by: ['campaignId'],
      where,
      _count: { id: true },
    });

    // Resolve campaign names server-side so the client doesn't need a separate lookup.
    // Also filter out null campaignId entries (leads with no campaign attached).
    const campaignIds = leadsByCampaignRaw
      .map(l => l.campaignId)
      .filter((id): id is string => id !== null);

    const campaignNameMap = new Map<string, string>();
    if (campaignIds.length > 0) {
      const campaigns = await prisma.campaign.findMany({
        where: { id: { in: campaignIds } },
        select: { id: true, name: true },
      });
      for (const c of campaigns) campaignNameMap.set(c.id, c.name);
    }

    const leadsByCampaign = leadsByCampaignRaw
      .filter(l => l.campaignId !== null)
      .map(l => ({
        campaignId:   l.campaignId!,
        campaignName: campaignNameMap.get(l.campaignId!) ?? l.campaignId!.slice(0, 8),
        count:        l._count.id,
      }))
      .sort((a, b) => b.count - a.count);

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
      // campaignId é TEXT (sem @map → coluna camelCase, sem cast ::uuid)
      conditions.push(`"campaignId" = $${params.length}`);
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
