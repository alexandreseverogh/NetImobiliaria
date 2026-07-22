/**
 * segmentIntelligenceService — Motor de inteligência de segmento multi-cliente.
 *
 * Camada 1 (determinística): computa rankings, benchmarks reais, padrões.
 * Camada 2 (LLM): invoca template 'segment_intelligence' com os dados estruturados.
 *
 * NENHUM valor é hardcoded — tudo vem do banco (system_segments, dados reais).
 */

import pool from '@/lib/database/connection';
import { invokeWithTemplate } from '../../intelligence/llmInvoker';
import { generateAiInsights } from './aiInsights';
import { getLeadEvents, leadsByCampaign as groupLeadsByCampaign } from './leadEvents';
import type { SegmentDashboardResponse } from '../../../app/api/admin/campanhas/dashboard/segment/route';

const S = 'campanhasmarketingdigital';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SegmentPattern {
  type: 'fatigue' | 'cpl_rising' | 'ctr_low' | 'scale_opportunity' | 'no_leads';
  affectedClients: string[];  // nomes dos clientes
  clientCount: number;
  description: string;
}

export interface SegmentIntelligenceResult {
  // Dados estruturados (determinístico)
  patterns: SegmentPattern[];
  anglesSummary: { angle: string; clientCount: number; avgCpl: number | null }[];
  // Narrativa LLM
  narrative: {
    segmentDiagnosis: string;
    topPerformerInsights: string[];
    criticalAlerts: string[];
    crossClientPatterns: string[];
    segmentOpportunities: string[];
    clientSpecificActions: { clientName: string; priority: string; action: string }[];
    benchmarkContext: string;
  } | null;
  generatedAt: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number | null, decimals = 2): string {
  if (n == null) return 'N/D';
  return n.toFixed(decimals);
}

function buildClientsDataText(
  data: SegmentDashboardResponse,
  vocab: any,
): string {
  const all = [
    ...(data.tenantOwn ? [data.tenantOwn] : []),
    ...data.clients,
  ].sort((a, b) => {
    if (a.metrics.cpl == null) return 1;
    if (b.metrics.cpl == null) return -1;
    return a.metrics.cpl - b.metrics.cpl;
  });

  return all.map((c, i) => {
    const rank   = c.metrics.rank > 0 ? `#${c.metrics.rank}` : 'sem dados';
    const delta  = c.metrics.deltaCplVsBenchmark != null
      ? `${c.metrics.deltaCplVsBenchmark > 0 ? '+' : ''}${fmt(c.metrics.deltaCplVsBenchmark, 1)}% vs mediana`
      : '';
    const status = c.metrics.status === 'ok' ? '🟢' : c.metrics.status === 'warn' ? '🟡' : c.metrics.status === 'critical' ? '🔴' : '⚪';

    return `${status} ${rank} ${c.name}
  - CPL: R$ ${fmt(c.metrics.cpl)} ${delta}
  - CTR: ${fmt(c.metrics.ctr, 2)}%
  - ${vocab?.lead_term ?? 'leads'}: ${c.metrics.leads}
  - Verba: R$ ${fmt(c.metrics.spend)}
  - Ângulo top: ${c.topAngle ?? 'não classificado'}
  - Campanhas: ${c.metrics.status === 'nodata' ? 'sem dados no período' : `${c.campaignCount} (${c.activeCampaignCount} ativas)`}`;
  }).join('\n\n');
}

function buildPatternsText(patterns: SegmentPattern[]): string {
  if (patterns.length === 0) return 'Nenhum padrão crítico detectado no período.';
  return patterns.map(p =>
    `- [${p.type.toUpperCase()}] Afeta ${p.clientCount} cliente(s) (${p.affectedClients.join(', ')}): ${p.description}`,
  ).join('\n');
}

function buildAnglesText(
  angles: { angle: string; clientCount: number; avgCpl: number | null }[],
): string {
  if (angles.length === 0) return 'Nenhum ângulo criativo declarado nas campanhas do período.';
  return angles.map(a =>
    `- ${a.angle}: ${a.clientCount} cliente(s) usando, CPL médio R$ ${fmt(a.avgCpl)}`,
  ).join('\n');
}

// ─── Detectar padrões cross-cliente ──────────────────────────────────────────

