import { randomUUID } from 'crypto';
import prisma from '../prisma';
import { generateAiInsights } from './aiInsights';
import {
  notifyExecuted, notifyDigest,
  type DigestItem,
} from './agentNotificador';
import { invokeForContext } from '../../intelligence/llmInvoker';
import { getNetworkServiceForTenant } from '../networks/factory';
import type { NetworkCode } from '../networks/types';
import { transitionCampaign } from './campaignStateMachine';
import { getAngleInsights } from './angleInsightsService';
import { resolveCampaignSegment, computeBudgetPlan } from './budgetPlanner';
import { resolveBenchmarks } from '../../intelligence/benchmarkResolver';

const CONFIDENCE_THRESHOLD = parseFloat(process.env.AGENT_CONFIDENCE_THRESHOLD || '0.85');
const PUBLIC_DOMAIN = process.env.PUBLIC_DOMAIN || 'http://localhost:3001';

// PARTE D3 — resolve o código de rede (meta/google/tiktok...) de uma campanha via ad_networks.
// Extraído do fix de executeAction (schema real é networkId, não networkCode) pra ser
// reaproveitado também no digest do WhatsApp, que precisa rotular a rede por ação.
async function resolveNetworkCode(networkId: string | null | undefined): Promise<NetworkCode> {
  if (!networkId) return 'meta';
  const netRows = await prisma.$queryRaw<{ code: string }[]>`
    SELECT code FROM public.ad_networks WHERE id = ${networkId}::uuid LIMIT 1
  `;
  return (netRows[0]?.code as NetworkCode) ?? 'meta';
}

// Ações defensivas: executam automaticamente sem aprovação humana
// FASE 1 (Google Ads) A6 — ADD_NEGATIVE_KEYWORD é defensiva (baixo risco, só remove tráfego
// ruim já comprovado sem conversão) — mesmo tratamento de PAUSE/DOWNSCALE.
const DEFENSIVE_TYPES = ['PAUSE', 'DOWNSCALE', 'ADD_NEGATIVE_KEYWORD'];
// Ações ofensivas: exigem aprovação via WhatsApp/Slack
const OFFENSIVE_TYPES = ['SCALE', 'REFRESH_CREATIVE', 'ADJUST_AUDIENCE', 'REALLOCATE_BUDGET'];

