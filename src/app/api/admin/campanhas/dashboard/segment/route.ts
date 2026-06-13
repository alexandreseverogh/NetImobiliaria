import { NextRequest, NextResponse } from 'next/server';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import pool from '@/lib/database/connection';
import prisma from '@/lib/marketing/prisma';

export const dynamic = 'force-dynamic';

const S = 'campanhasmarketingdigital';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ClientSegmentMetrics {
  spend: number;
  clicks: number;
  impressions: number;
  leads: number;
  conversions: number;
  cpl: number | null;
  ctr: number;
  cpc: number;
  cpm: number;
  deltaCplVsBenchmark: number | null;
  deltaCtrVsBenchmark: number | null;
  status: 'ok' | 'warn' | 'critical' | 'nodata';
  rank: number;
}

export interface ClientDailyPoint {
  date: string;
  spend: number;
  clicks: number;
  impressions: number;
  ctr: number;
  cpl: number | null;
  leads: number;
}

export interface ClientSegmentData {
  id: string;
  name: string;
  logoUrl: string | null;
  metrics: ClientSegmentMetrics;
  daily: ClientDailyPoint[];
  topAngle: string | null;
  campaignCount: number;
  activeCampaignCount: number;
}

export interface SegmentDashboardResponse {
  segment: {
    id: string;
    name: string;
    slug: string;
    vocabulary: any;
    cplIdeal: number | null;
    cplCritical: number | null;
    ctrMin: number | null;
    primaryKpis: any[];
  };
  benchmark: {
    cplMedian: number | null;
    ctrMedian: number | null;
    cpcMedian: number | null;
    cpmMedian: number | null;
    spendTotal: number;
    leadsTotal: number;
    impressionsTotal: number;
    period: { startDate: string; endDate: string; days: number };
  };
  clients: ClientSegmentData[];
  // Campanhas do próprio tenant (sem client_id) também incluídas se existirem
  tenantOwn: ClientSegmentData | null;
}

// ─── Helper: mediana ─────────────────────────────────────────────────────────

