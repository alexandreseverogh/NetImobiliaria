import { NextRequest, NextResponse } from 'next/server';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import pool from '@/lib/database/connection';
import { resolveCampaignIdsBySegment } from '@/lib/marketing/segmentUtils';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/campanhas/dashboard/segmentation
 * Quebras de desempenho (idade×gênero, região e horário) já coletadas em InsightBreakdown.
 * Escopo igual ao resto do dashboard: segmentId, clientId (own | uuid | segment), período.
 * Não aplica nenhuma regra de recomendação — isso é da Fase 4.
 */
export async function GET(request: NextRequest) {
  try {
    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startStr = searchParams.get('startDate');
    const endStr = searchParams.get('endDate');
    let clientId = searchParams.get('clientId');
    if (clientId === 'segment' || clientId === 'all') clientId = null;
    const segmentId = searchParams.get('segmentId');
    // Quantas regiões retornar (padrão 10, limite 1–50). Nada fixo no código.
    const topRegions = Math.min(50, Math.max(1, parseInt(searchParams.get('topRegions') || '10', 10) || 10));

    const endDate = endStr
      ? (endStr.length === 10 ? endStr : endStr.slice(0, 10))
      : new Date().toISOString().slice(0, 10);
    const startDate = startStr
      ? (startStr.length === 10 ? startStr : startStr.slice(0, 10))
      : new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

    // ── Escopo de campanhas (mesma regra dos outros endpoints do dashboard) ──
    let campaignIds: string[] | null = null; // null = todas do tenant
    // Visão por campanha: uma campanha específica (dentro do escopo já validado pelo tenant).
    const oneCampaignId = searchParams.get('campaignId');
    if (oneCampaignId) {
      const r = await pool.query<{ id: string }>(
        `SELECT id FROM campanhasmarketingdigital."Campaign" WHERE tenant_id = $1::uuid AND id = $2`,
        [payload.tenantId, oneCampaignId],
      );
      campaignIds = r.rows.map(x => x.id);
    } else if (segmentId) {
      campaignIds = await resolveCampaignIdsBySegment(payload.tenantId, segmentId, clientId ?? undefined);
    } else if (clientId === 'own') {
      const r = await pool.query<{ id: string }>(
        `SELECT id FROM campanhasmarketingdigital."Campaign" WHERE tenant_id = $1::uuid AND client_id IS NULL`,
        [payload.tenantId],
      );
      campaignIds = r.rows.map(x => x.id);
    } else if (clientId) {
      const r = await pool.query<{ id: string }>(
        `SELECT id FROM campanhasmarketingdigital."Campaign" WHERE tenant_id = $1::uuid AND client_id = $2::uuid`,
        [payload.tenantId, clientId],
      );
      campaignIds = r.rows.map(x => x.id);
    }

    if (campaignIds !== null && campaignIds.length === 0) {
      return NextResponse.json(emptyResponse(startDate, endDate));
    }

    const params: any[] = [payload.tenantId, startDate, endDate];
    let scopeSql = '';
    if (campaignIds !== null) {
      params.push(campaignIds);
      scopeSql = `AND campaign_id = ANY($4::text[])`;
    }

    const { rows } = await pool.query<{
      breakdown_type: string; breakdown_key: string;
      spend: string; leads: string; impressions: string; clicks: string;
    }>(
      `SELECT breakdown_type, breakdown_key,
              SUM(spend)::text AS spend, SUM(leads)::text AS leads,
              SUM(impressions)::text AS impressions, SUM(clicks)::text AS clicks
         FROM campanhasmarketingdigital."InsightBreakdown"
        WHERE tenant_id = $1::uuid AND date BETWEEN $2::date AND $3::date ${scopeSql}
        GROUP BY breakdown_type, breakdown_key`,
      params,
    );

    // Leads por hora DIA A DIA (base dos gráficos de linhas e de mapa de calor).
    const { rows: dailyRows } = await pool.query<{ date: string; breakdown_key: string; leads: string }>(
      `SELECT to_char(date, 'YYYY-MM-DD') AS date, breakdown_key, SUM(leads)::text AS leads
         FROM campanhasmarketingdigital."InsightBreakdown"
        WHERE tenant_id = $1::uuid AND date BETWEEN $2::date AND $3::date
          AND breakdown_type = 'hour' ${scopeSql}
        GROUP BY date, breakdown_key
        ORDER BY date`,
      params,
    );
    const dailyHours = dailyRows
      .map(r => ({ date: r.date, hour: parseInt(r.breakdown_key, 10), leads: Number(r.leads) }))
      .filter(r => r.hour >= 0 && r.hour <= 23);

    const cpl = (spend: number, leads: number) => (leads > 0 ? Math.round((spend / leads) * 100) / 100 : null);

    // ── Idade × gênero ──
    const cells: Array<{ age: string; gender: string; spend: number; leads: number; cpl: number | null; impressions: number; clicks: number }> = [];
    // ── Região ──
    const regions: Array<{ region: string; spend: number; leads: number; cpl: number | null; impressions: number }> = [];
    // ── Horário (0-23) ──
    const hours: Array<{ hour: number; spend: number; leads: number; cpl: number | null }> = Array.from(
      { length: 24 }, (_, h) => ({ hour: h, spend: 0, leads: 0, cpl: null }),
    );

    for (const r of rows) {
      const spend = Number(r.spend), leads = Number(r.leads);
      const impressions = Number(r.impressions), clicks = Number(r.clicks);
      if (r.breakdown_type === 'age_gender') {
        const [age, gender] = r.breakdown_key.split('|');
        cells.push({ age, gender, spend, leads, cpl: cpl(spend, leads), impressions, clicks });
      } else if (r.breakdown_type === 'region') {
        regions.push({ region: r.breakdown_key, spend, leads, cpl: cpl(spend, leads), impressions });
      } else if (r.breakdown_type === 'hour') {
        const h = parseInt(r.breakdown_key, 10);
        if (h >= 0 && h <= 23) hours[h] = { hour: h, spend, leads, cpl: cpl(spend, leads) };
      }
    }

    const ages = Array.from(new Set(cells.map(c => c.age))).sort();
    const genders = Array.from(new Set(cells.map(c => c.gender))).sort();
    regions.sort((a, b) => b.spend - a.spend);

    // Dias do período (inclusive). Horário é mostrado como MÉDIA POR DIA para que
    // períodos de tamanhos diferentes sejam comparáveis.
    const dayMs = 86_400_000;
    const diffDays = Math.round((Date.parse(endDate) - Date.parse(startDate)) / dayMs) + 1;
    const days = Number.isFinite(diffDays) && diffDays > 0 ? diffDays : 1;
    const hoursPerDay = hours.map(h => ({
      ...h,
      leadsPerDay: Math.round((h.leads / days) * 100) / 100,
      spendPerDay: Math.round((h.spend / days) * 100) / 100,
    }));

    return NextResponse.json({
      period: { startDate, endDate },
      days,
      hasData: rows.length > 0,
      ageGender: { ages, genders, cells },
      regions: regions.slice(0, topRegions),
      hours: hoursPerDay,
      dailyHours,
    });
  } catch (error: any) {
    console.error('GET /dashboard/segmentation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function emptyResponse(startDate: string, endDate: string) {
  return {
    period: { startDate, endDate },
    hasData: false,
    ageGender: { ages: [], genders: [], cells: [] },
    regions: [],
    days: 1,
    dailyHours: [],
    hours: Array.from({ length: 24 }, (_, h) => ({ hour: h, spend: 0, leads: 0, cpl: null, leadsPerDay: 0, spendPerDay: 0 })),
  };
}