export async function runDecisor(tenantId?: string): Promise<{ actionsCreated: number }> {
  const result = await generateAiInsights(undefined, tenantId);
  const insights = result.insights;

  let threshold = CONFIDENCE_THRESHOLD;
  if (tenantId) {
    const config = await prisma.$queryRaw<{ agent_confidence_threshold: any }[]>`
      SELECT agent_confidence_threshold FROM public.tenants WHERE id = ${tenantId}::uuid LIMIT 1
    `;
    const val = config[0]?.agent_confidence_threshold;
    if (val !== null && val !== undefined) {
      threshold = typeof val === 'object' && typeof val.toNumber === 'function'
        ? val.toNumber()
        : parseFloat(val.toString());
    }
  }

  const highConfidence = insights.filter(i => i.confidence >= threshold);
  const angleCtx = await getAngleInsights(7, tenantId).catch(() => null);

  let actionsCreated = 0;
  const digestItems: DigestItem[] = [];
  let resolvedTenantForDigest: string | null = tenantId ?? null;

  for (const insight of highConfidence) {
    // Evitar ações duplicadas nas últimas 24h para a mesma campanha+tipo
    const recentRows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM campanhasmarketingdigital."AgentAction"
      WHERE "campaignId" = ${insight.campaignId}
        AND type = ${insight.type}
        AND "createdAt" >= ${new Date(Date.now() - 24 * 60 * 60 * 1000)}
      LIMIT 1
    `;
    if (recentRows.length > 0) continue;

    const enriched = await enrichWithClaude(insight, tenantId, angleCtx);

    const campaign = await prisma.campaign.findUnique({ where: { id: insight.campaignId } });
    const resolvedTenantId = tenantId ?? campaign?.tenantId ?? null;
    if (resolvedTenantId && !resolvedTenantForDigest) resolvedTenantForDigest = resolvedTenantId;
    // PARTE D3 — rede da campanha, pra rotular no digest do WhatsApp quando o ciclo misturar redes
    const networkCode = await resolveNetworkCode((campaign as any)?.networkId);

    // Nome do cliente para o digest (campanha própria → client_id nulo → '')
    const clientRow = await prisma.$queryRaw<{ nome: string }[]>`
      SELECT cl.nome FROM campanhasmarketingdigital."Campaign" cam
      JOIN public.clientes cl ON cl.uuid = cam.client_id
      WHERE cam.id = ${insight.campaignId} LIMIT 1
    `.catch(() => []);
    const clientName = (clientRow as any)[0]?.nome ?? '';

    const isOffensive = OFFENSIVE_TYPES.includes(insight.type);
    const pin = isOffensive ? Math.floor(100000 + Math.random() * 900000).toString() : null;
    const pinExp = isOffensive ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null;

    const actionId = randomUUID();
    const actionStatus = DEFENSIVE_TYPES.includes(insight.type)
      ? 'PENDING_EXECUTION'
      : isOffensive
      ? 'PENDING_APPROVAL'
      : 'NOTIFIED';
    const actionDesc = enriched.description || insight.description;

    const scalePctVal = insight.type === 'SCALE' ? (insight.scalePct ?? null) : null;

    // Para SCALE: computa o budget proposto pelo agente e grava na linha
    let budgetProposed: number | null = null;
    if (insight.type === 'SCALE') {
      const tmpAction = { id: actionId, campaignId: insight.campaignId, campaignName: insight.campaignName, type: insight.type };
      const plan = await computeBudgetPlan(tmpAction, resolvedTenantId, insight.scalePct ?? undefined).catch(() => null);
      if (plan) budgetProposed = plan.proposedBudget;
    }

    await prisma.$executeRaw`
      INSERT INTO campanhasmarketingdigital."AgentAction"
        (id, tenant_id, "campaignId", "campaignName", type, title, description, confidence,
         approval_pin, approval_pin_exp, status, scale_pct, budget_proposed, "createdAt")
      VALUES
        (${actionId}, ${resolvedTenantId}::uuid, ${insight.campaignId}, ${insight.campaignName},
         ${insight.type}, ${insight.title}, ${actionDesc}, ${insight.confidence},
         ${pin}, ${pinExp}, ${actionStatus}, ${scalePctVal}, ${budgetProposed}, now())
    `;

    const action = { id: actionId, campaignId: insight.campaignId, campaignName: insight.campaignName,
      type: insight.type, title: insight.title, description: actionDesc,
      tenantId: resolvedTenantId, approvalPin: pin, approvalPinExp: pinExp, status: actionStatus };

    actionsCreated++;

    if (DEFENSIVE_TYPES.includes(insight.type)) {
      // Executa sem notificar individualmente — acumula no digest
      const budgetChange = await executeAction(action, resolvedTenantId, true, true);

      // Para PAUSE: busca o budget diário do AdSet para o cálculo financeiro do digest
      let pauseBudget: number | null = null;
      if (action.type === 'PAUSE') {
        const rows = await prisma.$queryRaw<{ budget: number }[]>`
          SELECT COALESCE(SUM(a."dailyBudget"), 0)::int AS budget
          FROM campanhasmarketingdigital."AdSet" a
          WHERE a."campaignId" = ${insight.campaignId}
        `.catch(() => []);
        pauseBudget = rows[0]?.budget ?? null;
      }

      digestItems.push({
        type:         action.type,
        campaignName: action.campaignName,
        clientName,
        actionId:     action.id,
        description:  action.description ?? '',
        network:      networkCode,
        budget:       budgetChange ? { before: budgetChange.before, after: budgetChange.after } : null,
        pauseBudget,
      });

    } else if (isOffensive) {
      let budget: DigestItem['budget'] = null;
      if (insight.type === 'SCALE') {
        // Passa o scalePct proporcional do aiInsights (null = usa benchmark configurado)
        const plan = await computeBudgetPlan(action, resolvedTenantId, insight.scalePct ?? undefined).catch(() => null);
        if (plan) budget = { current: plan.currentBudget, proposed: plan.proposedBudget, pct: plan.pct };
      }
      digestItems.push({
        type:         action.type,
        campaignName: action.campaignName,
        clientName,
        actionId:     action.id,
        description:  action.description ?? '',
        network:      networkCode,
        pin,
        budget,
        approveUrl: `${PUBLIC_DOMAIN}/api/agent/approve/${action.id}`,
        rejectUrl:  `${PUBLIC_DOMAIN}/api/agent/reject/${action.id}`,
      });

    } else {
      // ALERT — inclui no digest mas não precisa de aprovação
      digestItems.push({
        type:         'ALERT',
        campaignName: action.campaignName,
        clientName,
        actionId:     action.id,
        description:  action.description ?? '',
        network:      networkCode,
      });
      await prisma.$executeRaw`UPDATE campanhasmarketingdigital."AgentAction" SET status = 'NOTIFIED' WHERE id = ${action.id}`;
    }
  }

  // Uma única mensagem consolidada por tenant por tick
  if (digestItems.length > 0 && resolvedTenantForDigest) {
    try {
      await notifyDigest(resolvedTenantForDigest, digestItems);
    } catch (err) {
      console.error('[decisor] notifyDigest falhou:', err);
    }
  }

  return { actionsCreated };
}

async function enrichWithClaude(
  insight: any,
  tenantId?: string | null,
  angleCtx?: import('./angleInsightsService').AngleInsightsResult | null,
): Promise<{ description: string }> {
  try {
    const text = await invokeForContext({
      templateKey: 'agent_enrich',
      tenantId: tenantId ?? '',
      variables: {
        campaign_name:       insight.campaignName,
        insight_title:       insight.title,
        insight_description: insight.description,
        confidence:          (insight.confidence * 100).toFixed(0),
        winning_angle:       angleCtx?.topAngle?.label   ?? 'não identificado',
        worst_angle:         angleCtx?.worstAngle?.label ?? 'não identificado',
      },
      maxTokens: 200,
    });
    const json = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || '{}');
    return { description: json.description || insight.description };
  } catch {
    // fallback silencioso
  }
  return { description: insight.description };
}

// Retorna o budget change real (antes/depois) para inclusão no digest.
// skipNotify=true: chamado pelo runDecisor (digest cuida da notificação).
// skipNotify=false (default): chamado pelo approve route — envia confirmação individual.
export async function executeAction(
  action: any,
  tenantId: string | null,
  auto = true,
  skipNotify = false,
  customBudget?: number,   // budget total em centavos para SCALE — sobrescreve o cálculo do benchmark
): Promise<{ before: number; after: number } | null> {
  try {
    const campaign = await prisma.campaign.findUnique({ where: { id: action.campaignId } }) as any;
    // FIX: campaign.networkCode/external_id nunca existiram (schema real é networkId/externalId
    // camelCase) — toda campanha caía silenciosamente no fallback 'meta', mesmo sendo Google.
    const externalId = campaign?.externalId || campaign?.metaCampaignId;
    const networkCode = await resolveNetworkCode(campaign?.networkId);

    let budgetChange: { before: number; after: number } | null = null;

    if (action.type === 'ADD_NEGATIVE_KEYWORD') {
      // Google-only — mecânica real (chamada à API + memória) vive em googleNegationCore.ts,
      // compartilhada com a rota de negativação MANUAL (evita import circular com
      // googleNegationService.ts, que já importa executeAction deste arquivo).
      if (tenantId && networkCode === 'google') {
        const { applyNegation } = await import('./googleNegationCore');
        await applyNegation(tenantId, action.campaignId, externalId, action.negativeTerm, action.negativeMatchType, 'agent');
      }

      await prisma.$executeRaw`
        UPDATE campanhasmarketingdigital."AgentAction"
        SET status = 'EXECUTED', "executedAt" = now()
        WHERE id = ${action.id}
      `;
      if (!skipNotify) await notifyExecuted({ ...action, budget: null }, auto);
      return null;
    }

    if (action.type === 'PAUSE') {
      if (externalId && tenantId) {
        try {
          const networkService = await getNetworkServiceForTenant(tenantId, networkCode);
          await networkService.updateCampaignStatus(externalId, 'PAUSED');
        } catch { /* falha de rede não bloqueia transição local */ }
      }
      await prisma.campaign.update({ where: { id: action.campaignId }, data: { status: 'PAUSED' } });
      await transitionCampaign(action.campaignId, 'PAUSED', 'AGENT', action.description);

    } else if (action.type === 'DOWNSCALE') {
      const { segmentId, clientId } = await resolveCampaignSegment(action.campaignId, tenantId);
      const bm = await resolveBenchmarks(['downscale_budget_pct'], tenantId ?? '', segmentId, clientId);
      const factor = 1 - (bm.downscale_budget_pct ?? 30) / 100;

      const adSets = await prisma.adSet.findMany({ where: { campaignId: action.campaignId } });
      let before = 0, after = 0;
      for (const adSet of adSets) {
        const newBudget = Math.max(1, Math.round(adSet.dailyBudget * factor));
        before += adSet.dailyBudget || 0;
        after  += newBudget;
        await prisma.adSet.update({ where: { id: adSet.id }, data: { dailyBudget: newBudget } });
        if (externalId && tenantId) {
          try {
            const networkService = await getNetworkServiceForTenant(tenantId, networkCode);
            if (typeof (networkService as any).updateAdSetBudget === 'function') {
              await (networkService as any).updateAdSetBudget(
                (adSet as any).external_id || (adSet as any).metaAdSetId,
                newBudget,
              );
            }
          } catch { /* falha de rede não bloqueia */ }
        }
      }
      if (adSets.length > 0) budgetChange = { before, after };
      await transitionCampaign(action.campaignId, 'FATIGUED', 'AGENT', action.description);

    } else if (action.type === 'SCALE') {
      const { segmentId, clientId } = await resolveCampaignSegment(action.campaignId, tenantId);
      const bm = await resolveBenchmarks(
        ['scale_budget_pct', 'scale_budget_max', 'scale_budget_base_pct', 'scale_budget_max_pct'],
        tenantId ?? '', segmentId, clientId,
      );
      // Prioridade: scalePct do insight (proporcional) > base configurada > legado scale_budget_pct
      const scalePct  = (action as any).scalePct
        ?? bm.scale_budget_base_pct
        ?? bm.scale_budget_pct
        ?? 20;
      const cappedPct = Math.min(scalePct, bm.scale_budget_max_pct ?? 25);
      const factor    = 1 + cappedPct / 100;
      const maxBudget = bm.scale_budget_max ?? 0;

      const adSets = await prisma.adSet.findMany({ where: { campaignId: action.campaignId } });
      const totalCurrent = adSets.reduce((s, a) => s + (a.dailyBudget || 0), 0);
      let before = 0, after = 0;
      for (const adSet of adSets) {
        let newBudget: number;
        if (customBudget != null && totalCurrent > 0) {
          // Distribui proporcionalmente ao peso do adset no total atual
          const ratio = (adSet.dailyBudget || 0) / totalCurrent;
          newBudget = Math.max(1, Math.round(customBudget * ratio));
        } else {
          newBudget = Math.round(adSet.dailyBudget * factor);
          if (maxBudget > 0 && newBudget > maxBudget) newBudget = Math.round(maxBudget);
        }
        before += adSet.dailyBudget || 0;
        after  += newBudget;
        await prisma.adSet.update({ where: { id: adSet.id }, data: { dailyBudget: newBudget } });
        if (externalId && tenantId) {
          try {
            const networkService = await getNetworkServiceForTenant(tenantId, networkCode);
            if (typeof (networkService as any).updateAdSetBudget === 'function') {
              await (networkService as any).updateAdSetBudget(
                (adSet as any).external_id || (adSet as any).metaAdSetId,
                newBudget,
              );
            }
          } catch { /* falha de rede não bloqueia */ }
        }
      }
      if (adSets.length > 0) budgetChange = { before, after };
    }

    const bBefore = budgetChange?.before ?? null;
    const bAfter  = budgetChange?.after  ?? null;
    await prisma.$executeRaw`
      UPDATE campanhasmarketingdigital."AgentAction"
      SET status = 'EXECUTED', "executedAt" = now(),
          budget_before = ${bBefore}, budget_after = ${bAfter}
      WHERE id = ${action.id}
    `;

    // Confirmação individual apenas quando aprovado via painel (skipNotify=false)
    if (!skipNotify) {
      await notifyExecuted({ ...action, budget: budgetChange }, auto);
    }

    return budgetChange;
  } catch {
    await prisma.$executeRaw`UPDATE campanhasmarketingdigital."AgentAction" SET status = 'FAILED' WHERE id = ${action.id}`;
    return null;
  }
}
