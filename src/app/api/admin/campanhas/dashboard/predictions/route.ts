import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/marketing/prisma';
import { getTokenPayload } from '@/lib/auth/jwt-node';

export const dynamic = 'force-dynamic';

function linearRegression(points: { x: number; y: number }[]) {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: 0, r2: 0 };

  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);
  const meanX = sumX / n;
  const meanY = sumY / n;

  const denom = sumX2 - n * meanX * meanX;
  if (Math.abs(denom) < 1e-10) return { slope: 0, intercept: meanY, r2: 0 };

  const slope = (sumXY - n * meanX * meanY) / denom;
  const intercept = meanY - slope * meanX;

  const ssTot = points.reduce((s, p) => s + (p.y - meanY) ** 2, 0);
  const ssRes = points.reduce((s, p) => s + (p.y - (slope * p.x + intercept)) ** 2, 0);
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;

  return { slope, intercept, r2 };
}

export async function GET(request: NextRequest) {
  try {
    const payload = getTokenPayload(request);
    if (!payload || !payload.tenantId) {
      return NextResponse.json({ error: 'Tenant não encontrado ou usuário não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const campaignId     = searchParams.get('campaignId');
    const clientId       = searchParams.get('clientId');
    const projectionDays = parseInt(searchParams.get('days') || '30');

    const campaignWhere: any = { tenantId: payload.tenantId };
    if (campaignId) campaignWhere.id = campaignId;
    if (clientId === 'own') {
      campaignWhere.clientId = null;
    } else if (clientId) {
      campaignWhere.clientId = clientId;
    }

    const campaigns = await prisma.campaign.findMany({ where: campaignWhere });
    const campaignIds = campaigns.map(c => c.id);

    if (campaignIds.length === 0) {
      return NextResponse.json({ spend: [], leads: [], ctr: [], cpc: [], insufficientData: true });
    }

    const insights = await prisma.insight.findMany({
      where: {
        tenantId: payload.tenantId,
        campaignId: { in: campaignIds },
        date: { gte: new Date(Date.now() - 60 * 86400000) },
      },
      orderBy: { date: 'asc' },
    });

    if (insights.length < 3) {
      return NextResponse.json({ spend: [], leads: [], ctr: [], cpc: [], insufficientData: true });
    }

    const dailyMap = new Map<string, { spend: number; clicks: number; impressions: number }>();
    for (const i of insights) {
      const key = new Date(i.date).toISOString().split('T')[0];
      const existing = dailyMap.get(key) || { spend: 0, clicks: 0, impressions: 0 };
      existing.spend += i.spend;
      existing.clicks += i.clicks;
      existing.impressions += i.impressions;
      dailyMap.set(key, existing);
    }

    const sortedDays = [...dailyMap.keys()].sort();
    const today = new Date();

    function predict(values: number[]) {
      const points = values.map((y, x) => ({ x, y }));
      const { slope, intercept } = linearRegression(points);

      const mean = values.reduce((s, v) => s + v, 0) / values.length;
      const stdDev = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length);

      const result = [];
      for (let d = 1; d <= projectionDays; d++) {
        const x = values.length + d;
        const predicted = Math.max(0, slope * x + intercept);
        const futureDate = new Date(today.getTime() + d * 86400000);
        result.push({
          date: futureDate.toISOString().split('T')[0],
          predicted: Math.round(predicted * 100) / 100,
          upperBound: Math.round((predicted + 1.5 * stdDev) * 100) / 100,
          lowerBound: Math.round(Math.max(0, predicted - 1.5 * stdDev) * 100) / 100,
        });
      }
      return result;
    }

    const spendValues = sortedDays.map(d => dailyMap.get(d)!.spend);
    const clickValues = sortedDays.map(d => dailyMap.get(d)!.clicks);
    const impressionValues = sortedDays.map(d => dailyMap.get(d)!.impressions);
    const ctrValues = sortedDays.map(d => {
      const data = dailyMap.get(d)!;
      return data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0;
    });
    const cpcValues = sortedDays.map(d => {
      const data = dailyMap.get(d)!;
      return data.clicks > 0 ? data.spend / data.clicks : 0;
    });

    const leadsRaw: any[] = await prisma.$queryRaw`
      SELECT DATE("clickedAt") as date, COUNT(*)::int as count
      FROM campanhasmarketingdigital."Lead"
      WHERE "tenant_id" = ${payload.tenantId}::uuid
        AND "campaignId" = ANY(${campaignIds})
        AND "clickedAt" >= ${new Date(Date.now() - 60 * 86400000)}::timestamp
      GROUP BY DATE("clickedAt")
      ORDER BY date ASC
    `;

    const normalizedLeads = leadsRaw.map(r => ({
      date: r.date instanceof Date ? r.date.toISOString().split('T')[0] : r.date,
      count: Number(r.count)
    }));

    const leadValues = sortedDays.map(d => {
      const found = normalizedLeads.find((l: any) => l.date === d);
      return found ? found.count : 0;
    });

    return NextResponse.json({
      spend: predict(spendValues),
      leads: predict(leadValues),
      ctr: predict(ctrValues),
      cpc: predict(cpcValues),
      historical: {
        dates: sortedDays,
        spend: spendValues,
        clicks: clickValues,
        impressions: impressionValues,
        ctr: ctrValues,
        cpc: cpcValues,
        leads: leadValues,
      },
    });
  } catch (error: any) {
    console.error('Erro no GET /dashboard/predictions:', error);
    return NextResponse.json({ error: error.message || 'Erro ao gerar predicoes' }, { status: 500 });
  }
}
