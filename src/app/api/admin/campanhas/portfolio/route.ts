/**
 * GET /api/admin/campanhas/portfolio
 * FASE 10 — Portfolio Dashboard: visão consolidada de todos os clientes do tenant.
 *
 * Query params:
 *   period    — dias do período (default: 30)
 *   segmentId — filtrar por segmento (opcional)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { requireApiPermission } from '@/lib/auth/apiPermissions';
import pool from '@/lib/database/connection';

export const dynamic = 'force-dynamic';

/* ── tipos ──────────────────────────────────────────────────────── */

export interface PortfolioClientCampaign {
  id:             string;
  name:           string;
  externalStatus: string;
  metrics: {
    spend:       number;
    leads:       number;
    cpl:         number | null;
    impressions: number;
    clicks:      number;
    ctr:         number | null;
  };
  health: 'ok' | 'warn' | 'critical' | 'nodata';
}

export interface PortfolioClient {
  clientId:    string | null;
  clientName:  string;
  segment:     { id: string; name: string; slug: string } | null;
  metrics: {
    spend:       number;
    leads:       number;
    cpl:         number | null;
    ctr:         number | null;
    impressions: number;
    clicks:      number;
    campaigns:   number;
  };
  benchmarks: {
    cplIdeal:    number | null;
    cplCritical: number | null;
    ctrMin:      number | null;
  };
  status:    'ok' | 'warn' | 'critical' | 'nodata';
  campaigns: PortfolioClientCampaign[];
  logoUrl:   string | null;
}

export interface PortfolioResponse {
  period:       number;
  totalClients: number;
  totalSpend:   number;
  totalLeads:   number;
  avgCpl:       number | null;
  clients:      PortfolioClient[];
}

/* ── helpers ────────────────────────────────────────────────────── */

function parseNullable(v: string | number | null | undefined): number | null {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : parseFloat(v);
  return isNaN(n) ? null : n;
}

/* ── helper de status ───────────────────────────────────────────── */

function computeStatus(
  cpl: number | null,
  cplIdeal: number | null,
  cplCritical: number | null,
  spend: number,
): 'ok' | 'warn' | 'critical' | 'nodata' {
  if (spend === 0) return 'nodata';
  if (cpl === null) return 'nodata';
  if (cplCritical !== null && cpl >= cplCritical) return 'critical';
  if (cplIdeal !== null && cpl > cplIdeal) return 'warn';
  return 'ok';
}

/* ── GET ────────────────────────────────────────────────────────── */