function detectPatterns(data: SegmentDashboardResponse): SegmentPattern[] {
  const patterns: SegmentPattern[] = [];
  const all = [
    ...(data.tenantOwn ? [data.tenantOwn] : []),
    ...data.clients,
  ].filter(c => c.metrics.spend > 0);

  // Padrão: CPL crítico (acima do limiar do segmento)
  const critical = all.filter(c => c.metrics.status === 'critical');
  if (critical.length > 0) {
    patterns.push({
      type:           'cpl_rising',
      affectedClients: critical.map(c => c.name),
      clientCount:    critical.length,
      description:    `CPL acima do limiar crítico do segmento (R$ ${fmt(data.segment.cplCritical)}). Requer atenção imediata.`,
    });
  }

  // Padrão: CTR baixo em múltiplos clientes
  const ctrMin  = data.segment.ctrMin ?? 1;
  const lowCtr  = all.filter(c => c.metrics.ctr > 0 && c.metrics.ctr < ctrMin);
  if (lowCtr.length >= 2) {
    patterns.push({
      type:           'ctr_low',
      affectedClients: lowCtr.map(c => c.name),
      clientCount:    lowCtr.length,
      description:    `CTR abaixo do mínimo do segmento (${ctrMin}%) em ${lowCtr.length} clientes simultaneamente — possível sinal de saturação de público ou fadiga criativa no segmento.`,
    });
  }

  // Padrão: gasto sem lead em múltiplos clientes
  const noLeads = all.filter(c => c.metrics.spend > 30 && c.metrics.leads === 0);
  if (noLeads.length >= 2) {
    patterns.push({
      type:           'no_leads',
      affectedClients: noLeads.map(c => c.name),
      clientCount:    noLeads.length,
      description:    `Gasto acumulado sem ${data.segment.vocabulary?.lead_term ?? 'leads'} em ${noLeads.length} clientes — rever funil de conversão ou landing pages.`,
    });
  }

  // Padrão: oportunidade de escala (CPL baixo + leads suficientes)
  const cplIdeal = data.segment.cplIdeal;
  const scale = all.filter(c =>
    c.metrics.cpl != null &&
    cplIdeal != null &&
    c.metrics.cpl < cplIdeal * 0.85 &&
    c.metrics.leads >= 5,
  );
  if (scale.length > 0) {
    patterns.push({
      type:           'scale_opportunity',
      affectedClients: scale.map(c => c.name),
      clientCount:    scale.length,
      description:    `CPL 15%+ abaixo do ideal do segmento com volume de ${data.segment.vocabulary?.lead_term ?? 'leads'} suficiente — campanhas prontas para escalar.`,
    });
  }

  return patterns;
}

// ─── Resumo de ângulos criativos cross-cliente ────────────────────────────────

