import prisma from '../prisma';
import { generateAiInsights } from './aiInsights';
import { notifyApprovalRequired, notifyExecuted, notifyAlert } from './agentNotificador';
import { invokeForContext } from '../../intelligence/llmInvoker';
import { getNetworkServiceForTenant } from '../networks/factory';
import { transitionCampaign } from './campaignStateMachine';
import { getAngleInsights } from './angleInsightsService';

const CONFIDENCE_THRESHOLD = parseFloat(process.env.AGENT_CONFIDENCE_THRESHOLD || '0.85');
const DEFENSIVE_TYPES = ['PAUSE'];
const OFFENSIVE_TYPES = ['SCALE'];

export async function runDecisor(tenantId?: string) {
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

  // FASE 14b — contexto de ângulo para enriquecer recomendações do agente
  const angleCtx = await getAngleInsights(7, tenantId).catch(() => null);

  for (const insight of highConfidence) {
    // Evitar ações duplicadas nas últimas 24h para a mesma campanha+tipo
    const recent = await prisma.agentAction.findFirst({
      where: {
        campaignId: insight.campaignId,
        type: insight.type,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });
    if (recent) continue;

    const enriched = await enrichWithClaude(insight, tenantId, angleCtx);

    // Busca tenantId da campanha se não recebido
    const campaign = await prisma.campaign.findUnique({ where: { id: insight.campaignId } });
    const resolvedTenantId = tenantId ?? campaign?.tenantId ?? null;

    const action = await prisma.agentAction.create({
      data: {
        campaignId: insight.campaignId,
        campaignName: insight.campaignName,
        tenantId: resolvedTenantId,
        type: insight.type,
        title: insight.title,
        description: enriched.description || insight.description,
        confidence: insight.confidence,
        status: DEFENSIVE_TYPES.includes(insight.type)
          ? 'PENDING_EXECUTION'
          : OFFENSIVE_TYPES.includes(insight.type)
          ? 'PENDING_APPROVAL'
          : 'NOTIFIED',
      },
    });

    if (DEFENSIVE_TYPES.includes(insight.type)) {
      await executeAction(action, resolvedTenantId);
    } else if (OFFENSIVE_TYPES.includes(insight.type)) {
      await notifyApprovalRequired(action);
    } else {
      await notifyAlert(action);
      await prisma.agentAction.update({
        where: { id: action.id },
        data: { status: 'NOTIFIED' },
      });
    }
  }
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
        // FASE 14b — contexto de ângulo (disponível para templates que declarem {{winning_angle}})
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

export async function executeAction(action: any, tenantId: string | null) {
  try {
    const campaign = await prisma.campaign.findUnique({ where: { id: action.campaignId } }) as any;
    // Use external_id (FASE 1) with fallback to legacy metaCampaignId
    const externalId = campaign?.external_id || campaign?.metaCampaignId;
    if (!externalId || !tenantId) {
      await prisma.agentAction.update({ where: { id: action.id }, data: { status: 'FAILED' } });
      return;
    }

    // Determine network code (default meta for legacy campaigns)
    const networkCode = (campaign?.networkCode as any) || 'meta';

    if (action.type === 'PAUSE') {
      try {
        const networkService = await getNetworkServiceForTenant(tenantId, networkCode);
        await networkService.updateCampaignStatus(externalId, 'PAUSED');
      } catch {
        // Network call failed — still update local status
      }
      await prisma.campaign.update({
        where: { id: action.campaignId },
        data: { status: 'PAUSED' },
      });
      // FASE 4 — atualiza lifecycle
      await transitionCampaign(action.campaignId, 'PAUSED', 'AGENT', action.description);
    } else if (action.type === 'SCALE') {
      const adSet = await prisma.adSet.findFirst({ where: { campaignId: action.campaignId } });
      if (adSet) {
        const newBudget = Math.round(adSet.dailyBudget * 1.3);
        await prisma.adSet.update({
          where: { id: adSet.id },
          data: { dailyBudget: newBudget },
        });
      }
    }

    await prisma.agentAction.update({
      where: { id: action.id },
      data: { status: 'EXECUTED', executedAt: new Date() },
    });

    await notifyExecuted(action);
  } catch {
    await prisma.agentAction.update({
      where: { id: action.id },
      data: { status: 'FAILED' },
    });
  }
}
