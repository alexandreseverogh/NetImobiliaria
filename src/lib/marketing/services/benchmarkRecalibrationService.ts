/**
 * Recalibração sob demanda do limiar avg_fit_scale_min — Tier 3 do plano "Loop do ICP"
 * (2026-09-04), o "espelho em Campanhas" do scoreRecalibrationService.ts do CRM.
 *
 * Diferença deliberada de design em relação ao F5 original do CRM: aquele recalibra um valor
 * CATEGÓRICO (score_base de uma regra de texto) comparando contra a taxa de conversão de UMA
 * tag; aqui o valor é um LIMIAR NUMÉRICO CONTÍNUO sobre uma distribuição de fit — a pergunta
 * certa não é "este valor está certo?", é "que ponto de corte discrimina melhor quem converte
 * de quem não converte?". Por isso o cálculo testa uma varredura de candidatos e escolhe o que
 * MAXIMIZA a diferença de taxa de conversão entre os leads acima e abaixo do corte.
 *
 * Decisão de escopo, pra não reconstruir a infra inteira do F5 (migração+tabela+cron+endpoint
 * de decisão) quando um cálculo sob demanda já entrega o valor real: SEM tabela de sugestão
 * persistida, SEM cron. O Master pede o cálculo quando quiser (botão na própria tela de
 * Parâmetros), vê a sugestão com o dado bruto por trás, e decide aplicar ou não — aplicar é só
 * preencher o campo já existente e usar o botão "Salvar Parâmetros" que já existe e já foi
 * corrigido nesta mesma sessão (ver docs/CHECKPOINT.md, achado do ON CONFLICT).
 *
 * Cálculo sempre no nível SEGMENTO (nunca por tenant individual) — mesmo padrão de
 * crm_agentes_config_segmento (sem tenant_id): a amostra de 1 tenant isolado tende a ser
 * pequena demais pra um corte estatisticamente confiável; agregar por segmento (todos os
 * tenants daquele nicho com CRM contratado) dá volume real sem misturar segmentos distintos.
 */
import pool from '@/lib/database/connection';
import { hasCrmModule } from './revenueAttributionService';

const JANELA_DIAS_DEFAULT = 90;
const MIN_LEADS_POR_GRUPO = 15; // amostra mínima em CADA grupo (abaixo/acima) pra confiar no corte
const CANDIDATOS = [10, 20, 30, 40, 50, 60, 70, 80, 90];
const DIVERGENCIA_MINIMA = 10; // pontos de fit — abaixo disso, não vale a pena trocar
const DISCRIMINACAO_MINIMA_PCT = 15; // taxaAcima - taxaAbaixo, em pontos percentuais

export interface FitThresholdSuggestion {
  available: boolean;
  reason?: string;
  currentValue: number;
  suggestedValue: number | null;
  sampleSize: number;
  taxaConversaoAbaixo: number | null; // % dos leads com fit < suggestedValue que converteram
  taxaConversaoAcima: number | null;  // % dos leads com fit >= suggestedValue que converteram
  leadsAbaixo: number;
  leadsAcima: number;
}

interface LeadFitDeal {
  scoreFit: number;
  won: boolean;
}

/** Tenants do segmento com CRM efetivamente contratado — só eles contribuem dado real de
 *  negócio fechado (tenant sem CRM nunca tem leads_kanban, contaria como "nunca converte",
 *  enviesando o cálculo pra baixo sem essa filtragem). */
async function tenantsWithCrmInSegment(segmentId: string): Promise<string[]> {
  const { rows } = await pool.query(
    `SELECT id FROM public.tenants WHERE segment_id = $1::uuid AND status = 'active'`,
    [segmentId],
  );
  const checks = await Promise.all(rows.map(async (r) => ({ id: r.id, has: await hasCrmModule(r.id) })));
  return checks.filter((c) => c.has).map((c) => c.id);
}

async function fetchLeadFitDeals(tenantIds: string[], janelaDias: number): Promise<LeadFitDeal[]> {
  if (tenantIds.length === 0) return [];
  const { rows } = await pool.query(
    `SELECT ls.score_fit,
            (lk.lead_uuid IS NOT NULL AND kc.is_ganho = true) AS won
       FROM public.leads_staging ls
       JOIN public.marketing_eventos me ON me.lead_uuid = ls.lead_uuid
       LEFT JOIN public.leads_kanban lk ON lk.lead_uuid = ls.lead_uuid
       LEFT JOIN public.kanban_colunas kc ON kc.id = lk.coluna_id
      WHERE ls.tenant_id = ANY($1::uuid[])
        AND ls.score_fit IS NOT NULL
        AND me.created_at >= now() - ($2::integer || ' days')::interval
      GROUP BY ls.lead_uuid, ls.score_fit, lk.lead_uuid, kc.is_ganho`,
    [tenantIds, janelaDias],
  );
  return rows.map((r) => ({ scoreFit: Number(r.score_fit), won: r.won === true }));
}

