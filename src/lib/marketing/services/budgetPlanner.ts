import prisma from '../prisma';
import pool from '@/lib/database/connection';
import { resolveBenchmarks } from '../../intelligence/benchmarkResolver';

const S = 'campanhasmarketingdigital';

export interface BudgetPlan {
  /** adSet usado como referência (o de maior budget da campanha) */
  adSetId: string | null;
  /** budget diário atual somado de todos os adsets da campanha */
  currentBudget: number;
  /** novo budget diário proposto após aplicar o percentual do segmento */
  proposedBudget: number;
  /** percentual aplicado (positivo = aumento, negativo = redução) */
  pct: number;
  /** segmento efetivo da campanha (para auditoria) */
  segmentId: string | null;
}

/**
 * Resolve o segmento efetivo de UMA campanha:
 *   campanha de cliente → clientes.segment_id
 *   campanha própria (client_id NULL) → tenants.segment_id
 */
export async function resolveCampaignSegment(
  campaignId: string,
  tenantId: string | null,
): Promise<{ segmentId: string | null; clientId: string | null }> {
  if (!tenantId) return { segmentId: null, clientId: null };
  try {
    const { rows } = await pool.query(
      `SELECT COALESCE(cl.segment_id, t.segment_id) AS segment_id,
              cam.client_id AS client_id
       FROM ${S}."Campaign" cam
       LEFT JOIN public.clientes cl ON cl.uuid = cam.client_id
       LEFT JOIN public.tenants  t  ON t.id    = cam.tenant_id
       WHERE cam.id = $1 AND cam.tenant_id = $2::uuid
       LIMIT 1`,
      [campaignId, tenantId],
    );
    return {
      segmentId: rows[0]?.segment_id ?? null,
      clientId:  rows[0]?.client_id ?? null,
    };
  } catch (err) {
    console.warn('[budgetPlanner] resolveCampaignSegment falhou:', err);
    return { segmentId: null, clientId: null };
  }
}

/**
 * Calcula o plano de budget para uma ação SCALE ou DOWNSCALE, com TODOS os
 * percentuais e tetos resolvidos por segmento (zero hardcode).
 * Retorna null se a campanha não tiver adsets com budget.
 */
export async function computeBudgetPlan(
  action: { campaignId: string; type: string },
  tenantId: string | null,
  overridePct?: number,  // scalePct vindo do aiInsights (proporcional à performance real)
): Promise<BudgetPlan | null> {
  const adSets = await prisma.adSet.findMany({ where: { campaignId: action.campaignId } });
  if (adSets.length === 0) return null;

  const currentBudget = adSets.reduce((sum, a) => sum + (a.dailyBudget || 0), 0);
  if (currentBudget <= 0) return null;

  // adSet de referência = o de maior budget
  const refAdSet = adSets.reduce((max, a) => (a.dailyBudget > (max?.dailyBudget ?? 0) ? a : max), adSets[0]);

  const { segmentId, clientId } = await resolveCampaignSegment(action.campaignId, tenantId);

  const bm = await resolveBenchmarks(
    ['scale_budget_pct', 'downscale_budget_pct', 'scale_budget_max',
     'scale_budget_base_pct', 'scale_budget_max_pct'],
    tenantId ?? '',
    segmentId,
    clientId,
  );

  const isScale = action.type === 'SCALE';
  let pct: number;
  if (isScale) {
    // Prioridade: overridePct (aiInsights proporcional) > scale_budget_base_pct > scale_budget_pct legado
    pct = overridePct ?? bm.scale_budget_base_pct ?? bm.scale_budget_pct ?? 20;
    // Garante que nunca ultrapassa o teto configurado
    const maxPct = bm.scale_budget_max_pct ?? 25;
    if (overridePct == null) pct = Math.min(pct, maxPct);
  } else {
    pct = -Math.abs(bm.downscale_budget_pct ?? 30);
  }

  let proposedBudget = Math.round(currentBudget * (1 + pct / 100));

  // Teto de segurança ao escalar (0 = sem teto)
  const maxBudget = bm.scale_budget_max ?? 0;
  if (isScale && maxBudget > 0 && proposedBudget > maxBudget) {
    proposedBudget = Math.round(maxBudget);
  }
  // Nunca abaixo de R$1/dia ao reduzir
  if (!isScale) proposedBudget = Math.max(1, proposedBudget);

  return {
    adSetId: refAdSet?.id ?? null,
    currentBudget,
    proposedBudget,
    pct,
    segmentId,
  };
}
