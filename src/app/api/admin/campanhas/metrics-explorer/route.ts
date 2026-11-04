import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/marketing/prisma';
import pool from '@/lib/database/connection';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { resolveSegment } from '@/lib/intelligence/segmentResolver';
import { resolveCampaignIdsBySegment } from '@/lib/marketing/segmentUtils';
import { getSegmentMetrics, type SegmentMetric } from '@/lib/marketing/services/segmentMetricCatalogService';

/**
 * Catálogo de Métricas Dinâmico — Fase 3 (Explorador de Métricas).
 *
 * GET /api/admin/campanhas/metrics-explorer?clientId=own|<uuid>&startDate=X&endDate=Y
 *
 * Resolve o segmento efetivo (cliente > tenant, mesma cascata de sempre), busca as campanhas
 * desse escopo e devolve uma linha por campanha com TODAS as colunas fixas de `Insight` já
 * agregadas no período + o resultado agregado de cada métrica curada em
 * `segment_metric_catalog` (Fase 1/2) — nunca um clone da Insights API inteira da Meta, só o
 * que a própria plataforma já tem (fixo) + o que o Master curou (custom).
 *
 * Regra de agregação (nunca soma cega — média de taxa diária distorce quando o volume varia):
 *   - contagens/valores (spend, impressions, clicks, conversions, custom_metrics de unidade
 *     count/currency sem prefixo cost_per_) → SOMA no período
 *   - taxas/scores (unit percent/ratio/score, ou campo com prefixo cost_per_) → MÉDIA dos dias
 *     com dado real (AVG já ignora NULL; search_impression_share/search_budget_lost_is/
 *     search_rank_lost_is tratam 0 como "sem dado" via NULLIF — campanhas não-Google sempre
 *     gravam 0 nesses campos, somar/mediar incluindo-as distorceria pra quem é só Meta)
 *   - CTR/CPC/CPM fixos → recalculados como soma-dividida-por-soma (clicks/impressions etc.),
 *     nunca média dos valores diários já computados — mesmo cuidado já aplicado em outras partes
 *     do módulo pra evitar o "CPL inflado por fan-out" documentado no histórico do projeto
 *   - classificações/diagnóstico (quality_ranking etc.) → valor do dia mais recente do período
 *     (são snapshot, não quantidade — não faz sentido somar nem mediar)
 */
export const dynamic = 'force-dynamic';

interface ExplorerCampaignRow {
  campaignId: string;
  campaignName: string;
  clientId: string | null;
  clientName: string | null;
  fixed: Record<string, number | string | null>;
  custom: Record<string, number | null>;
  daysWithData: number;
}

const FIXED_SUM_COLUMNS = [
  'impressions', 'reach', 'clicks', 'spend', 'conversions', 'engagement',
  'video_views_3s', 'video_views_15s', 'video_views_25_pct', 'video_views_50_pct',
  'video_views_75_pct', 'video_views_100_pct', 'thruplay_views', 'conversions_value',
];

