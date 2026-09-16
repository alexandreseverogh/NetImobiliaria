import { randomUUID } from 'crypto';
import prisma from '../prisma';
import { executeAction } from './agentDecisor';

const DEFAULT_THRESHOLD_PCT = 10;
const DEDUPE_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * FASE 1 (Google Ads) A6 — Agente de Negativação.
 * Lê GoogleSearchTerm (grão termo) por campanha Google do tenant: termo sem conversão que já
 * consumiu mais que X% do gasto TOTAL da campanha na janela → propõe negativo. X vem de
 * network_defaults.google.negation_spend_threshold_pct do segmento da campanha (fallback 10%).
 * Zero hardcode por segmento — mesmo princípio de qualquer regra deste sistema.
 *
 * Ação defensiva (ver DEFENSIVE_TYPES em agentDecisor.ts) — executa direto, sem fila de
 * aprovação: negativar um termo sem conversão é baixo risco (só corta gasto ruim já provado).
 */
export async function runNegationAgent(tenantId: string, windowDays = 30): Promise<{ proposalsCreated: number }> {
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  const campaigns = await prisma.$queryRaw<{ id: string; name: string }[]>`
    SELECT cam.id, cam.name
    FROM campanhasmarketingdigital."Campaign" cam
    JOIN public.ad_networks n ON n.id = cam."network_id"
    WHERE cam."tenant_id" = ${tenantId}::uuid AND n.code = 'google'
  `;

  let proposalsCreated = 0;

  for (const campaign of campaigns) {
    const terms = await prisma.$queryRaw<{
      search_term: string; match_type: string; total_cost: number; total_conversions: number;
    }[]>`
      SELECT search_term, match_type,
             SUM(cost)::float AS total_cost,
             SUM(conversions)::int AS total_conversions
      FROM campanhasmarketingdigital."GoogleSearchTerm"
      WHERE campaign_id = ${campaign.id}
        AND tenant_id = ${tenantId}::uuid
        AND status = 'none'
        AND date >= ${since}
      GROUP BY search_term, match_type
    `;
    if (terms.length === 0) continue;

    const totalCampaignCost = terms.reduce((s, t) => s + Number(t.total_cost), 0);
    if (totalCampaignCost <= 0) continue;

    const threshold = await resolveNegationThreshold(tenantId, campaign.id);

    for (const term of terms) {
      const conversions = Number(term.total_conversions);
      const cost = Number(term.total_cost);
      if (conversions > 0) continue; // teve conversão — não é candidato

      const spendPct = (cost / totalCampaignCost) * 100;
      if (spendPct <= threshold) continue;

      // Já negativado antes (memória) — nunca propor de novo
      const already = await prisma.googleNegativeKeyword.findUnique({
        where: { tenantId_campaignId_term: { tenantId, campaignId: campaign.id, term: term.search_term } },
      }).catch(() => null);
      if (already) continue;

      // Dedupe — proposta recente pro mesmo termo (últimas 24h)
      const recent = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM campanhasmarketingdigital."AgentAction"
        WHERE "campaignId" = ${campaign.id} AND type = 'ADD_NEGATIVE_KEYWORD'
          AND negative_term = ${term.search_term}
          AND "createdAt" >= ${new Date(Date.now() - DEDUPE_WINDOW_MS)}
        LIMIT 1
      `;
      if (recent.length > 0) continue;

      const matchType = normalizeMatchType(term.match_type);
      const actionId = randomUUID();
      const costBRL = (cost / 100).toFixed(2);
      const description = `O termo "${term.search_term}" gastou R$${costBRL} (${spendPct.toFixed(1)}% do orçamento da campanha nos últimos ${windowDays} dias, limite: ${threshold}%) sem gerar nenhuma conversão na campanha "${campaign.name}". Negativado automaticamente.`;

      await prisma.$executeRaw`
        INSERT INTO campanhasmarketingdigital."AgentAction"
          (id, tenant_id, "campaignId", "campaignName", type, title, description, confidence,
           status, negative_term, negative_match_type, "createdAt")
        VALUES
          (${actionId}, ${tenantId}::uuid, ${campaign.id}, ${campaign.name},
           'ADD_NEGATIVE_KEYWORD', 'Termo de busca sem conversão — negativado', ${description}, 0.85,
           'PENDING_EXECUTION', ${term.search_term}, ${matchType}, now())
      `;

      const action = {
        id: actionId,
        campaignId: campaign.id,
        campaignName: campaign.name,
        type: 'ADD_NEGATIVE_KEYWORD',
        description,
        negativeTerm: term.search_term,
        negativeMatchType: matchType,
      };

      // Defensiva: executa direto (skipNotify=true — acumularia no digest, mas a negativação
      // não move budget/status de campanha, então uma notificação individual silenciosa basta).
      await executeAction(action, tenantId, true, true);
      proposalsCreated++;
    }
  }

  return { proposalsCreated };
}

function normalizeMatchType(raw: string): 'BROAD' | 'PHRASE' | 'EXACT' {
  const v = (raw || '').toUpperCase();
  if (v === 'PHRASE' || v === 'EXACT') return v;
  return 'BROAD';
}

async function resolveNegationThreshold(tenantId: string, campaignId: string): Promise<number> {
  const rows = await prisma.$queryRaw<{ pct: string | null }[]>`
    SELECT s.network_defaults->'google'->>'negation_spend_threshold_pct' AS pct
    FROM campanhasmarketingdigital."Campaign" cam
    LEFT JOIN public.clientes cl ON cl.uuid = cam."client_id"
    LEFT JOIN public.tenants  t  ON t.id    = cam."tenant_id"
    LEFT JOIN public.system_segments s ON s.id = COALESCE(cl.segment_id, t.segment_id)
    WHERE cam.id = ${campaignId} AND cam."tenant_id" = ${tenantId}::uuid
  `;
  const pct = rows[0]?.pct;
  return pct ? parseFloat(pct) : DEFAULT_THRESHOLD_PCT;
}
