import { NextRequest, NextResponse } from 'next/server';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import pool from '@/lib/database/connection';

export const dynamic = 'force-dynamic';

// Mapeamento objetivo → estágio (mesmo usado no backfill SQL)
function objectiveToStage(objective: string): string {
  if (['OUTCOME_AWARENESS', 'OUTCOME_TRAFFIC', 'OUTCOME_REACH'].includes(objective)) return 'TOF';
  if (['OUTCOME_ENGAGEMENT'].includes(objective)) return 'MOF';
  if (['OUTCOME_LEADS', 'OUTCOME_SALES', 'OUTCOME_APP_PROMOTION', 'OUTCOME_CONVERSIONS'].includes(objective)) return 'BOF';
  return 'TOF';
}

// GET /api/admin/campanhas/dashboard/funnel
export async function GET(request: NextRequest) {
  try {
    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startStr = searchParams.get('startDate');
    const endStr   = searchParams.get('endDate');
    const clientId = searchParams.get('clientId');

    const endDate   = endStr   ? new Date(endStr)   : new Date();
    const startDate = startStr ? new Date(startStr) : new Date(endDate.getTime() - 30 * 86400000);

    // Filtro de cliente
    const clientFilter = clientId && clientId !== 'own'
      ? `AND c."client_id" = '${clientId}'::uuid`
      : clientId === 'own'
        ? `AND c."client_id" IS NULL`
        : '';

    // ── Métricas por estágio de funil ──────────────────────────────────────────
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
        )                                   AS stage,
        COUNT(DISTINCT c.id)::int           AS campaigns_count,
        COALESCE(SUM(i.spend), 0)::float    AS total_spend,
        COALESCE(SUM(i.impressions), 0)::int AS total_impressions,
        COALESCE(SUM(i.clicks), 0)::int     AS total_clicks,
        COALESCE(SUM(i.conversions), 0)::int AS total_conversions
      FROM campanhasmarketingdigital."Campaign" c
      LEFT JOIN campanhasmarketingdigital."Insight" i
        ON i."campaignId" = c.id
        AND i.date >= $2::timestamp
        AND i.date <= $3::timestamp
      WHERE c.tenant_id = $1::uuid
        ${clientFilter}
      GROUP BY 1
    `, [payload.tenantId, startDate, endDate]);

    // ── Leads por estágio ──────────────────────────────────────────────────────
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
        ${clientFilter.replace(/c\."client_id"/g, 'c."client_id"')}
      GROUP BY 1
    `, [payload.tenantId, startDate, endDate]);

    const leadsMap: Record<string, number> = {};
    for (const row of leadsRaw.rows) {
      leadsMap[row.stage] = row.total_leads;
    }

    // ── Montar estágios ────────────────────────────────────────────────────────
    const STAGE_LABELS: Record<string, string> = {
      TOF: 'Topo do Funil',
      MOF: 'Meio do Funil',
      BOF: 'Fundo do Funil',
    };

    const STAGE_ICONS: Record<string, string> = {
      TOF: '📢',
      MOF: '🎯',
      BOF: '💰',
    };

    const stagesMap: Record<string, any> = {};
    for (const row of stageMetricsRaw.rows) {
      stagesMap[row.stage] = {
        code:             row.stage,
        label:            STAGE_LABELS[row.stage] ?? row.stage,
        icon:             STAGE_ICONS[row.stage] ?? '📊',
        campaigns_count:  row.campaigns_count,
        spend:            Number(row.total_spend),
        impressions:      row.total_impressions,
        clicks:           row.total_clicks,
        leads:            leadsMap[row.stage] ?? 0,
        conversions:      row.total_conversions,
      };
    }

    // Garante TOF/MOF/BOF sempre presentes (mesmo que vazios)
    for (const code of ['TOF', 'MOF', 'BOF']) {
      if (!stagesMap[code]) {
        stagesMap[code] = {
          code, label: STAGE_LABELS[code], icon: STAGE_ICONS[code],
          campaigns_count: 0, spend: 0, impressions: 0, clicks: 0, leads: 0, conversions: 0,
        };
      }
    }

    const stages = ['TOF', 'MOF', 'BOF'].map(c => stagesMap[c]);

    // ── Taxas de conversão entre estágios ─────────────────────────────────────
    const tof = stagesMap['TOF'];
    const mof = stagesMap['MOF'];
    const bof = stagesMap['BOF'];

    // TOF→MOF: cliques totais / impressões totais (CTR geral do topo)
    // MOF→BOF: leads / cliques (conversão para lead)
    // Global: CPL, CPM calculados

    const totalImpressions = tof.impressions + mof.impressions + bof.impressions;
    const totalClicks       = tof.clicks      + mof.clicks      + bof.clicks;
    const totalLeads        = tof.leads       + mof.leads       + bof.leads;
    const totalSpend        = tof.spend       + mof.spend       + bof.spend;
    const totalConversions  = tof.conversions + mof.conversions + bof.conversions;

    const ctr_tof  = tof.impressions > 0  ? ((tof.clicks      / tof.impressions) * 100)  : 0;
    const ltr_mof  = mof.clicks > 0       ? ((mof.leads       / mof.clicks)      * 100)  : 0;
    const cvr_bof  = bof.leads > 0        ? ((bof.conversions / bof.leads)       * 100)  : 0;
    const ctr_all  = totalImpressions > 0 ? ((totalClicks / totalImpressions)    * 100)  : 0;
    const ltr_all  = totalClicks > 0      ? ((totalLeads  / totalClicks)         * 100)  : 0;
    const cpl_all  = totalLeads > 0       ? (totalSpend / totalLeads)                    : 0;

    const conversionRates = {
      tof_ctr:  Number(ctr_tof.toFixed(2)),   // CTR do topo
      mof_ltr:  Number(ltr_mof.toFixed(2)),   // Lead-through-rate do meio
      bof_cvr:  Number(cvr_bof.toFixed(2)),   // Conversion rate do fundo
      overall_ctr: Number(ctr_all.toFixed(2)),
      overall_ltr: Number(ltr_all.toFixed(2)),
      overall_cpl: Number(cpl_all.toFixed(2)),
    };

    // ── Identificar gargalo ────────────────────────────────────────────────────
    // Estágio com maior proporção do budget mas menor conversão relativa
    let bottleneck: string | null = null;
    if (totalSpend > 0) {
      const tofShare = tof.spend / totalSpend;
      const mofShare = mof.spend / totalSpend;
      const bofShare = bof.spend / totalSpend;
      // Gargalo = onde o share do budget é alto mas a conversão ao próximo passo é baixa
      if (tofShare > 0.5 && ctr_tof < 1.0)      bottleneck = 'TOF';
      else if (mofShare > 0.3 && ltr_mof < 2.0) bottleneck = 'MOF';
      else if (bofShare > 0.2 && cvr_bof < 5.0) bottleneck = 'BOF';
    }

    return NextResponse.json({
      stages,
      conversionRates,
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