export async function GET(request: NextRequest) {
  const denied = await requireApiPermission(request, 'dashboard-campanhas', 'READ');
  if (denied) return denied;

  const payload = getTokenPayload(request);
  if (!payload?.tenantId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const period    = Math.min(Math.max(parseInt(searchParams.get('period') || '30'), 1), 365);
  const segmentId = searchParams.get('segmentId') || null;

  try {
    /* ── 1. Métricas agregadas por cliente ──────────────────────── */
    const metricsQuery = await pool.query<{
      client_id:     string | null;
      campaign_count: string;
      total_spend:   string;
      total_impressions: string;
      total_clicks:  string;
    }>(`
      SELECT
        camp.client_id,
        COUNT(DISTINCT camp.id)         AS campaign_count,
        COALESCE(SUM(i.spend), 0)       AS total_spend,
        COALESCE(SUM(i.impressions), 0) AS total_impressions,
        COALESCE(SUM(i.clicks), 0)      AS total_clicks
      FROM campanhasmarketingdigital."Campaign" camp
      LEFT JOIN campanhasmarketingdigital."Insight" i
        ON i."campaignId" = camp.id
        AND i.date >= NOW() - ($2 || ' days')::INTERVAL
      WHERE camp.tenant_id = $1::uuid
      GROUP BY camp.client_id
    `, [payload.tenantId, period]);

    /* ── 2. Leads por cliente ────────────────────────────────────── */
    const leadsQuery = await pool.query<{
      client_id: string | null;
      lead_count: string;
    }>(`
      SELECT client_id, COUNT(*)::int AS lead_count
      FROM campanhasmarketingdigital."CtaInteraction"
      WHERE tenant_id = $1::uuid
        AND event_type = 'WHATSAPP_CLICK'
        AND created_at >= NOW() - ($2 || ' days')::INTERVAL
      GROUP BY client_id
    `, [payload.tenantId, period]);

    const leadsMap = new Map<string, number>();
    for (const row of leadsQuery.rows) {
      leadsMap.set(row.client_id ?? '__own__', parseInt(row.lead_count));
    }

    /* ── 2b. Métricas por campanha individual ───────────────────────── */
    const campaignMetricsQuery = await pool.query<{
      campaign_id:     string;
      campaign_name:   string;
      campaign_status: string;
      client_id:       string | null;
      total_spend:     string;
      total_impressions: string;
      total_clicks:    string;
    }>(`
      SELECT
        camp.id              AS campaign_id,
        camp.name            AS campaign_name,
        camp.status          AS campaign_status,
        camp.client_id,
        COALESCE(SUM(i.spend), 0)       AS total_spend,
        COALESCE(SUM(i.impressions), 0) AS total_impressions,
        COALESCE(SUM(i.clicks), 0)      AS total_clicks
      FROM campanhasmarketingdigital."Campaign" camp
      LEFT JOIN campanhasmarketingdigital."Insight" i
        ON i."campaignId" = camp.id
        AND i.date >= NOW() - ($2 || ' days')::INTERVAL
      WHERE camp.tenant_id = $1::uuid
      GROUP BY camp.id, camp.name, camp.status, camp.client_id
      ORDER BY SUM(i.spend) DESC NULLS LAST
    `, [payload.tenantId, period]);

    /* ── 2c. Leads por campanha ─────────────────────────────────────── */
    const leadsPerCampaignQuery = await pool.query<{
      campaign_id: string;
      lead_count:  string;
    }>(`
      SELECT campaign_id, COUNT(*)::int AS lead_count
      FROM campanhasmarketingdigital."CtaInteraction"
      WHERE tenant_id = $1::uuid
        AND event_type = 'WHATSAPP_CLICK'
        AND created_at >= NOW() - ($2 || ' days')::INTERVAL
        AND campaign_id IS NOT NULL
      GROUP BY campaign_id
    `, [payload.tenantId, period]);

    const leadsByCampaignMap = new Map<string, number>();
    for (const r of leadsPerCampaignQuery.rows) {
      leadsByCampaignMap.set(r.campaign_id, parseInt(r.lead_count));
    }

    /* ── 2d. Agrupar campanhas por cliente ──────────────────────────── */
    const campaignsByClient = new Map<string, PortfolioClientCampaign[]>();
    for (const r of campaignMetricsQuery.rows) {
      const key      = r.client_id ?? '__own__';
      const cSpend   = parseFloat(r.total_spend);
      const cImpr    = parseInt(r.total_impressions);
      const cClicks  = parseInt(r.total_clicks);
      const cLeads   = leadsByCampaignMap.get(r.campaign_id) ?? 0;
      const cCpl     = cLeads > 0 ? cSpend / cLeads : null;
      const cCtr     = cImpr > 0  ? (cClicks / cImpr) * 100 : null;
      const camp: PortfolioClientCampaign = {
        id:             r.campaign_id,
        name:           r.campaign_name,
        externalStatus: r.campaign_status,
        metrics:        { spend: cSpend, leads: cLeads, cpl: cCpl, impressions: cImpr, clicks: cClicks, ctr: cCtr },
        health:         computeStatus(cCpl, null, null, cSpend),
      };
      if (!campaignsByClient.has(key)) campaignsByClient.set(key, []);
      campaignsByClient.get(key)!.push(camp);
    }

    /* ── 3. Info dos clientes (nome + segmento) ──────────────────── */
    const clientIds = metricsQuery.rows
      .map(r => r.client_id)
      .filter((id): id is string => id !== null);

    let clientInfoMap = new Map<string, {
      nome: string;
      segment_id: string | null;
      segment_name: string | null;
      segment_slug: string | null;
      logo_url: string | null;
      cpl_ideal: string | null;
      cpl_critical: string | null;
      ctr_min: string | null;
    }>();

    if (clientIds.length > 0) {
      const clientQuery = await pool.query<{
        uuid: string;
        nome: string;
        segment_id: string | null;
        segment_name: string | null;
        segment_slug: string | null;
        logo_url: string | null;
        cpl_ideal: string | null;
        cpl_critical: string | null;
        ctr_min: string | null;
      }>(`
        SELECT
          c.uuid,
          c.nome,
          c.segment_id,
          s.name         AS segment_name,
          s.slug         AS segment_slug,
          c.logo_url,
          s.cpl_ideal,
          s.cpl_critical,
          s.ctr_min
        FROM public.clientes c
        LEFT JOIN public.system_segments s ON s.id = c.segment_id
        WHERE c.uuid = ANY($1::uuid[])
          AND c.tenant_id = $2::uuid
      `, [clientIds, payload.tenantId]);

      for (const row of clientQuery.rows) {
        clientInfoMap.set(row.uuid, row);
      }
    }

    /* ── 4. Tenant info (nome + segmento para campanhas próprias) ── */
    const tenantRow = await pool.query<{
      nome: string;
      segment_id: string | null;
      segment_name: string | null;
      segment_slug: string | null;
      logo_url: string | null;
      cpl_ideal: string | null;
      cpl_critical: string | null;
      ctr_min: string | null;
    }>(`
      SELECT
        t.name         AS nome,
        t.segment_id,
        s.name         AS segment_name,
        s.slug         AS segment_slug,
        t.logo_url,
        s.cpl_ideal,
        s.cpl_critical,
        s.ctr_min
      FROM public.tenants t
      LEFT JOIN public.system_segments s ON s.id = t.segment_id
      WHERE t.id = $1::uuid
    `, [payload.tenantId]);
    const tenantInfo = tenantRow.rows[0];

    /* ── 5. Benchmarks lidos diretamente de system_segments (JOIN acima) ── */
    // Não é mais necessária uma query separada a system_benchmarks para
    // cpl_ideal / cpl_critical / ctr_min — as colunas foram migradas para
    // system_segments em 2026-06-04.

    /* ── 6. Montar resposta ──────────────────────────────────────── */
    const clients: PortfolioClient[] = [];

    for (const row of metricsQuery.rows) {
      const mapKey   = row.client_id ?? '__own__';
      const info     = row.client_id ? clientInfoMap.get(row.client_id) : null;
      const segId    = info?.segment_id ?? tenantInfo?.segment_id ?? null;
      // Benchmarks lidos diretamente das colunas de system_segments
      const benchmarks = {
        cplIdeal:    parseNullable(info?.cpl_ideal    ?? tenantInfo?.cpl_ideal),
        cplCritical: parseNullable(info?.cpl_critical ?? tenantInfo?.cpl_critical),
        ctrMin:      parseNullable(info?.ctr_min      ?? tenantInfo?.ctr_min),
      };

      const spend       = parseFloat(row.total_spend);
      const impressions = parseInt(row.total_impressions);
      const clicks      = parseInt(row.total_clicks);
      const leads       = leadsMap.get(mapKey) ?? 0;
      const cpl         = leads > 0 ? spend / leads : null;
      const ctr         = impressions > 0 ? (clicks / impressions) * 100 : null;

      // Filtrar por segmento se solicitado
      if (segmentId && segId !== segmentId) continue;

      clients.push({
        clientId:   row.client_id,
        clientName: row.client_id
          ? (info?.nome ?? 'Cliente')
          : (tenantInfo?.nome ?? 'Minha Empresa'),
        segment: segId && (info?.segment_name ?? tenantInfo?.segment_name)
          ? {
              id:   segId,
              name: (info?.segment_name ?? tenantInfo?.segment_name) as string,
              slug: (info?.segment_slug ?? tenantInfo?.segment_slug) as string,
            }
          : null,
        metrics: { spend, leads, cpl, ctr, impressions, clicks, campaigns: parseInt(row.campaign_count) },
        benchmarks,
        status:    computeStatus(cpl, benchmarks.cplIdeal, benchmarks.cplCritical, spend),
        campaigns: campaignsByClient.get(mapKey) ?? [],
        logoUrl:   row.client_id
          ? (info?.logo_url ?? null)
          : (tenantInfo?.logo_url ?? null),
      });
    }

    // Ordena: crítico → atenção → saudável → sem dados; depois por spend desc
    const ORDER = { critical: 0, warn: 1, ok: 2, nodata: 3 };
    clients.sort((a, b) =>
      (ORDER[a.status] - ORDER[b.status]) || (b.metrics.spend - a.metrics.spend)
    );

    const totalSpend = clients.reduce((s, c) => s + c.metrics.spend, 0);
    const totalLeads = clients.reduce((s, c) => s + c.metrics.leads, 0);
    const avgCpl     = totalLeads > 0 ? totalSpend / totalLeads : null;

    const result: PortfolioResponse = {
      period,
      totalClients: clients.filter(c => c.clientId !== null).length,
      totalSpend,
      totalLeads,
      avgCpl,
      clients,
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('GET /portfolio error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
