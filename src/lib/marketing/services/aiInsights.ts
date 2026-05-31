import prisma from '../prisma';
import { resolveSegment } from '../../intelligence/segmentResolver';
import { resolveBenchmarks, BenchmarkMap } from '../../intelligence/benchmarkResolver';

interface CampaignData {
  campaignId: string;
  campaignName: string;
  insights: any[];
  leads: number;
  totalSpend: number;
  avgCtr: number;
  avgCpc: number;
  avgFrequency: number;
  trend: 'up' | 'down' | 'stable';
  daysRunning: number;
  // FASE 5 — Video Metrics
  hasVideoMetrics: boolean;
  avgHookRate: number;  // video_views_3s / impressions * 100
}

interface InsightRule {
  check: (data: CampaignData, b: BenchmarkMap) => boolean;
  type: string;
  title: string;
  description: (data: CampaignData, b: BenchmarkMap) => string;
  confidence: (data: CampaignData, b: BenchmarkMap) => number;
}

const RULES: InsightRule[] = [
  {
    check: (d, b) => d.avgCtr < b.ctr_min && d.daysRunning >= b.min_days_running,
    type: 'PAUSE',
    title: 'CTR muito baixo',
    description: (d, b) =>
      `Campanha "${d.campaignName}" tem CTR ${d.avgCtr.toFixed(2)}% (mínimo: ${b.ctr_min}%) nos últimos ${d.daysRunning} dias. Considere pausar e trocar o criativo ou ajustar o público.`,
    confidence: (d, b) => Math.min(0.9, 0.6 + (d.daysRunning - b.min_days_running) * 0.1),
  },
  {
    check: (d, b) => d.avgFrequency > b.frequency_max,
    type: 'ALERT',
    title: 'Fadiga de anúncio detectada',
    description: (d, b) =>
      `Frequência ${d.avgFrequency.toFixed(1)}x na campanha "${d.campaignName}" (máximo: ${b.frequency_max}x). O público está vendo o anúncio muitas vezes. Expanda o público ou renove os criativos.`,
    confidence: (d, b) => Math.min(0.95, 0.7 + (d.avgFrequency - b.frequency_max) * 0.05),
  },
  {
    check: (d, b) => d.trend === 'up' && d.avgCpc > 0 && d.daysRunning >= b.min_days_running,
    type: 'ALERT',
    title: 'CPC em tendência de alta',
    description: (d) =>
      `O CPC da campanha "${d.campaignName}" está subindo. CPC atual: R$${d.avgCpc.toFixed(2)}. Possível saturação do público-alvo.`,
    confidence: () => 0.7,
  },
  {
    check: (d, b) => d.totalSpend > b.spend_no_lead && d.leads === 0 && d.daysRunning >= b.min_days_running,
    type: 'PAUSE',
    title: 'Gasto sem resultados',
    description: (d, b) =>
      `A campanha "${d.campaignName}" gastou R$${d.totalSpend.toFixed(2)} (limite: R$${b.spend_no_lead}) sem gerar nenhum lead. Recomendamos pausar e reavaliar.`,
    confidence: (d, b) => Math.min(0.95, 0.75 + d.totalSpend / (b.spend_no_lead * 10)),
  },
  {
    check: (d, b) => d.leads >= b.min_leads_scale && d.avgCtr >= b.ctr_scale,
    type: 'SCALE',
    title: 'Campanha com bom desempenho',
    description: (d, b) =>
      `A campanha "${d.campaignName}" tem CTR ${d.avgCtr.toFixed(2)}% e gerou ${d.leads} leads (mínimo: ${b.min_leads_scale}). Considere aumentar o orçamento diário para escalar resultados.`,
    confidence: (d) => Math.min(0.9, 0.6 + d.leads * 0.02),
  },
  {
    check: (d, b) => d.leads > 0 && d.totalSpend > 0 && d.totalSpend / d.leads > b.cpl_ideal,
    type: 'OPTIMIZE',
    title: 'CPL acima do ideal',
    description: (d, b) => {
      const cpl = d.totalSpend / d.leads;
      return `O CPL da campanha "${d.campaignName}" é R$${cpl.toFixed(2)} (ideal: R$${b.cpl_ideal}). Tente segmentar melhor o público ou testar novos criativos.`;
    },
    confidence: () => 0.75,
  },
  // FASE 5 — Hook Rate fraco (só dispara para campanhas com vídeo)
  {
    check: (d, b) => d.hasVideoMetrics && d.avgHookRate > 0 && d.avgHookRate < (b.hook_rate_min ?? 12),
    type: 'ALERT',
    title: 'Hook Rate fraco',
    description: (d, b) => {
      const isCritical = d.avgHookRate < (b.hook_rate_critical ?? 8);
      return isCritical
        ? `Hook Rate ${d.avgHookRate.toFixed(1)}% na campanha "${d.campaignName}" está CRÍTICO (mínimo: ${b.hook_rate_critical ?? 8}%). O vídeo não está retendo atenção — considere pausar e regravar a abertura.`
        : `Hook Rate ${d.avgHookRate.toFixed(1)}% na campanha "${d.campaignName}" está abaixo do esperado (ideal: ${b.hook_rate_min ?? 12}%). Revise os primeiros 3 segundos do vídeo.`;
    },
    confidence: (d, b) => {
      const gap = (b.hook_rate_min ?? 12) - d.avgHookRate;
      return Math.min(0.95, 0.6 + gap * 0.03);
    },
  },
];

