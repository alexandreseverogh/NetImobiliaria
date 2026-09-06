/**
 * FASE 14b — Calibração de Ângulo
 * Agrega métricas de performance (CPL, CTR, spend) por ângulo EFETIVO de comunicação.
 *
 * Ângulo efetivo = Campaign.declared_angle ?? ângulo inferido pelo Vision (CreativeAnalysis.angle)
 * Fonte única de taxonomia: src/lib/marketing/angles.ts
 */

import pool from '@/lib/database/connection';
import { angleLabel } from '../angles';
import { resolveBenchmark } from '@/lib/intelligence/benchmarkResolver';
import { hasCrmModule } from './revenueAttributionService';

// ─── Tipos ──────────────────────────────────────────────────────────────────

export interface AngleStat {
  angle: string;        // CommunicationAngle | 'unknown'
  label: string;
  campaigns: number;
  spend: number;
  clicks: number;
  impressions: number;
  conversions: number;
  cpl: number | null;   // spend / conversions (null se sem conversões)
  ctr: number;          // clicks / impressions * 100 (%)
  // Tier 2 do plano "Loop do ICP" (2026-09-04) — qualidade de lead por ângulo, não só
  // volume/CPL. Sempre null quando o segmento/tenant não tem score_fit real (crm_ia_ativa
  // desligada, ou nenhum lead do ângulo ainda foi qualificado) — nunca inventa média.
  avgFit: number | null;
  leadsWithFit: number;  // quantos leads reais entraram na média — dá confiança ao número
  // Tier 3 do plano "Loop do ICP" — a outra metade do gap: taxa de fechamento REAL por
  // ângulo (não só fit médio, que é uma proxy). Sempre null sem CRM contratado (crmAvailable
  // em AngleInsightsResult já sinaliza isso pra quem consome).
  dealsWon: number;
  closeRate: number | null;  // dealsWon / leadsIdentified (do cohort de marketing_eventos), 0-100
}

export interface AngleInsightsResult {
  periodDays: number;
  angleStats: AngleStat[];
  topAngle: AngleStat | null;    // melhor CPL (menor)
  worstAngle: AngleStat | null;  // pior CPL (maior), presente apenas se >=2 ângulos com dados
  textSummary: string;           // bloco de texto para injeção em variável LLM
  /** Tier 3 do plano "Loop do ICP" — dealsWon/closeRate por ângulo exigem CRM contratado
   *  (mesmo gate de hasCrmModule() já usado na Visão 4 e em wastedSpendService). false =
   *  os 2 campos ficam sempre 0/null em todo AngleStat, nunca fabricados. */
  crmAvailable: boolean;
}

// ─── Constante de schema ─────────────────────────────────────────────────────

const S = 'campanhasmarketingdigital';

// ─── Serviço principal ───────────────────────────────────────────────────────

