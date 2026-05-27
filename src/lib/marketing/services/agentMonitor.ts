import cron from 'node-cron';
import prisma from '../prisma';
import { getNetworkServiceForTenant } from '../networks/factory';
import { runDecisor } from './agentDecisor';
import { generateStrategicBriefing } from './strategicBriefing';
import { notifyWhatsApp, notifySlack } from './agentNotificador';

const SYNC_SCHEDULE = process.env.AGENT_SYNC_SCHEDULE || '0 */6 * * *';
const BRIEFING_MORNING_SCHEDULE = process.env.BRIEFING_MORNING_SCHEDULE || '0 8 * * *';
const BRIEFING_CLOSING_SCHEDULE = process.env.BRIEFING_CLOSING_SCHEDULE || '0 18 * * *';

function formatBriefingForWhatsApp(briefing: any): string {
  const content = briefing.content as any;
  const typeLabel = briefing.type === 'morning' ? 'BRIEFING MATINAL' : briefing.type === 'closing' ? 'FECHAMENTO DO DIA' : 'BRIEFING';
  const date = new Date(briefing.createdAt).toLocaleDateString('pt-BR');

  let msg = `*${typeLabel} — ${date}*\n\n`;

  if (content.urgentAlerts?.length > 0) {
    msg += `*ALERTAS URGENTES*\n`;
    for (const alert of content.urgentAlerts) {
      msg += `- ${alert}\n`;
    }
    msg += '\n';
  }

  if (content.performanceSummary) {
    msg += `*RESUMO*\n${content.performanceSummary}\n\n`;
  }

  if (content.campaignAnalysis?.length > 0) {
    msg += `*CAMPANHAS*\n`;
    for (const c of content.campaignAnalysis) {
      const icon = c.status === 'critical' ? '🔴' : c.status === 'warning' ? '🟡' : '🟢';
      msg += `${icon} *${c.campaignName}*: ${c.recommendation}\n`;
    }
    msg += '\n';
  }

  if (content.budgetRecommendations?.length > 0) {
    msg += `*BUDGET*\n`;
    for (const rec of content.budgetRecommendations) {
      msg += `- ${rec}\n`;
    }
    msg += '\n';
  }

  if (content.actionItems?.length > 0) {
    msg += `*ACOES*\n`;
    for (const item of content.actionItems) {
      msg += `- ${item}\n`;
    }
    msg += '\n';
  }

  if (content.tomorrowPlan) {
    msg += `*AMANHA*\n${content.tomorrowPlan}\n`;
  }

  if (msg.length > 4096) {
    msg = msg.slice(0, 4090) + '\n...';
  }

  return msg;
}

/** Retorna lista de tenantIds distintos que possuem campanhas ativas */
export async function getActiveTenants(): Promise<string[]> {
  const rows = await prisma.campaign.findMany({
    where: { tenantId: { not: null } },
    select: { tenantId: true },
    distinct: ['tenantId'],
  });
  return rows.map(r => r.tenantId!).filter(Boolean);
}

export function startAgentMonitor() {
  console.log(`Agent Monitor iniciado — ciclo: ${SYNC_SCHEDULE}`);
  console.log(`Briefing matinal: ${BRIEFING_MORNING_SCHEDULE}`);
  console.log(`Briefing fechamento: ${BRIEFING_CLOSING_SCHEDULE}`);

  cron.schedule(SYNC_SCHEDULE, async () => {
    console.log('Agent Monitor: iniciando ciclo...');
    try {
      await syncMetrics(); // já itera internamente por tenant
      // Rodar decisor para cada tenant que tem campanhas
      const tenants = await getActiveTenants();
      await Promise.allSettled(tenants.map(tid => runDecisor(tid)));
      console.log('Agent Monitor: ciclo concluido');
    } catch (err) {
      console.error('Agent Monitor erro:', err);
    }
  });

  cron.schedule(BRIEFING_MORNING_SCHEDULE, async () => {
    console.log('Briefing matinal: gerando...');
    try {
      const tenants = await getActiveTenants();
      for (const tenantId of tenants) {
        const briefing = await generateStrategicBriefing('morning', tenantId);
        const message = formatBriefingForWhatsApp(briefing);
        await Promise.allSettled([
          notifyWhatsApp(message, tenantId),
          notifySlack(message),
        ]);
      }
      console.log('Briefing matinal enviado');
    } catch (err) {
      console.error('Briefing matinal erro:', err);
    }
  });

  cron.schedule(BRIEFING_CLOSING_SCHEDULE, async () => {
    console.log('Briefing fechamento: gerando...');
    try {
      const tenants = await getActiveTenants();
      for (const tenantId of tenants) {
        const briefing = await generateStrategicBriefing('closing', tenantId);
        const message = formatBriefingForWhatsApp(briefing);
        await Promise.allSettled([
          notifyWhatsApp(message, tenantId),
          notifySlack(message),
        ]);
      }
      console.log('Briefing fechamento enviado');
    } catch (err) {
      console.error('Briefing fechamento erro:', err);
    }
  });
}

export async function syncMetrics() {
  const campaigns = await prisma.campaign.findMany({
    where: { metaCampaignId: { not: null } },
    select: { id: true, tenantId: true, metaCampaignId: true },
  });

  const byTenant = new Map<string, typeof campaigns>();
  for (const c of campaigns) {
    const key = c.tenantId ?? '__global__';
    if (!byTenant.has(key)) byTenant.set(key, []);
    byTenant.get(key)!.push(c);
  }

  const until = new Date().toISOString().slice(0, 10);
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  for (const [tenantId, tenantCampaigns] of Array.from(byTenant.entries())) {
    if (tenantId === '__global__') continue;

    let networkService: Awaited<ReturnType<typeof getNetworkServiceForTenant>>;
    try {
      networkService = await getNetworkServiceForTenant(tenantId, 'meta');
    } catch {
      continue;
    }

    for (const campaign of tenantCampaigns) {
      if (!campaign.metaCampaignId) continue;
      try {
        const insights = await networkService.fetchInsights(campaign.metaCampaignId, { since, until });
        for (const day of insights) {
          const insightId = `${campaign.id}-${day.date}`;
          const insightBase = {
            impressions: day.impressions,
            reach:       day.reach,
            clicks:      day.clicks,
            spend:       day.spend,
            cpc:         day.cpc,
            cpm:         day.cpm,
            ctr:         day.ctr,
            frequency:   day.frequency,
            breakdowns:  {},
          };
          await prisma.insight.upsert({
            where: { id: insightId },
            update: insightBase,
            create: {
              id: insightId,
              campaignId: campaign.id,
              tenantId:   campaign.tenantId ?? null,
              date:       new Date(day.date),
              ...insightBase,
            },
          });
        }
      } catch (err) {
        console.error(`Erro ao sincronizar campanha ${campaign.id}:`, err);
      }
    }
  }
}