export async function GET(request: NextRequest) {
  try {
    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    const tenantId = payload.tenantId;

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId') || undefined;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'startDate e endDate são obrigatórios' }, { status: 400 });
    }

    // resolveSegment já trata 'own'/'segment' como sentinelas de UI (nunca um client uuid real)
    // — passa o valor cru.
    const segment = await resolveSegment(tenantId, clientId ?? null);
    if (!segment) {
      return NextResponse.json({ error: 'Não foi possível resolver o segmento do tenant' }, { status: 404 });
    }

    // resolveCampaignIdsBySegment só conhece 'own' como sentinela — 'segment' (todos os
    // clientes do segmento) precisa virar "sem filtro" aqui, senão tentaria
    // `client_id = 'segment'::uuid` e quebraria.
    const campaignClientFilter = clientId === 'segment' ? undefined : clientId;
    const campaignIds = await resolveCampaignIdsBySegment(tenantId, segment.id, campaignClientFilter);
    const catalog: SegmentMetric[] = await getSegmentMetrics(segment.id);

    if (campaignIds.length === 0) {
      return NextResponse.json({
        segment: { id: segment.id, name: segment.name },
        catalog,
        rows: [] as ExplorerCampaignRow[],
      });
    }

    // Campanhas + nome do cliente (quando houver) — join leve, só pras que entraram no escopo.
    const campaigns = await prisma.campaign.findMany({
      where: { id: { in: campaignIds } },
      select: { id: true, name: true, clientId: true },
    });
    const clientIds = Array.from(new Set(campaigns.map((c) => c.clientId).filter((v): v is string => !!v)));
    const clientNameById = new Map<string, string>();
    if (clientIds.length > 0) {
      const { rows } = await pool.query<{ uuid: string; nome: string }>(
        `SELECT uuid, nome FROM public.clientes WHERE uuid = ANY($1::uuid[])`,
        [clientIds],
      );
      for (const r of rows) clientNameById.set(r.uuid, r.nome);
    }

    // Métricas curadas: separa SOMA vs MÉDIA pela mesma regra documentada acima — decidido pelo
    // `unit` (nunca pelo nome da métrica, mesmo espírito de zero-hardcode do resto do catálogo).
    const avgCustom = catalog.filter(
      (m) => m.unit === 'percent' || m.unit === 'ratio' || m.unit === 'score' || m.metaField.startsWith('cost_per_'),
    );
    const sumCustom = catalog.filter((m) => !avgCustom.includes(m));

    const customSelectSql = [
      ...sumCustom.map((m) => `SUM((custom_metrics->>'${m.metricKey}')::numeric) AS "custom_${m.metricKey}"`),
      ...avgCustom.map((m) => `AVG((custom_metrics->>'${m.metricKey}')::numeric) AS "custom_${m.metricKey}"`),
    ].join(', ');

    const fixedSumSql = FIXED_SUM_COLUMNS.map((c) => `SUM(${c}) AS ${c}`).join(', ');

    const { rows: aggRows } = await pool.query(
      `SELECT
         campaign_id,
         COUNT(*) AS days_with_data,
         ${fixedSumSql},
         AVG(NULLIF(search_impression_share, 0)) AS search_impression_share,
         AVG(NULLIF(search_budget_lost_is, 0)) AS search_budget_lost_is,
         AVG(NULLIF(search_rank_lost_is, 0)) AS search_rank_lost_is,
         (array_agg(quality_ranking ORDER BY date DESC))[1] AS quality_ranking,
         (array_agg(engagement_rate_ranking ORDER BY date DESC))[1] AS engagement_rate_ranking,
         (array_agg(conversion_rate_ranking ORDER BY date DESC))[1] AS conversion_rate_ranking,
         (array_agg(learning_status ORDER BY date DESC))[1] AS learning_status
         ${customSelectSql ? ', ' + customSelectSql : ''}
       FROM campanhasmarketingdigital."Insight"
       WHERE campaign_id = ANY($1::text[]) AND date >= $2::timestamptz AND date <= $3::timestamptz
       GROUP BY campaign_id`,
      [campaignIds, startDate, endDate],
    );

    const aggByCampaign = new Map<string, any>(aggRows.map((r: any) => [r.campaign_id, r]));

    const rows: ExplorerCampaignRow[] = campaigns.map((c) => {
      const agg = aggByCampaign.get(c.id);
      const impressions = Number(agg?.impressions || 0);
      const clicks = Number(agg?.clicks || 0);
      const spend = Number(agg?.spend || 0);

      const fixed: Record<string, number | string | null> = {
        impressions, reach: Number(agg?.reach || 0), clicks, spend,
        conversions: Number(agg?.conversions || 0), engagement: Number(agg?.engagement || 0),
        video_views_3s: Number(agg?.video_views_3s || 0), video_views_15s: Number(agg?.video_views_15s || 0),
        video_views_25_pct: Number(agg?.video_views_25_pct || 0), video_views_50_pct: Number(agg?.video_views_50_pct || 0),
        video_views_75_pct: Number(agg?.video_views_75_pct || 0), video_views_100_pct: Number(agg?.video_views_100_pct || 0),
        thruplay_views: Number(agg?.thruplay_views || 0), conversions_value: Number(agg?.conversions_value || 0),
        // Soma-dividida-por-soma — nunca média dos valores diários já calculados.
        ctr: impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : null,
        cpc: clicks > 0 ? Number((spend / clicks).toFixed(2)) : null,
        cpm: impressions > 0 ? Number(((spend / impressions) * 1000).toFixed(2)) : null,
        search_impression_share: agg?.search_impression_share != null ? Number(Number(agg.search_impression_share).toFixed(2)) : null,
        search_budget_lost_is: agg?.search_budget_lost_is != null ? Number(Number(agg.search_budget_lost_is).toFixed(2)) : null,
        search_rank_lost_is: agg?.search_rank_lost_is != null ? Number(Number(agg.search_rank_lost_is).toFixed(2)) : null,
        quality_ranking: agg?.quality_ranking ?? null,
        engagement_rate_ranking: agg?.engagement_rate_ranking ?? null,
        conversion_rate_ranking: agg?.conversion_rate_ranking ?? null,
        learning_status: agg?.learning_status ?? null,
      };

      const custom: Record<string, number | null> = {};
      for (const m of catalog) {
        const v = agg?.[`custom_${m.metricKey}`];
        custom[m.metricKey] = v != null ? Number(Number(v).toFixed(2)) : null;
      }

      return {
        campaignId: c.id,
        campaignName: c.name,
        clientId: c.clientId,
        clientName: c.clientId ? clientNameById.get(c.clientId) ?? null : null,
        fixed,
        custom,
        daysWithData: Number(agg?.days_with_data || 0),
      };
    });

    return NextResponse.json({
      segment: { id: segment.id, name: segment.name },
      catalog,
      rows,
    });
  } catch (error: any) {
    console.error('GET /metrics-explorer error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao carregar o explorador de métricas' }, { status: 500 });
  }
}
