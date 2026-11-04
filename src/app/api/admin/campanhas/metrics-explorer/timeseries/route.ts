import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/marketing/prisma';
import pool from '@/lib/database/connection';
import { getTokenPayload } from '@/lib/auth/jwt-node';

/**
 * Catálogo de Métricas Dinâmico — série diária por campanha, pro gráfico de 1 coluna do
 * Explorador de Métricas (Fase 3.1). Nunca recebe o segmento como entrada — os `campaignIds`
 * vêm do próprio frontend (as linhas já filtradas/visíveis na tabela), e aqui só confirmamos
 * que todas pertencem mesmo ao tenant autenticado antes de ler qualquer dado.
 *
 * GET /metrics-explorer/timeseries?campaignIds=a,b,c&metricKey=X&source=fixed|custom
 *   &startDate=Y&endDate=Z
 *
 * Campos derivados (ctr/cpc/cpm) são recalculados por DIA como soma-dividida-por-soma daquele
 * dia (não existe "fan-out" aqui — é 1 linha de Insight por campanha-dia, então a soma do dia é
 * o próprio valor) — nunca lê a coluna `ctr`/`cpc`/`cpm` já persistida, pelo mesmo motivo que a
 * agregação por período do endpoint principal não lê: o valor gravado pela Meta pro cliques/
 * impressões já são "crus" e confiáveis, derivar aqui é só reaplicar a mesma fórmula por dia.
 */
export const dynamic = 'force-dynamic';

// Colunas fixas que já são "soma do dia" por natureza (1 linha = 1 dia) — lidas direto.
const RAW_FIXED_FIELDS = new Set([
  'impressions', 'reach', 'clicks', 'spend', 'conversions', 'engagement',
  'video_views_3s', 'video_views_15s', 'video_views_25_pct', 'video_views_50_pct',
  'video_views_75_pct', 'video_views_100_pct', 'thruplay_views', 'conversions_value',
  'search_impression_share', 'search_budget_lost_is', 'search_rank_lost_is',
]);

// Derivados por dia a partir de colunas cruas do mesmo dia — nunca de uma coluna já persistida.
const DERIVED_FIXED_FIELDS = new Set(['ctr', 'cpc', 'cpm']);

export async function GET(request: NextRequest) {
  try {
    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    const tenantId = payload.tenantId;

    const { searchParams } = new URL(request.url);
    const campaignIdsRaw = searchParams.get('campaignIds');
    const metricKey = searchParams.get('metricKey');
    const source = searchParams.get('source');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!campaignIdsRaw || !metricKey || (source !== 'fixed' && source !== 'custom') || !startDate || !endDate) {
      return NextResponse.json({ error: 'campaignIds, metricKey, source e o período são obrigatórios' }, { status: 400 });
    }
    const campaignIds = campaignIdsRaw.split(',').filter(Boolean);
    if (campaignIds.length === 0) {
      return NextResponse.json({ series: [] });
    }

    // Defesa: só aceita campanhas que de fato pertencem ao tenant autenticado — nunca confia em
    // IDs vindos do client pra decidir escopo sozinho.
    const campaigns = await prisma.campaign.findMany({
      where: { id: { in: campaignIds }, tenantId },
      select: { id: true, name: true },
    });
    if (campaigns.length === 0) {
      return NextResponse.json({ series: [] });
    }
    const ownedIds = campaigns.map((c) => c.id);
    const nameById = new Map(campaigns.map((c) => [c.id, c.name]));

    let valueExpr: string;
    if (source === 'fixed') {
      if (RAW_FIXED_FIELDS.has(metricKey)) {
        valueExpr = metricKey;
      } else if (metricKey === 'ctr') {
        valueExpr = `CASE WHEN impressions > 0 THEN (clicks::numeric / impressions * 100) ELSE NULL END`;
      } else if (metricKey === 'cpc') {
        valueExpr = `CASE WHEN clicks > 0 THEN (spend::numeric / clicks) ELSE NULL END`;
      } else if (metricKey === 'cpm') {
        valueExpr = `CASE WHEN impressions > 0 THEN (spend::numeric / impressions * 1000) ELSE NULL END`;
      } else {
        // Campos de classificação (quality_ranking etc.) são enum em texto, não numéricos —
        // não há série pra plotar; o botão de gráfico nunca deveria chegar aqui (desabilitado
        // no front pra métricas unit='score'), mas a rota nunca confia só nisso.
        return NextResponse.json({ error: 'Esta métrica não tem série numérica pra gráfico' }, { status: 400 });
      }
    } else {
      // custom — valida o nome do metricKey antes de interpolar na query (nunca um fragmento
      // de SQL disfarçado de metricKey; mesma defesa já usada em outras partes do catálogo).
      if (!/^[a-z0-9_]+$/i.test(metricKey)) {
        return NextResponse.json({ error: 'metricKey inválido' }, { status: 400 });
      }
      valueExpr = `(custom_metrics->>'${metricKey}')::numeric`;
    }

    // `to_char` (não `date::date`) de propósito: o driver `pg` converte uma coluna `date` crua
    // de volta pra objeto `Date` do JS, e `NextResponse.json` serializa isso como ISO completo
    // ("2026-10-06T03:00:00.000Z", deslocado pelo timezone do processo) — o mesmo tipo de bug de
    // timezone já documentado várias vezes neste projeto, só que no sentido driver→resposta em
    // vez de parâmetro→driver. `to_char` devolve TEXT puro, sem conversão nenhuma no meio.
    const { rows } = await pool.query<{ campaign_id: string; day: string; value: string | null }>(
      `SELECT "campaignId" AS campaign_id, to_char(date, 'YYYY-MM-DD') AS day, (${valueExpr}) AS value
         FROM campanhasmarketingdigital."Insight"
        WHERE "campaignId" = ANY($1::text[]) AND date >= $2::timestamptz AND date <= $3::timestamptz
        ORDER BY date ASC`,
      [ownedIds, startDate, endDate],
    );

    const series = rows.map((r) => ({
      date: r.day,
      campaignId: r.campaign_id,
      campaignName: nameById.get(r.campaign_id) ?? r.campaign_id,
      value: r.value != null ? Number(Number(r.value).toFixed(2)) : null,
    }));

    return NextResponse.json({ series });
  } catch (error: any) {
    console.error('GET /metrics-explorer/timeseries error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao carregar a série da métrica' }, { status: 500 });
  }
}