export async function getAngleInsights(
  periodDays: number,
  tenantId?: string,
  clientId?: string,
  segmentId?: string,   // FASE 18.2 — filtra por segmento (campanhas do segmento)
): Promise<AngleInsightsResult> {
  const empty: AngleInsightsResult = {
    periodDays,
    angleStats:  [],
    topAngle:    null,
    worstAngle:  null,
    textSummary: 'Dados de ângulo indisponíveis.',
    crmAvailable: false,
  };

  if (!tenantId) return empty;

  try {
    const params: (string | number)[] = [tenantId, periodDays];
    let clientFilter = '';
    if (clientId === 'own') {
      clientFilter = ' AND c.client_id IS NULL';
    } else if (clientId) {
      params.push(clientId);
      clientFilter = ` AND c.client_id = $${params.length}::uuid`;
    }

    // FASE 18.2 — filtro por segmento (campanha de cliente do segmento, ou própria do tenant cujo segmento bate)
    let segmentFilter = '';
    if (segmentId) {
      params.push(segmentId);
      const p = params.length;
      segmentFilter = ` AND ( cl.segment_id = $${p}::uuid OR (c.client_id IS NULL AND t.segment_id = $${p}::uuid) )`;
    }

    // Junta Campaign → (CreativeAsset → CreativeAnalysis) para obter ângulo Vision,
    // e Campaign → Insight para agregar métricas do período.
    // Ângulo efetivo = declared_angle ?? Vision angle ?? 'unknown'
    const sql = `
      SELECT
        COALESCE(c.declared_angle, latest_vision.angle, 'unknown') AS effective_angle,
        COUNT(DISTINCT c.id)              AS campaigns,
        COALESCE(SUM(i.spend),       0)   AS total_spend,
        COALESCE(SUM(i.clicks),      0)   AS total_clicks,
        COALESCE(SUM(i.impressions), 0)   AS total_impressions,
        COALESCE(SUM(i.conversions), 0)   AS total_conversions
      FROM ${S}."Campaign" c
      LEFT JOIN public.clientes cl ON cl.uuid = c.client_id
      LEFT JOIN public.tenants  t  ON t.id    = c.tenant_id
      -- ângulo Vision mais recente por campanha (fallback quando declared_angle é null)
      LEFT JOIN (
        SELECT DISTINCT ON (ca.campaign_id)
          ca.campaign_id,
          cra.angle
        FROM ${S}."CreativeAsset" ca
        JOIN ${S}."CreativeAnalysis" cra ON cra.asset_id = ca.id
        WHERE cra.angle IS NOT NULL
          AND ca.tenant_id = $1::uuid
        ORDER BY ca.campaign_id, cra.analyzed_at DESC
      ) latest_vision ON latest_vision.campaign_id = c.id
      -- métricas do período
      LEFT JOIN ${S}."Insight" i
        ON i."campaignId" = c.id
        AND i.date >= NOW() - ($2 * INTERVAL '1 day')
      WHERE c.tenant_id = $1::uuid${clientFilter}${segmentFilter}
      GROUP BY effective_angle
      ORDER BY total_spend DESC
    `;

    const { rows } = await pool.query(sql, params);

    // Tier 2 do plano "Loop do ICP" — fit médio por ângulo, ponderado por leads reais.
    // Query separada de propósito (não fundida na principal): a principal já faz
    // JOIN com Insight (1 linha/dia/campanha) — somar junto marketing_eventos/leads_staging
    // (1 linha/lead) causaria fan-out (spend/conversions multiplicados pelo nº de leads),
    // mesma classe de bug já documentada e corrigida em cross-insights nesta base.
    const fitByAngle = await mapAvgFitByAngle(tenantId, periodDays, clientId, segmentId);

    // Tier 3 — taxa de fechamento REAL por ângulo (a outra metade do gap: fit médio é proxy,
    // isto é o resultado de negócio de verdade). Mesmo gate hasCrmModule() da Visão 4/F6.
    const crmAvailable = await hasCrmModule(tenantId);
    const closeByAngle = crmAvailable
      ? await mapCloseRateByAngle(tenantId, periodDays, clientId, segmentId)
      : new Map<string, AngleCloseAgg>();

    const angleStats: AngleStat[] = rows.map(row => {
      const spend       = parseFloat(row.total_spend);
      const clicks      = parseInt(row.total_clicks, 10);
      const impressions = parseInt(row.total_impressions, 10);
      const conversions = parseInt(row.total_conversions, 10);
      const cpl         = conversions > 0 ? spend / conversions : null;
      const ctr         = impressions > 0 ? (clicks / impressions) * 100 : 0;
      const angle       = String(row.effective_angle);
      const fit         = fitByAngle.get(angle);
      const close       = closeByAngle.get(angle);

      return {
        angle,
        label:       angleLabel(angle),
        campaigns:   parseInt(row.campaigns, 10),
        spend,
        clicks,
        impressions,
        conversions,
        cpl,
        ctr,
        avgFit:      fit ? fit.avgFit : null,
        leadsWithFit: fit ? fit.leadsWithFit : 0,
        dealsWon:    close ? close.dealsWon : 0,
        closeRate:   close && close.leadsIdentified > 0 ? (close.dealsWon / close.leadsIdentified) * 100 : null,
      };
    });

    // Vencedor / perdedor por CPL (apenas entre ângulos com conversões registradas)
    const withCpl = angleStats.filter(a => a.cpl !== null);
    const topAngle   = withCpl.length >= 1
      ? withCpl.reduce((best, a) => a.cpl! < best.cpl! ? a : best)
      : null;
    const worstAngle = withCpl.length >= 2
      ? withCpl.reduce((worst, a) => a.cpl! > worst.cpl! ? a : worst)
      : null;

    const fitScaleMin = await resolveBenchmark('avg_fit_scale_min', tenantId, segmentId ?? null).catch(() => 40);
    const textSummary = buildAngleTextSummary(angleStats, topAngle, worstAngle, periodDays, fitScaleMin);

    return { periodDays, angleStats, topAngle, worstAngle, textSummary, crmAvailable };
  } catch (err: any) {
    console.error('[angleInsights] Erro ao agregar dados de ângulo:', err?.message);
    return { ...empty, textSummary: `Erro ao calcular ângulos: ${err?.message}` };
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface AngleFitAgg {
  avgFit: number;
  leadsWithFit: number;
}

/**
 * Resolve campaign_id → effective_angle (declared_angle ?? Vision ?? 'unknown'), com os
 * mesmos filtros de client/segment da query principal — mas com índices PRÓPRIOS de
 * parâmetro (nunca reaproveitar clientFilter/segmentFilter da query principal, que assumem
 * $2=periodDays; um "buraco" de parâmetro nunca referenciado no texto faz o Postgres falhar
 * ao inferir o tipo dele). Compartilhado por mapAvgFitByAngle e mapCloseRateByAngle — cada
 * uma correlaciona com uma métrica diferente (fit vs. negócio fechado), mas a resolução de
 * "qual ângulo é esta campanha" é sempre a mesma.
 */
async function resolveAngleByCampaignId(
  tenantId: string,
  clientId: string | undefined,
  segmentId: string | undefined,
): Promise<Map<string, string>> {
  const angleParams: (string)[] = [tenantId];
  let angleClientFilter = '';
  if (clientId === 'own') {
    angleClientFilter = ' AND c.client_id IS NULL';
  } else if (clientId) {
    angleParams.push(clientId);
    angleClientFilter = ` AND c.client_id = $${angleParams.length}::uuid`;
  }
  let angleSegmentFilter = '';
  if (segmentId) {
    angleParams.push(segmentId);
    const p = angleParams.length;
    angleSegmentFilter = ` AND ( cl.segment_id = $${p}::uuid OR (c.client_id IS NULL AND t.segment_id = $${p}::uuid) )`;
  }

  const angleByCampaignSql = `
    SELECT
      c.id AS campaign_id,
      COALESCE(c.declared_angle, latest_vision.angle, 'unknown') AS effective_angle
    FROM ${S}."Campaign" c
    LEFT JOIN public.clientes cl ON cl.uuid = c.client_id
    LEFT JOIN public.tenants  t  ON t.id    = c.tenant_id
    LEFT JOIN (
      SELECT DISTINCT ON (ca.campaign_id)
        ca.campaign_id,
        cra.angle
      FROM ${S}."CreativeAsset" ca
      JOIN ${S}."CreativeAnalysis" cra ON cra.asset_id = ca.id
      WHERE cra.angle IS NOT NULL
        AND ca.tenant_id = $1::uuid
      ORDER BY ca.campaign_id, cra.analyzed_at DESC
    ) latest_vision ON latest_vision.campaign_id = c.id
    WHERE c.tenant_id = $1::uuid${angleClientFilter}${angleSegmentFilter}
  `;
  const { rows } = await pool.query(angleByCampaignSql, angleParams);
  return new Map<string, string>(rows.map((r: any) => [r.campaign_id, String(r.effective_angle)]));
}

/**
 * Fit médio por ângulo, ponderado por lead real — 2 queries, nunca uma só (ver comentário
 * no call site sobre fan-out). (1) resolve campaign_id → effective_angle via
 * resolveAngleByCampaignId; (2) agrega score_fit por campanha via o mesmo JOIN
 * marketing_eventos↔leads_staging já usado em aiInsights.ts/mapCampaignAvgFit. Merge em JS
 * faz a ponderação real (campanha com mais leads pesa mais na média do ângulo, não "média
 * das médias").
 */
async function mapAvgFitByAngle(
  tenantId: string,
  periodDays: number,
  clientId: string | undefined,
  segmentId: string | undefined,
): Promise<Map<string, AngleFitAgg>> {
  const result = new Map<string, AngleFitAgg>();
  try {
    const fitByCampaignSql = `
      SELECT me.campaign_id, AVG(ls.score_fit)::float AS avg_fit, COUNT(*)::int AS leads_with_fit
      FROM public.marketing_eventos me
      JOIN public.leads_staging ls ON ls.lead_uuid = me.lead_uuid
      WHERE me.tenant_id = $1::uuid
        AND ls.score_fit IS NOT NULL
        AND me.created_at >= NOW() - ($2::integer * INTERVAL '1 day')
      GROUP BY me.campaign_id
    `;

    const [angleByCampaignId, fitRows] = await Promise.all([
      resolveAngleByCampaignId(tenantId, clientId, segmentId),
      pool.query(fitByCampaignSql, [tenantId, periodDays]),
    ]);

    // Acumula soma ponderada (avg_fit * leads_with_fit) e total de leads por ângulo,
    // só pra campanhas que de fato estão no escopo (client/segment filter já aplicado
    // na resolução de ângulo — campanha fora do escopo simplesmente não aparece no Map).
    const sumByAngle = new Map<string, { weightedSum: number; totalLeads: number }>();
    for (const row of fitRows.rows) {
      const angle = angleByCampaignId.get(row.campaign_id);
      if (!angle) continue; // campanha fora do escopo (client/segment filter) — ignora
      const leads = Number(row.leads_with_fit);
      const avg = Number(row.avg_fit);
      const acc = sumByAngle.get(angle) || { weightedSum: 0, totalLeads: 0 };
      acc.weightedSum += avg * leads;
      acc.totalLeads += leads;
      sumByAngle.set(angle, acc);
    }

    for (const [angle, acc] of sumByAngle) {
      if (acc.totalLeads > 0) {
        result.set(angle, { avgFit: acc.weightedSum / acc.totalLeads, leadsWithFit: acc.totalLeads });
      }
    }
  } catch (err: any) {
    console.warn('[angleInsights] mapAvgFitByAngle falhou — ângulos seguem sem sinal de fit:', err?.message);
  }
  return result;
}

interface AngleCloseAgg {
  leadsIdentified: number;
  dealsWon: number;
}

/**
 * Taxa de fechamento REAL por ângulo — Tier 3 do plano "Loop do ICP", a outra metade do
 * gap: fit médio é uma proxy de qualidade; isto é o resultado de negócio de verdade. Mesma
 * correlação marketing_eventos↔leads_staging↔leads_kanban↔kanban_colunas.is_ganho já usada
 * em revenueAttributionService.ts/F6 e wastedSpendService.ts — nunca inventa "lead
 * identificado" à parte, usa a mesma definição de cohort do resto da plataforma. Só chamada
 * quando hasCrmModule() é true (call site).
 */
async function mapCloseRateByAngle(
  tenantId: string,
  periodDays: number,
  clientId: string | undefined,
  segmentId: string | undefined,
): Promise<Map<string, AngleCloseAgg>> {
  const result = new Map<string, AngleCloseAgg>();
  try {
    const closeByCampaignSql = `
      WITH cohort AS (
        SELECT me.campaign_id, me.lead_uuid
        FROM public.marketing_eventos me
        WHERE me.tenant_id = $1::uuid
          AND me.campaign_id IS NOT NULL
          AND me.created_at >= NOW() - ($2::integer * INTERVAL '1 day')
      )
      SELECT
        cohort.campaign_id,
        COUNT(DISTINCT cohort.lead_uuid)::int AS leads_identified,
        COUNT(DISTINCT ls.lead_uuid) FILTER (
          WHERE lk.lead_uuid IS NOT NULL AND kc.is_ganho = true
        )::int AS deals_won
      FROM cohort
      LEFT JOIN public.leads_staging ls ON ls.lead_uuid = cohort.lead_uuid
      LEFT JOIN public.leads_kanban lk ON lk.lead_uuid = ls.lead_uuid
      LEFT JOIN public.kanban_colunas kc ON kc.id = lk.coluna_id
      GROUP BY cohort.campaign_id
    `;

    const [angleByCampaignId, closeRows] = await Promise.all([
      resolveAngleByCampaignId(tenantId, clientId, segmentId),
      pool.query(closeByCampaignSql, [tenantId, periodDays]),
    ]);

    const sumByAngle = new Map<string, AngleCloseAgg>();
    for (const row of closeRows.rows) {
      const angle = angleByCampaignId.get(row.campaign_id);
      if (!angle) continue; // campanha fora do escopo (client/segment filter) — ignora
      const acc = sumByAngle.get(angle) || { leadsIdentified: 0, dealsWon: 0 };
      acc.leadsIdentified += Number(row.leads_identified);
      acc.dealsWon += Number(row.deals_won);
      sumByAngle.set(angle, acc);
    }
    for (const [angle, acc] of sumByAngle) result.set(angle, acc);
  } catch (err: any) {
    console.warn('[angleInsights] mapCloseRateByAngle falhou — ângulos seguem sem taxa de fechamento:', err?.message);
  }
  return result;
}

function buildAngleTextSummary(
  stats: AngleStat[],
  top: AngleStat | null,
  worst: AngleStat | null,
  periodDays: number,
  fitScaleMin: number,
): string {
  if (stats.length === 0) return `Nenhum dado de ângulo disponível nos últimos ${periodDays} dias.`;

  const lines: string[] = [`ÂNGULOS DE COMUNICAÇÃO — últimos ${periodDays} dias:`];
  for (const s of stats) {
    const cplText = s.cpl !== null ? `CPL R$${s.cpl.toFixed(2)}` : 'sem conversões';
    const fitText = s.avgFit !== null ? ` | fit médio ${s.avgFit.toFixed(0)}/100 (${s.leadsWithFit} leads)` : '';
    const closeText = s.closeRate !== null ? ` | fechamento real ${s.closeRate.toFixed(1)}% (${s.dealsWon} negócio(s))` : '';
    lines.push(
      `• ${s.label}: ${s.campaigns} camp. | R$${s.spend.toFixed(2)} investido | ` +
      `CTR ${s.ctr.toFixed(2)}% | ${cplText}${fitText}${closeText}`
    );
  }

  if (top) {
    lines.push(
      `\n✅ ÂNGULO VENCEDOR (por CPL): "${top.label}" — CPL R$${top.cpl!.toFixed(2)}, ` +
      `${top.campaigns} campanha(s). Priorizar criativos com este ângulo.`
    );
    // Ganho real do Tier 2: CPL bom pode esconder lead de baixa qualidade — nunca troca
    // o vencedor (critério continua sendo CPL, igual sempre foi), só alerta quem lê.
    if (top.avgFit !== null && top.avgFit < fitScaleMin) {
      lines.push(
        `⚠️ ATENÇÃO: o ângulo vencedor por CPL tem fit médio baixo (${top.avgFit.toFixed(0)}/100, ` +
        `abaixo do limiar ${fitScaleMin}) — volume barato, mas leads podem não ser compradores reais.`
      );
    }
    // Tier 3 — sinal mais forte que fit: o vencedor por CPL nunca converteu negócio real,
    // apesar de ter leads reais no cohort (closeRate só é 0, não null, quando há
    // leadsIdentified>0 — nunca dispara por ausência de dado, só por resultado real).
    if (top.closeRate === 0) {
      lines.push(
        '⚠️ ATENÇÃO: o ângulo vencedor por CPL teve fechamento real de 0% no período — nenhum lead virou negócio.'
      );
    }
  }
  if (worst) {
    lines.push(
      `⚠️ ÂNGULO FRACO: "${worst.label}" — CPL R$${worst.cpl!.toFixed(2)}, ` +
      `${worst.campaigns} campanha(s). Revisar ou pausar criativos com este ângulo.`
    );
  }
  if (!top) {
    lines.push('\nDados insuficientes para identificar ângulo vencedor (sem conversões registradas).');
  }

  return lines.join('\n');
}