async function buildAnglesSummary(
  data: SegmentDashboardResponse,
  tenantId: string,
  segmentId: string,
): Promise<{ angle: string; clientCount: number; avgCpl: number | null }[]> {
  try {
    const all = [...(data.tenantOwn ? [data.tenantOwn] : []), ...data.clients];

    // buscar todos os ângulos das campanhas do segmento no período
    const clientIds = data.clients.map(c => c.id).filter(id => id !== 'own');

    // Spend agregado por campanha (subquery separada — juntar com leads no mesmo JOIN causaria
    // produto cartesiano, spend inflado pelo nº de leads). Leads vêm de getLeadEvents() abaixo
    // (fonte única, ciente de rede — WhatsApp + formulário + conversão real do Google), não
    // mais só WHATSAPP_CLICK: campanha de Google/formulário entrava aqui com leads:0 e
    // distorcia o CPL médio por ângulo (achado 2026-07-21).
    const { rows } = await pool.query(
      `SELECT cam.id                      AS campaign_id,
              cam.declared_angle          AS angle,
              cam.client_id::text         AS client_id,
              COALESCE(SUM(ins.spend), 0) AS spend
       FROM ${S}."Campaign" cam
       LEFT JOIN (
         SELECT "campaignId", SUM(spend) AS spend
         FROM ${S}."Insight" GROUP BY "campaignId"
       ) ins ON ins."campaignId" = cam.id
       LEFT JOIN public.clientes cl ON cl.uuid = cam.client_id
       LEFT JOIN public.tenants  t  ON t.id    = cam.tenant_id
       WHERE cam.tenant_id = $1::uuid
         AND cam.declared_angle IS NOT NULL
         AND COALESCE(cl.segment_id, t.segment_id) = $2::uuid
       GROUP BY cam.id, cam.declared_angle, cam.client_id`,
      [tenantId, segmentId],
    );

    const campaignIds = rows.map(r => r.campaign_id as string);
    const leadEvents = campaignIds.length > 0
      ? await getLeadEvents(tenantId, { campaignIds, startDate: new Date(0), endDate: new Date() })
      : [];
    const leadsByCampaignMap = groupLeadsByCampaign(leadEvents);

    // Agrupar por ângulo
    const angleMap = new Map<string, { clients: Set<string>; totalSpend: number; totalLeads: number }>();
    for (const r of rows) {
      const key = r.angle;
      const ex  = angleMap.get(key) ?? { clients: new Set(), totalSpend: 0, totalLeads: 0 };
      ex.clients.add(r.client_id ?? 'own');
      ex.totalSpend  += Number(r.spend);
      ex.totalLeads  += leadsByCampaignMap.get(r.campaign_id) ?? 0;
      angleMap.set(key, ex);
    }

    return Array.from(angleMap.entries())
      .map(([angle, v]) => ({
        angle,
        clientCount: v.clients.size,
        avgCpl:      v.totalLeads > 0 ? Number((v.totalSpend / v.totalLeads).toFixed(2)) : null,
      }))
      .sort((a, b) => b.clientCount - a.clientCount);
  } catch {
    return [];
  }
}

// ─── Função principal ─────────────────────────────────────────────────────────

export async function generateSegmentIntelligence(
  data: SegmentDashboardResponse,
  tenantId: string,
): Promise<SegmentIntelligenceResult> {
  const patterns      = detectPatterns(data);
  const anglesSummary = await buildAnglesSummary(data, tenantId, data.segment.id);
  const vocab         = data.segment.vocabulary ?? {};
  const bench         = data.benchmark;

  // Contexto estruturado para o LLM
  const variables: Record<string, string> = {
    segment_name:      data.segment.name,
    period_label:      `${bench.period.startDate} — ${bench.period.endDate} (${bench.period.days} dias)`,
    lead_term:         vocab.lead_term     ?? 'lead',
    conversion_term:   vocab.conversion_term ?? 'conversão',
    product:           vocab.product         ?? 'produto/serviço',
    cpl_median:        fmt(bench.cplMedian),
    ctr_median:        fmt(bench.ctrMedian, 2),
    cpm_median:        fmt(bench.cpmMedian),
    cpl_ideal:         fmt(data.segment.cplIdeal),
    cpl_critical:      fmt(data.segment.cplCritical),
    leads_total:       String(bench.leadsTotal),
    spend_total:       fmt(bench.spendTotal),
    clients_data:      buildClientsDataText(data, vocab),
    patterns_detected: buildPatternsText(patterns),
    angles_summary:    buildAnglesText(anglesSummary),
  };

  let narrative: SegmentIntelligenceResult['narrative'] = null;
  try {
    const raw  = await invokeWithTemplate({
      templateKey: 'segment_intelligence',
      segmentId:   data.segment.id,
      variables,
      tenantId,
      maxTokens:   2500,
    });
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      narrative = {
        segmentDiagnosis:      parsed.segmentDiagnosis      ?? '',
        topPerformerInsights:  parsed.topPerformerInsights  ?? [],
        criticalAlerts:        parsed.criticalAlerts         ?? [],
        crossClientPatterns:   parsed.crossClientPatterns    ?? [],
        segmentOpportunities:  parsed.segmentOpportunities   ?? [],
        clientSpecificActions: parsed.clientSpecificActions  ?? [],
        benchmarkContext:      parsed.benchmarkContext       ?? '',
      };
    }
  } catch (err) {
    console.error('[SegmentIntelligence] LLM error:', err);
    // Fallback sem narrativa — dados estruturados ainda são retornados
  }

  return {
    patterns,
    anglesSummary,
    narrative,
    generatedAt: new Date().toISOString(),
  };
}