function conversionRate(leads: LeadFitDeal[]): number | null {
  if (leads.length === 0) return null;
  const won = leads.filter((l) => l.won).length;
  return (won / leads.length) * 100;
}

/**
 * Calcula a sugestão de novo limiar pra um segmento — nunca persiste nada, é sempre um
 * preview sob demanda. `available:false` cobre 3 casos honestos, sem exceção lançada: sem
 * CRM contratado em nenhum tenant do segmento, sem crm_ia_ativa, ou amostra insuficiente.
 */
export async function computeFitThresholdSuggestion(
  segmentId: string,
  janelaDias: number = JANELA_DIAS_DEFAULT,
): Promise<FitThresholdSuggestion> {
  const seg = await pool.query(
    `SELECT crm_ia_ativa FROM public.system_segments WHERE id = $1::uuid`,
    [segmentId],
  );
  const currentBenchmark = await pool.query(
    `SELECT value FROM public.system_benchmarks
      WHERE segment_id = $1::uuid AND metric_key = 'avg_fit_scale_min' AND network_id IS NULL
      LIMIT 1`,
    [segmentId],
  );
  const currentValue = currentBenchmark.rows[0] ? Number(currentBenchmark.rows[0].value) : 40;

  const empty = (reason: string): FitThresholdSuggestion => ({
    available: false, reason, currentValue, suggestedValue: null, sampleSize: 0,
    taxaConversaoAbaixo: null, taxaConversaoAcima: null, leadsAbaixo: 0, leadsAcima: 0,
  });

  if (!seg.rows[0]) return empty('Segmento não encontrado.');
  if (!seg.rows[0].crm_ia_ativa) {
    return empty('Segmento sem qualificação por IA ativa (crm_ia_ativa) — nenhum lead tem score_fit real.');
  }

  const tenantIds = await tenantsWithCrmInSegment(segmentId);
  if (tenantIds.length === 0) {
    return empty('Nenhum tenant deste segmento tem o módulo de CRM contratado — sem dado de negócio fechado pra correlacionar.');
  }

  const leads = await fetchLeadFitDeals(tenantIds, janelaDias);
  if (leads.length < MIN_LEADS_POR_GRUPO * 2) {
    return { ...empty(`Amostra insuficiente: ${leads.length} lead(s) com fit no período (mínimo ${MIN_LEADS_POR_GRUPO * 2}).`), sampleSize: leads.length };
  }

  // Varredura: escolhe o candidato que MAXIMIZA a discriminação (taxaAcima - taxaAbaixo),
  // exigindo amostra mínima nos dois grupos pra não confiar num corte que isola 2 leads.
  let best: { value: number; abaixo: LeadFitDeal[]; acima: LeadFitDeal[]; discriminacao: number } | null = null;
  for (const candidato of CANDIDATOS) {
    const abaixo = leads.filter((l) => l.scoreFit < candidato);
    const acima = leads.filter((l) => l.scoreFit >= candidato);
    if (abaixo.length < MIN_LEADS_POR_GRUPO || acima.length < MIN_LEADS_POR_GRUPO) continue;
    const taxaAbaixo = conversionRate(abaixo)!;
    const taxaAcima = conversionRate(acima)!;
    const discriminacao = taxaAcima - taxaAbaixo;
    if (!best || discriminacao > best.discriminacao) {
      best = { value: candidato, abaixo, acima, discriminacao };
    }
  }

  if (!best) {
    return { ...empty('Nenhum ponto de corte candidato teve amostra suficiente nos dois grupos.'), sampleSize: leads.length };
  }

  const divergencia = Math.abs(best.value - currentValue);
  const discriminacaoReal = best.discriminacao >= DISCRIMINACAO_MINIMA_PCT;

  if (best.value === currentValue || divergencia < DIVERGENCIA_MINIMA || !discriminacaoReal) {
    // Não sugere troca — ou já está no ponto ótimo, ou a divergência é pequena demais, ou o
    // fit simplesmente não discrimina bem neste segmento ainda (mais dado ao longo do tempo
    // pode mudar isso). Retorna available:true (o cálculo rodou) mas suggestedValue:null.
    return {
      available: true,
      reason: !discriminacaoReal
        ? `Fit não discrimina bem neste segmento ainda (melhor corte só ${best.discriminacao.toFixed(1)}pp de diferença) — manter o valor atual.`
        : 'Valor atual já é o ponto de corte mais discriminante encontrado.',
      currentValue, suggestedValue: null, sampleSize: leads.length,
      taxaConversaoAbaixo: conversionRate(best.abaixo), taxaConversaoAcima: conversionRate(best.acima),
      leadsAbaixo: best.abaixo.length, leadsAcima: best.acima.length,
    };
  }

  return {
    available: true,
    currentValue, suggestedValue: best.value, sampleSize: leads.length,
    taxaConversaoAbaixo: conversionRate(best.abaixo), taxaConversaoAcima: conversionRate(best.acima),
    leadsAbaixo: best.abaixo.length, leadsAcima: best.acima.length,
  };
}
