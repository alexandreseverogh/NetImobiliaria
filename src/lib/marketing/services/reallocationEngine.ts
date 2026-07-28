import { randomUUID } from 'crypto';
import prisma from '../prisma';
import { resolveBenchmarks } from '../../intelligence/benchmarkResolver';
import { resolveCampaignNetworkCodes } from '../networkFilterUtils';
import { getLeadEvents, sumLeads } from './leadEvents';
import { networkLabel } from '@/lib/marketing-utils';
import type { DigestItem } from './agentNotificador';

const PUBLIC_DOMAIN = process.env.PUBLIC_DOMAIN || 'http://localhost:3001';
const fmtBRL = (cents: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

/**
 * docs/PLANO_TIKTOK.md §8 — motor de realocação cross-rede. Responde: "deixar de investir
 * R$X na campanha Y de uma rede e passar a investir no Z de outra rede — vale a pena, e
 * quanto se ganha?". Não depende de nenhuma rede específica — já opera sobre Meta×Google
 * hoje, TikTok só aumenta o espaço de decisão quando entrar.
 *
 * A resposta ingênua ("CPL menor → move tudo pra lá") está errada por 4 razões, tratadas
 * explicitamente aqui: CPL médio ≠ marginal (haircut), comparabilidade de funil (mesmo
 * funnel_stage), fase de aprendizado (nunca mexe em campanha em learning), e headroom no
 * destino (não empurra verba pra quem já está saturado).
 */

const WINDOW_DAYS = 14; // mesma janela usada por aiInsights.ts

const BENCHMARK_KEYS = [
  'min_days_running', 'min_leads_scale', 'frequency_max', 'scale_budget_max_pct',
  'realloc_min_cpl_gap_pct', 'realloc_max_pct_of_source', 'realloc_marginal_haircut_pct',
  'realloc_max_abs_cents', 'realloc_cooldown_days',
];

export interface ReallocationCandidate {
  tenantId: string;
  clientId: string | null;
  segmentId: string | null;

  sourceCampaignId: string;
  sourceCampaignName: string;
  sourceNetwork: string;
  sourceCplBefore: number;
  sourceBudgetBefore: number;

  targetCampaignId: string;
  targetCampaignName: string;
  targetNetwork: string;
  targetCplBefore: number;
  targetBudgetBefore: number;

  amountCents: number;
  gapPct: number;
  projectedLeadGain: number;
  confidence: number;
}

interface CampaignStats {
  id: string;
  name: string;
  network: string;
  clientId: string | null;
  segmentId: string | null;
  funnelStage: string;
  totalSpend: number;
  leads: number;
  cpl: number;
  daysRunning: number;
  avgFrequency: number;
  learningStatus: string | null;
  searchBudgetLostIs: number;
  budget: number; // soma dos AdSets, centavos/dia
}

/** Encontra oportunidades de realocação elegíveis pro tenant, já ordenadas pelo ganho líquido
 *  projetado (maior primeiro). Não cria nada — só calcula; quem chama decide o que propor. */
export async function findReallocationOpportunities(tenantId: string): Promise<ReallocationCandidate[]> {
  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const until = new Date();

  const campaigns = await prisma.campaign.findMany({
    where: { tenantId, status: 'ACTIVE' },
    select: { id: true, name: true, clientId: true, networkId: true, funnelStage: true },
  });
  if (campaigns.length < 2) return [];

  const networkByCampaignId = await resolveCampaignNetworkCodes(campaigns as any);

  // Segmento efetivo por campanha (cliente → clientes.segment_id; própria → tenants.segment_id)
  const segmentByClientId = new Map<string | null, string | null>();
  const clientIds = Array.from(new Set(campaigns.map(c => c.clientId).filter(Boolean))) as string[];
  if (clientIds.length > 0) {
    const rows = await prisma.$queryRaw<{ uuid: string; segment_id: string | null }[]>`
      SELECT uuid, segment_id FROM public.clientes WHERE uuid = ANY(${clientIds}::uuid[])
    `;
    for (const r of rows) segmentByClientId.set(r.uuid, r.segment_id);
  }
  const tenantRow = await prisma.$queryRaw<{ segment_id: string | null }[]>`
    SELECT segment_id FROM public.tenants WHERE id = ${tenantId}::uuid
  `;
  const tenantSegmentId = tenantRow[0]?.segment_id ?? null;
  const segmentIdFor = (clientId: string | null) =>
    clientId ? (segmentByClientId.get(clientId) ?? null) : tenantSegmentId;

  const campaignIds = campaigns.map(c => c.id);
  const [insightGroups, leadEvents, adSets, recentInsights] = await Promise.all([
    prisma.insight.groupBy({
      by: ['campaignId'],
      where: { campaignId: { in: campaignIds }, date: { gte: since, lte: until } },
      _sum: { spend: true },
      _avg: { frequency: true, searchBudgetLostIs: true },
      _count: { id: true },
    }),
    getLeadEvents(tenantId, { campaignIds, startDate: since, endDate: until }),
    prisma.adSet.groupBy({
      by: ['campaignId'],
      where: { campaignId: { in: campaignIds } },
      _sum: { dailyBudget: true },
    }),
    // learningStatus mais recente por campanha (não dá pra agregar em groupBy)
    prisma.insight.findMany({
      where: { campaignId: { in: campaignIds }, date: { gte: since, lte: until } },
      orderBy: { date: 'desc' },
      select: { campaignId: true, learningStatus: true },
      distinct: ['campaignId'],
    }),
  ]);

  const leadsByCampaignId = new Map<string, number>();
  for (const c of campaigns) {
    leadsByCampaignId.set(c.id, sumLeads(leadEvents.filter(e => e.campaignId === c.id)));
  }
  const budgetByCampaignId = new Map(adSets.map(a => [a.campaignId, a._sum.dailyBudget ?? 0]));
  const learningByCampaignId = new Map(recentInsights.map(r => [r.campaignId, r.learningStatus]));
  const insightByCampaignId = new Map(insightGroups.map(g => [g.campaignId, g]));

  const stats: CampaignStats[] = campaigns.map(c => {
    const g = insightByCampaignId.get(c.id);
    const totalSpend = g?._sum.spend ?? 0;
    const leads = leadsByCampaignId.get(c.id) ?? 0;
    return {
      id: c.id,
      name: c.name,
      network: networkByCampaignId.get(c.id) ?? 'meta',
      clientId: c.clientId,
      segmentId: segmentIdFor(c.clientId),
      funnelStage: c.funnelStage ?? 'BOF',
      totalSpend,
      leads,
      cpl: leads > 0 ? totalSpend / leads : 0,
      daysRunning: g?._count.id ?? 0,
      avgFrequency: g?._avg.frequency ?? 0,
      searchBudgetLostIs: g?._avg.searchBudgetLostIs ?? 0,
      learningStatus: learningByCampaignId.get(c.id) ?? null,
      budget: budgetByCampaignId.get(c.id) ?? 0,
    };
  });

  // Benchmark por (segmento, rede) — resolvido 1x por par (segmento, rede) distinto no escopo,
  // igual ao padrão já usado em aiInsights.ts (T0).
  const benchmarkCache = new Map<string, Record<string, number>>();
  async function benchmarksFor(segmentId: string | null, clientId: string | null, network: string) {
    const key = `${segmentId}::${network}`;
    if (benchmarkCache.has(key)) return benchmarkCache.get(key)!;
    const bm = await resolveBenchmarks(BENCHMARK_KEYS, tenantId, segmentId, clientId, network);
    benchmarkCache.set(key, bm);
    return bm;
  }

  const candidates: ReallocationCandidate[] = [];

  for (const source of stats) {
    for (const target of stats) {
      if (source.id === target.id) continue;

      // E1 — mesmo cliente (own campaigns têm clientId=null, comparação direta serve)
      if (source.clientId !== target.clientId) continue;
      // E2 — mesmo segmento efetivo
      if (source.segmentId !== target.segmentId || !source.segmentId) continue;
      // E3 — mesmo funnel_stage
      if (source.funnelStage !== target.funnelStage) continue;
      // E4 — redes diferentes
      if (source.network === target.network) continue;
      // E7 — origem precisa ter lead (senão o caso é PAUSE, não realocação)
      if (source.leads === 0) continue;

      const bmSource = await benchmarksFor(source.segmentId, source.clientId, source.network);
      const bmTarget = await benchmarksFor(target.segmentId, target.clientId, target.network);

      // E5 — ambas maduras
      if (source.daysRunning < (bmSource.min_days_running ?? 3)) continue;
      if (target.daysRunning < (bmTarget.min_days_running ?? 3)) continue;
      // E6 — destino com eficiência provada, não promessa
      if (target.leads < (bmTarget.min_leads_scale ?? 5)) continue;
      // E8 — nenhuma das duas presa em aprendizado
      const learningBlock = ['LEARNING', 'LEARNING_LIMITED'];
      if (learningBlock.includes(source.learningStatus ?? '')) continue;
      if (learningBlock.includes(target.learningStatus ?? '')) continue;
      // E9 — destino com headroom real (não empurra verba pra quem já satura)
      const freqMax = bmTarget.frequency_max ?? 3;
      const hasHeadroom = target.network === 'google'
        ? target.searchBudgetLostIs > 0
        : target.avgFrequency < freqMax;
      if (!hasHeadroom) continue;
      // E11 — origem não é a única campanha ativa do seu funnel_stage no escopo
      const peersAtStage = stats.filter(s =>
        s.clientId === source.clientId && s.segmentId === source.segmentId && s.funnelStage === source.funnelStage,
      );
      if (peersAtStage.length < 2) continue;
      // E10 — sem proposta recente pro mesmo par (cooldown)
      const cooldownDays = bmSource.realloc_cooldown_days ?? 14;
      const recentPair = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM campanhasmarketingdigital."BudgetReallocation"
        WHERE tenant_id = ${tenantId}::uuid
          AND source_campaign_id = ${source.id} AND target_campaign_id = ${target.id}
          AND status IN ('PROPOSED','APPROVED','EXECUTED')
          AND created_at >= ${new Date(Date.now() - cooldownDays * 24 * 60 * 60 * 1000)}
        LIMIT 1
      `;
      if (recentPair.length > 0) continue;

      // Ganho de eficiência
      const gapPct = ((source.cpl - target.cpl) / source.cpl) * 100;
      const minGapPct = bmSource.realloc_min_cpl_gap_pct ?? 30;
      if (!isFinite(gapPct) || gapPct <= minGapPct) continue;

      // Valor a realocar — o menor dos 3 tetos
      const maxFromSourcePct = bmSource.realloc_max_pct_of_source ?? 30;
      const scaleMaxPct = bmTarget.scale_budget_max_pct ?? 25;
      const maxAbsCents = bmSource.realloc_max_abs_cents ?? 5000;
      const amountCents = Math.round(Math.min(
        source.budget * (maxFromSourcePct / 100),
        target.budget * (scaleMaxPct / 100),
        maxAbsCents,
      ));
      if (amountCents <= 0) continue;

      // Ganho projetado — com haircut marginal explícito (nunca assume CPL médio constante
      // no destino após receber verba extra)
      const haircutPct = bmSource.realloc_marginal_haircut_pct ?? 25;
      const targetCplMarginal = target.cpl * (1 + haircutPct / 100);
      const valorReais = amountCents / 100;
      const leadsLostSource = valorReais / source.cpl;
      const leadsGainedTarget = valorReais / targetCplMarginal;
      const projectedLeadGain = leadsGainedTarget - leadsLostSource;
      if (projectedLeadGain <= 0) continue;

      const confidence = Math.min(0.95,
        0.5
        + 0.2 * Math.min(1, gapPct / 50)
        + 0.2 * Math.min(1, target.leads / (2 * (bmTarget.min_leads_scale ?? 5)))
        + 0.1 * Math.min(1, target.daysRunning / 14),
      );

      candidates.push({
        tenantId,
        clientId: source.clientId,
        segmentId: source.segmentId,
        sourceCampaignId: source.id,
        sourceCampaignName: source.name,
        sourceNetwork: source.network,
        sourceCplBefore: source.cpl,
        sourceBudgetBefore: source.budget,
        targetCampaignId: target.id,
        targetCampaignName: target.name,
        targetNetwork: target.network,
        targetCplBefore: target.cpl,
        targetBudgetBefore: target.budget,
        amountCents,
        gapPct,
        projectedLeadGain,
        confidence,
      });
    }
  }

  return candidates.sort((a, b) => b.projectedLeadGain - a.projectedLeadGain);
}

/**
 * Converte oportunidades elegíveis em propostas reais: 1 `BudgetReallocation` (detalhe
 * bilateral) + 1 `AgentAction` (anchor de aprovação/PIN, reusa o fluxo já testado
 * `/api/agent/approve/[id]`) por par origem→destino. Sempre OFFENSIVE (docs/PLANO_TIKTOK.md
 * §8.4) — aumenta gasto numa rede, exige aprovação humana, nunca executa sozinho.
 *
 * No máximo 1 proposta por campanha-origem por ciclo (evita a mesma campanha aparecer como
 * origem de 2 propostas simultâneas na fila de aprovação).
 */
export async function runReallocationAgent(tenantId: string): Promise<{ proposalsCreated: number; digestItems: DigestItem[] }> {
  const candidates = await findReallocationOpportunities(tenantId);
  if (candidates.length === 0) return { proposalsCreated: 0, digestItems: [] };

  const seenSource = new Set<string>();
  const selected = candidates.filter(c => {
    if (seenSource.has(c.sourceCampaignId)) return false;
    seenSource.add(c.sourceCampaignId);
    return true;
  });

  const digestItems: DigestItem[] = [];
  let proposalsCreated = 0;

  for (const c of selected) {
    const actionId = randomUUID();
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    const pinExp = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const clientRow = c.clientId
      ? await prisma.$queryRaw<{ nome: string }[]>`SELECT nome FROM public.clientes WHERE uuid = ${c.clientId}::uuid LIMIT 1`.catch(() => [])
      : [];
    const clientName = (clientRow as any)[0]?.nome ?? '';

    const leadsGainedTxt = c.projectedLeadGain >= 1
      ? `+${c.projectedLeadGain.toFixed(1)} lead/dia`
      : `+${c.projectedLeadGain.toFixed(2)} lead/dia`;
    const description =
      `Realocar ${fmtBRL(c.amountCents)}/dia da campanha "${c.sourceCampaignName}" ` +
      `[${networkLabel(c.sourceNetwork)}] (CPL ${fmtBRL(Math.round(c.sourceCplBefore * 100))}) para ` +
      `"${c.targetCampaignName}" [${networkLabel(c.targetNetwork)}] (CPL ${fmtBRL(Math.round(c.targetCplBefore * 100))}) — ` +
      `vantagem de ${c.gapPct.toFixed(0)}%, ganho líquido projetado de ${leadsGainedTxt} (já descontada a degradação marginal esperada no destino).`;

    await prisma.$executeRaw`
      INSERT INTO campanhasmarketingdigital."AgentAction"
        (id, tenant_id, "campaignId", "campaignName", type, title, description, confidence,
         approval_pin, approval_pin_exp, status, "createdAt")
      VALUES
        (${actionId}, ${tenantId}::uuid, ${c.sourceCampaignId}, ${c.sourceCampaignName},
         'REALLOCATE_BUDGET', 'Oportunidade de realocação de verba', ${description}, ${c.confidence},
         ${pin}, ${pinExp}, 'PENDING_APPROVAL', now())
    `;

    await prisma.budgetReallocation.create({
      data: {
        id: randomUUID(),
        tenantId,
        clientId: c.clientId,
        segmentId: c.segmentId,
        sourceCampaignId: c.sourceCampaignId,
        sourceCampaignName: c.sourceCampaignName,
        sourceNetwork: c.sourceNetwork,
        sourceCplBefore: c.sourceCplBefore,
        sourceBudgetBefore: c.sourceBudgetBefore,
        targetCampaignId: c.targetCampaignId,
        targetCampaignName: c.targetCampaignName,
        targetNetwork: c.targetNetwork,
        targetCplBefore: c.targetCplBefore,
        targetBudgetBefore: c.targetBudgetBefore,
        amountCents: c.amountCents,
        gapPct: c.gapPct,
        projectedLeadGain: c.projectedLeadGain,
        confidence: c.confidence,
        status: 'PROPOSED',
        agentActionId: actionId,
      },
    });

    digestItems.push({
      type: 'REALLOCATE_BUDGET',
      campaignName: `${c.sourceCampaignName} → ${c.targetCampaignName}`,
      clientName,
      actionId,
      description,
      network: null, // 2 redes envolvidas — já rotuladas dentro da description
      pin,
      approveUrl: `${PUBLIC_DOMAIN}/api/agent/approve/${actionId}`,
      rejectUrl: `${PUBLIC_DOMAIN}/api/agent/reject/${actionId}`,
    });

    proposalsCreated++;
  }

  return { proposalsCreated, digestItems };
}