function calculateTrend(insights: any[]): 'up' | 'down' | 'stable' {
  if (insights.length < 4) return 'stable';
  const mid = Math.floor(insights.length / 2);
  const recent = insights.slice(0, mid);
  const older = insights.slice(mid);
  const recentAvg = recent.reduce((s: number, i: any) => s + (i.cpc || 0), 0) / recent.length;
  const olderAvg = older.reduce((s: number, i: any) => s + (i.cpc || 0), 0) / older.length;
  if (recentAvg > olderAvg * 1.15) return 'up';
  if (recentAvg < olderAvg * 0.85) return 'down';
  return 'stable';
}

export async function generateAiInsights(
  campaignId?: string,
  tenantId?: string,
  clientId?: string,
) {
  const where: any = {};
  if (campaignId) where.id = campaignId;
  if (tenantId)   where.tenantId = tenantId;
  if (clientId === 'own') {
    where.clientId = null;
  } else if (clientId) {
    where.clientId = clientId;
  }

  const campaigns = await prisma.campaign.findMany({ where });

  // Resolve benchmarks once for this tenant+client context
  const segment = tenantId ? await resolveSegment(tenantId, clientId) : null;
  const benchmarks = tenantId
    ? await resolveBenchmarks(
        ['cpl_ideal', 'ctr_min', 'ctr_scale', 'frequency_max', 'spend_no_lead', 'min_leads_scale', 'min_days_running', 'hook_rate_critical', 'hook_rate_min'],
        tenantId,
        segment?.id ?? null,
        clientId,
      )
    : { cpl_ideal: 30, ctr_min: 1, ctr_scale: 2, frequency_max: 3, spend_no_lead: 50, min_leads_scale: 5, min_days_running: 3, hook_rate_critical: 8, hook_rate_min: 12 };

  const allInsights: any[] = [];

  for (const campaign of campaigns) {
    const insightWhere: any = { campaignId: campaign.id };
    if (tenantId) insightWhere.tenantId = tenantId;

    const insights = await prisma.insight.findMany({
      where: insightWhere,
      orderBy: { date: 'desc' },
      take: 14,
    });

    const leadWhere: any = { campaignId: campaign.id };
    if (tenantId) leadWhere.tenantId = tenantId;
    const leads = await prisma.lead.count({ where: leadWhere });

    if (insights.length === 0) continue;

    const totalSpend       = insights.reduce((s, i) => s + i.spend, 0);
    const totalImpressions = insights.reduce((s, i) => s + i.impressions, 0);
    const totalClicks      = insights.reduce((s, i) => s + i.clicks, 0);
    const avgFrequency     = insights.reduce((s, i) => s + (i.frequency || 0), 0) / insights.length;

    // FASE 5 — Video Metrics
    const totalVideoViews3s = insights.reduce((s, i) => s + (i.videoViews3s || 0), 0);
    const hasVideoMetrics   = totalVideoViews3s > 0;
    const avgHookRate       = hasVideoMetrics && totalImpressions > 0
      ? (totalVideoViews3s / totalImpressions) * 100
      : 0;

    const data: CampaignData = {
      campaignId: campaign.id,
      campaignName: campaign.name,
      insights,
      leads,
      totalSpend,
      avgCtr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
      avgCpc: totalClicks > 0 ? totalSpend / totalClicks : 0,
      avgFrequency,
      trend: calculateTrend(insights),
      daysRunning: insights.length,
      hasVideoMetrics,
      avgHookRate,
    };

    for (const rule of RULES) {
      if (rule.check(data, benchmarks)) {
        allInsights.push({
          campaignId: campaign.id,
          campaignName: campaign.name,
          type: rule.type,
          title: rule.title,
          description: rule.description(data, benchmarks),
          confidence: rule.confidence(data, benchmarks),
        });
      }
    }
  }

  return allInsights.sort((a, b) => b.confidence - a.confidence);
}