function median(values: number[]): number | null {
  const sorted = values.filter(v => v > 0).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function pctDelta(current: number, reference: number | null): number | null {
  if (reference == null || reference === 0) return null;
  return ((current - reference) / reference) * 100;
}

function clientStatus(
  cpl: number | null,
  cplIdeal: number | null,
  cplCritical: number | null,
  hasData: boolean,
): ClientSegmentMetrics['status'] {
  if (!hasData) return 'nodata';
  if (cpl == null) return 'nodata';
  if (cplCritical && cpl > cplCritical) return 'critical';
  if (cplIdeal && cpl > cplIdeal * 1.15) return 'warn';
  return 'ok';
}

// ─── GET /api/admin/campanhas/dashboard/segment ───────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    const tenantId = payload.tenantId;

    const { searchParams } = new URL(request.url);
    const segmentId = searchParams.get('segmentId');
    const startStr  = searchParams.get('startDate');
    const endStr    = searchParams.get('endDate');

    if (!segmentId) {
      return NextResponse.json({ error: 'segmentId obrigatório' }, { status: 400 });
    }

    const endDate   = endStr   ? new Date(endStr)   : new Date();
    const startDate = startStr ? new Date(startStr) : new Date(endDate.getTime() - 30 * 86400000);
    const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000);

    // ── 1. Dados do segmento ────────────────────────────────────────────────
    const { rows: segRows } = await pool.query(
      `SELECT id, name, slug, vocabulary, cpl_ideal, cpl_critical, ctr_min, primary_kpis
       FROM public.system_segments WHERE id = $1::uuid`,
      [segmentId],
    );
    if (!segRows[0]) {
      return NextResponse.json({ error: 'Segmento não encontrado' }, { status: 404 });
    }
    const seg = segRows[0];

    // ── 2. Clientes do tenant neste segmento ─────────────────────────────────
    const { rows: clientRows } = await pool.query(
      `SELECT c.uuid AS id, c.nome AS name, c.logo_url
       FROM public.clientes c
       WHERE c.tenant_id = $1::uuid AND c.segment_id = $2::uuid
       ORDER BY c.nome ASC`,
      [tenantId, segmentId],
    );

    // ── 3. Campanhas do próprio tenant (client_id IS NULL) no segmento ───────
    const { rows: ownCampRows } = await pool.query(
      `SELECT cam.id FROM ${S}."Campaign" cam
       JOIN public.tenants t ON t.id = cam.tenant_id
       WHERE cam.tenant_id = $1::uuid
         AND cam.client_id IS NULL
         AND t.segment_id  = $2::uuid`,
      [tenantId, segmentId],
    );
    const ownCampaignIds: string[] = ownCampRows.map(r => r.id);

    // ── Helper: buscar métricas de um conjunto de campanhas ──────────────────
    const fetchClientData = async (
      campaignIds: string[],
      clientId: string | null,
      clientName: string,
      logoUrl: string | null,
    ): Promise<ClientSegmentData> => {
      if (campaignIds.length === 0) {
        return {
          id: clientId ?? 'own',
          name: clientName,
          logoUrl,
          metrics: {
            spend: 0, clicks: 0, impressions: 0, leads: 0, conversions: 0,
            cpl: null, ctr: 0, cpc: 0, cpm: 0,
            deltaCplVsBenchmark: null, deltaCtrVsBenchmark: null,
            status: 'nodata', rank: 0,
          },
          daily: [],
          topAngle: null,
          campaignCount: 0,
          activeCampaignCount: 0,
        };
      }

      // Totals
      const insights = await prisma.insight.findMany({
        where: {
          tenantId,
          campaignId: { in: campaignIds },
          date: { gte: startDate, lte: endDate },
        },
      });

      const leads = await prisma.lead.count({
        where: {
          tenantId,
          campaignId: { in: campaignIds },
          clickedAt: { gte: startDate, lte: endDate },
        },
      });

      const spend       = insights.reduce((s, i) => s + i.spend, 0);
      const clicks      = insights.reduce((s, i) => s + i.clicks, 0);
      const impressions = insights.reduce((s, i) => s + i.impressions, 0);
      const conversions = insights.reduce((s, i) => s + i.conversions, 0);
      const ctr         = impressions > 0 ? (clicks / impressions) * 100 : 0;
      const cpc         = clicks > 0 ? spend / clicks : 0;
      const cpm         = impressions > 0 ? (spend / impressions) * 1000 : 0;
      const cpl         = leads > 0 ? spend / leads : null;

      // Daily aggregation
      const dailyMap = new Map<string, { spend: number; clicks: number; impressions: number }>();
      for (const i of insights) {
        const key = new Date(i.date).toISOString().split('T')[0];
        const ex  = dailyMap.get(key) ?? { spend: 0, clicks: 0, impressions: 0 };
        ex.spend       += i.spend;
        ex.clicks      += i.clicks;
        ex.impressions += i.impressions;
        dailyMap.set(key, ex);
      }

      // Daily leads
      const { rows: dailyLeadsRows } = await pool.query(
        `SELECT DATE("clickedAt")::text AS date, COUNT(*)::int AS count
         FROM ${S}."Lead"
         WHERE tenant_id = $1::uuid
           AND "campaignId" = ANY($2::text[])
           AND "clickedAt" >= $3::timestamp
           AND "clickedAt" <= $4::timestamp
         GROUP BY DATE("clickedAt")`,
        [payload.tenantId, campaignIds, startDate, endDate],
      );
      const leadsByDate = new Map<string, number>(
        dailyLeadsRows.map(r => [r.date, r.count]),
      );

      // Sort dates and build daily array
      const allDates = Array.from(new Set([
        ...Array.from(dailyMap.keys()),
        ...Array.from(leadsByDate.keys()),
      ])).sort();

      const daily: ClientDailyPoint[] = allDates.map(date => {
        const m   = dailyMap.get(date) ?? { spend: 0, clicks: 0, impressions: 0 };
        const lc  = leadsByDate.get(date) ?? 0;
        const ctr = m.impressions > 0 ? (m.clicks / m.impressions) * 100 : 0;
        return {
          date,
          spend:       Number(m.spend.toFixed(2)),
          clicks:      m.clicks,
          impressions: m.impressions,
          ctr:         Number(ctr.toFixed(3)),
          cpl:         lc > 0 ? Number((m.spend / lc).toFixed(2)) : null,
          leads:       lc,
        };
      });

      // Campaign counts
      const campaigns = await prisma.campaign.findMany({
        where: { id: { in: campaignIds } },
        select: { id: true, status: true },
      });

      // Top angle (declared_angle most used)
      const { rows: angleRows } = await pool.query(
        `SELECT declared_angle, COUNT(*)::int AS cnt
         FROM ${S}."Campaign"
         WHERE id = ANY($1::text[]) AND declared_angle IS NOT NULL
         GROUP BY declared_angle ORDER BY cnt DESC LIMIT 1`,
        [campaignIds],
      );

      return {
        id:      clientId ?? 'own',
        name:    clientName,
        logoUrl,
        metrics: {
          spend:       Number(spend.toFixed(2)),
          clicks,
          impressions,
          leads,
          conversions,
          cpl:         cpl != null ? Number(cpl.toFixed(2)) : null,
          ctr:         Number(ctr.toFixed(3)),
          cpc:         Number(cpc.toFixed(2)),
          cpm:         Number(cpm.toFixed(2)),
          deltaCplVsBenchmark: null, // filled after benchmark is computed
          deltaCtrVsBenchmark: null,
          status:      'nodata',     // filled after benchmark
          rank:        0,
        },
        daily,
        topAngle:            angleRows[0]?.declared_angle ?? null,
        campaignCount:       campaigns.length,
        activeCampaignCount: campaigns.filter(c => c.status === 'ACTIVE').length,
      };
    }

    // ── 4. Buscar dados de todos os clientes ──────────────────────────────────
    const clientDataPromises = clientRows.map(async (c: any) => {
      const { rows: campRows } = await pool.query(
        `SELECT id FROM ${S}."Campaign"
         WHERE tenant_id = $1::uuid AND client_id = $2::uuid`,
        [payload.tenantId, c.id],
      );
      return fetchClientData(campRows.map(r => r.id), c.id, c.name, c.logo_url ?? null);
    });

    const tenantOwnData = ownCampaignIds.length > 0
      ? await fetchClientData(ownCampaignIds, null, 'Minha Empresa', null)
      : null;

    const clients = await Promise.all(clientDataPromises);

    // ── 5. Calcular benchmarks (medianas reais do período) ─────────────────────
    const allEntries = [...clients, ...(tenantOwnData ? [tenantOwnData] : [])];
    const cplValues  = allEntries.map(c => c.metrics.cpl).filter((v): v is number => v !== null);
    const ctrValues  = allEntries.map(c => c.metrics.ctr).filter(v => v > 0);
    const cpcValues  = allEntries.map(c => c.metrics.cpc).filter(v => v > 0);
    const cpmValues  = allEntries.map(c => c.metrics.cpm).filter(v => v > 0);

    const cplMedian = median(cplValues);
    const ctrMedian = median(ctrValues);
    const cpcMedian = median(cpcValues);
    const cpmMedian = median(cpmValues);

    const cplIdeal    = seg.cpl_ideal   ? Number(seg.cpl_ideal)   : null;
    const cplCritical = seg.cpl_critical ? Number(seg.cpl_critical) : null;

    // ── 6. Enriquecer cada cliente com deltas e status ────────────────────────
    const enrichClient = (c: ClientSegmentData): ClientSegmentData => {
      const { cpl, ctr } = c.metrics;
      const hasData = c.metrics.spend > 0 || c.metrics.leads > 0;
      return {
        ...c,
        metrics: {
          ...c.metrics,
          deltaCplVsBenchmark: cpl != null ? pctDelta(cpl, cplMedian) : null,
          deltaCtrVsBenchmark: ctr > 0     ? pctDelta(ctr, ctrMedian) : null,
          status:              clientStatus(cpl, cplIdeal, cplCritical, hasData),
        },
      };
    }

    const enrichedClients = clients.map(enrichClient);
    const enrichedOwn     = tenantOwnData ? enrichClient(tenantOwnData) : null;

    // ── 7. Ranking por CPL (menor = melhor = rank 1) ──────────────────────────
    const withCpl = [...enrichedClients, ...(enrichedOwn ? [enrichedOwn] : [])]
      .filter(c => c.metrics.cpl !== null)
      .sort((a, b) => (a.metrics.cpl ?? Infinity) - (b.metrics.cpl ?? Infinity));

    withCpl.forEach((c, i) => { c.metrics.rank = i + 1; });

    // ── 8. Resposta final ──────────────────────────────────────────────────────
    return NextResponse.json({
      segment: {
        id:          seg.id,
        name:        seg.name,
        slug:        seg.slug,
        vocabulary:  seg.vocabulary,
        cplIdeal,
        cplCritical,
        ctrMin:      seg.ctr_min ? Number(seg.ctr_min) : null,
        primaryKpis: seg.primary_kpis ?? [],
      },
      benchmark: {
        cplMedian,
        ctrMedian,
        cpcMedian,
        cpmMedian,
        spendTotal:       allEntries.reduce((s, c) => s + c.metrics.spend, 0),
        leadsTotal:       allEntries.reduce((s, c) => s + c.metrics.leads, 0),
        impressionsTotal: allEntries.reduce((s, c) => s + c.metrics.impressions, 0),
        period: {
          startDate: startDate.toISOString().split('T')[0],
          endDate:   endDate.toISOString().split('T')[0],
          days:      periodDays,
        },
      },
      clients:    enrichedClients,
      tenantOwn:  enrichedOwn,
    } satisfies SegmentDashboardResponse);

  } catch (error: any) {
    console.error('GET /dashboard/segment error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao buscar dados do segmento' }, { status: 500 });
  }
}
