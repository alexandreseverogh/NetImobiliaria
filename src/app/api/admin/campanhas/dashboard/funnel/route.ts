import { NextRequest, NextResponse } from 'next/server';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import pool from '@/lib/database/connection';

export const dynamic = 'force-dynamic';

// GET /api/admin/campanhas/dashboard/funnel
export async function GET(request: NextRequest) {
  try {
    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startStr       = searchParams.get('startDate');
    const endStr         = searchParams.get('endDate');
    const clientId       = searchParams.get('clientId');
    const campaignId     = searchParams.get('campaignId');
    const objectiveFilter = searchParams.get('objectiveFilter');
    const statusFilter   = searchParams.get('statusFilter');
    const adSetId        = searchParams.get('adSetId');

    const endDate   = endStr   ? new Date(endStr)   : new Date();
    const startDate = startStr ? new Date(startStr) : new Date(endDate.getTime() - 30 * 86400000);

    // ── Construir condições dinâmicas com parâmetros seguros ──────────────────
    const qParams: any[] = [payload.tenantId, startDate, endDate];
    const extraWhere: string[] = [];
    let pi = 4;

    if (clientId && clientId !== 'own') {
      extraWhere.push(`AND c."client_id" = $${pi++}::uuid`);
      qParams.push(clientId);
    } else if (clientId === 'own') {
      extraWhere.push(`AND c."client_id" IS NULL`);
    }
    if (campaignId) {
      extraWhere.push(`AND c.id = $${pi++}`);
      qParams.push(campaignId);
    }
    if (objectiveFilter) {
      extraWhere.push(`AND c.objective = $${pi++}`);
      qParams.push(objectiveFilter);
    }
    if (statusFilter) {
      extraWhere.push(`AND c.status = $${pi++}`);
      qParams.push(statusFilter);
    }
    if (adSetId) {
      extraWhere.push(
        `AND EXISTS (SELECT 1 FROM campanhasmarketingdigital."AdSet" ads WHERE ads."campaignId" = c.id AND ads.id = $${pi++})`
      );
      qParams.push(adSetId);
    }

    const whereExtra = extraWhere.join(' ');

    // ── Métricas por estágio de funil ─────────────────────────────────────────
    const stageMetricsRaw = await pool.query(`
      SELECT
        COALESCE(c.funnel_stage,
          CASE
            WHEN c.objective IN ('OUTCOME_AWARENESS','OUTCOME_TRAFFIC','OUTCOME_REACH') THEN 'TOF'
            WHEN c.objective IN ('OUTCOME_ENGAGEMENT')                                  THEN 'MOF'
            WHEN c.objective IN ('OUTCOME_LEADS','OUTCOME_SALES',
                                 'OUTCOME_APP_PROMOTION','OUTCOME_CONVERSIONS')         THEN 'BOF'
            ELSE 'TOF'
          END
        )                                    AS stage,
        COUNT(DISTINCT c.id)::int            AS campaigns_count,
        COALESCE(SUM(i.spend), 0)::float     AS total_spend,
        COALESCE(SUM(i.impressions), 0)::int AS total_impressions,
        COALESCE(SUM(i.clicks), 0)::int      AS total_clicks,
        COALESCE(SUM(i.conversions), 0)::int AS total_conversions
      FROM campanhasmarketingdigital."Campaign" c
      LEFT JOIN campanhasmarketingdigital."Insight" i
        ON i."campaignId" = c.id
        AND i.date >= $2::timestamp
        AND i.date <= $3::timestamp
      WHERE c.tenant_id = $1::uuid
        ${whereExtra}
      GROUP BY 1
    `, qParams);

    // ── Leads por estágio ─────────────────────────────────────────────────────
    // Reusa os mesmos qParams mas troca as posições dos date params ($2/$3) → leads usa clickedAt
    const leadsRaw = await pool.query(`
      SELECT
        COALESCE(c.funnel_stage,
          CASE
            WHEN c.objective IN ('OUTCOME_AWARENESS','OUTCOME_TRAFFIC','OUTCOME_REACH') THEN 'TOF'
            WHEN c.objective IN ('OUTCOME_ENGAGEMENT')                                  THEN 'MOF'
            ELSE 'BOF'
          END
        ) AS stage,
        COUNT(*)::int AS total_leads
      FROM campanhasmarketingdigital."Lead" l
      JOIN campanhasmarketingdigital."Campaign" c ON c.id = l."campaignId"
      WHERE c.tenant_id = $1::uuid
        AND l."clickedAt" >= $2::timestamp
        AND l."clickedAt" <= $3::timestamp
        ${whereExtra}
      GROUP BY 1
    `, qParams);

    const leadsMap: Record<string, number> = {};
    for (const row of leadsRaw.rows) {
      leadsMap[row.stage] = row.total_leads;
    }

    // ── Montar estágios ───────────────────────────────────────────────────────
    const STAGE_LABELS: Record<string, string> = { TOF: 'Topo do Funil', MOF: 'Meio do Funil', BOF: 'Fundo do Funil' };
    const STAGE_ICONS:  Record<string, string> = { TOF: '📢',             MOF: '🎯',             BOF: '💰'            };

    const stagesMap: Record<string, any> = {};
    for (const row of stageMetricsRaw.rows) {
      stagesMap[row.stage] = {
        code:            row.stage,
        label:           STAGE_LABELS[row.stage] ?? row.stage,
        icon:            STAGE_ICONS[row.stage]  ?? '📊',
        campaigns_count: row.campaigns_count,
        spend:           Number(row.total_spend),
        impressions:     row.total_impressions,
        clicks:          row.total_clicks,
        leads:           leadsMap[row.stage] ?? 0,
        conversions:     row.total_conversions,
      };
    }

    for (const code of ['TOF', 'MOF', 'BOF']) {
      if (!stagesMap[code]) {
        stagesMap[code] = {
          code, label: STAGE_LABELS[code], icon: STAGE_ICONS[code],
          campaigns_count: 0, spend: 0, impressions: 0, clicks: 0, leads: 0, conversions: 0,
        };
      }
    }

    const stages = ['TOF', 'MOF', 'BOF'].map(c => stagesMap[c]);

    // ── Taxas de conversão ────────────────────────────────────────────────────
    const tof = stagesMap['TOF'];
    const mof = stagesMap['MOF'];
    const bof = stagesMap['BOF'];

    const totalImpressions = tof.impressions + mof.impressions + bof.impressions;
    const totalClicks      = tof.clicks      + mof.clicks      + bof.clicks;
    const totalLeads       = tof.leads       + mof.leads       + bof.leads;
    const totalSpend       = tof.spend       + mof.spend       + bof.spend;
    const totalConversions = tof.conversions + mof.conversions + bof.conversions;

    const ctr_tof  = tof.impressions > 0  ? ((tof.clicks      / tof.impressions) * 100) : 0;
    const ltr_mof  = mof.clicks > 0       ? ((mof.leads       / mof.clicks)      * 100) : 0;
    const cvr_bof  = bof.leads > 0        ? ((bof.conversions / bof.leads)       * 100) : 0;
    const ctr_all  = totalImpressions > 0 ? ((totalClicks     / totalImpressions) * 100) : 0;
    const ltr_all  = totalClicks > 0      ? ((totalLeads      / totalClicks)      * 100) : 0;
    const cpl_all  = totalLeads > 0       ? (totalSpend / totalLeads)                    : 0;

    const conversionRates = {
      tof_ctr:     Number(ctr_tof.toFixed(2)),
      mof_ltr:     Number(ltr_mof.toFixed(2)),
      bof_cvr:     Number(cvr_bof.toFixed(2)),
      overall_ctr: Number(ctr_all.toFixed(2)),
      overall_ltr: Number(ltr_all.toFixed(2)),
      overall_cpl: Number(cpl_all.toFixed(2)),
    };

    // ── Gargalo ───────────────────────────────────────────────────────────────
    let bottleneck: string | null = null;
    if (totalSpend > 0) {
      const tofShare = tof.spend / totalSpend;
      const mofShare = mof.spend / totalSpend;
      const bofShare = bof.spend / totalSpend;
      if      (tofShare > 0.5 && ctr_tof < 1.0) bottleneck = 'TOF';
      else if (mofShare > 0.3 && ltr_mof < 2.0) bottleneck = 'MOF';
      else if (bofShare > 0.2 && cvr_bof < 5.0) bottleneck = 'BOF';
    }

    return NextResponse.json({
      stages, conversionRates,
      totals: {
        spend:       Number(totalSpend.toFixed(2)),
        impressions: totalImpressions,
        clicks:      totalClicks,
        leads:       totalLeads,
        conversions: totalConversions,
        cpl:         Number(cpl_all.toFixed(2)),
      },
      bottleneck,
      period: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
    });
  } catch (error: any) {
    console.error('GET /dashboard/funnel error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao buscar dados do funil' }, { status: 500 });
  }
}
