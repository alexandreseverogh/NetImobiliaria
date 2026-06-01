/**
 * FASE 8.5 — signalEngine.ts
 *
 * Núcleo compartilhado da Signal-Driven Anticipation.
 * Lê os sinais de diagnóstico do Meta (rankings, frequência, CPM, learning)
 * e os normaliza numa leitura única de PRESSÃO (0-100).
 *
 * Alimenta DUAS saídas distintas:
 *  → aiInsights.ts  (Insights: "o quê / agora")
 *  → anticipationEngine.ts  (Farol: "quando / para onde")
 *
 * Nada hardcoded: pesos e limiares resolvidos via benchmarkResolver por segmento.
 */

import { resolveBenchmarks } from '@/lib/intelligence/benchmarkResolver';
import { resolveSegment } from '@/lib/intelligence/segmentResolver';
import { prisma } from '@/lib/marketing/prisma';

/* ──────────────────────────────────────────────────────────────
   TIPOS PÚBLICOS
────────────────────────────────────────────────────────────── */

export type RankingValue =
  | 'below_average_10'
  | 'below_average_20'
  | 'below_average_35'
  | 'average'
  | 'above_average'
  | null;

/** Sinais normalizados de uma campanha num dado momento */
export interface NormalizedSignals {
  campaignId: string;
  adsetId?: string;
  // Rankings (exógenos — relativos aos concorrentes)
  qualityRanking:        RankingValue;
  engagementRanking:     RankingValue;
  conversionRanking:     RankingValue;
  // Tendências de métricas contínuas (Δ% relativo à janela curta)
  cpmDeltaPct:    number;   // positivo = CPM subindo
  frequencyNow:   number;   // frequência atual
  frequencyDelta: number;   // taxa diária de crescimento (freq/dia)
  // Saturação de audiência
  firstImpressionRatioNow:   number;   // ratio hoje
  firstImpressionRatioDelta: number;   // negativo = piora
  // Learning
  learningStatus?:      string;
  learningConversions?: number;
  // Pressão computada (0-100)
  pressureScore: number;
}

export interface SignalWeights {
  engagement:    number;
  conversion:    number;
  quality:       number;
  cpmThreshold:  number;
  freqThreshold: number;
}

/* ──────────────────────────────────────────────────────────────
   RANKING → PESO NUMÉRICO
────────────────────────────────────────────────────────────── */

const RANKING_WEIGHT: Record<string, number> = {
  below_average_10: 1.0,  // pior decil — grita alto
  below_average_20: 0.8,
  below_average_35: 0.6,
  average:          0.2,
  above_average:    0.0,  // não grita
};

function rankWeight(r: RankingValue): number {
  if (!r) return 0;
  return RANKING_WEIGHT[r] ?? 0;
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/* ──────────────────────────────────────────────────────────────
   COMPUTE PRESSURE — converte sinais → score 0-100
────────────────────────────────────────────────────────────── */

export function computePressure(s: NormalizedSignals, w: SignalWeights): number {
  // 60% do score vem dos rankings (exógenos = "a voz do mercado")
  const rankPressure =
      w.engagement * rankWeight(s.engagementRanking)
    + w.conversion * rankWeight(s.conversionRanking)
    + w.quality    * rankWeight(s.qualityRanking);

  // 40% vem das tendências de CPM e frequência
  const trendPressure =
      clamp01((s.cpmDeltaPct    - w.cpmThreshold)  / 0.35)   // CPM acima do limiar
    + clamp01((s.frequencyNow   - w.freqThreshold)  / 2.0);  // freq acima do limiar

  return Math.min(100, Math.round(rankPressure * 60 + trendPressure * 40));
}

/* ──────────────────────────────────────────────────────────────
   DETECT TREND — computa Δ entre hoje e média curta (3-7 dias)
────────────────────────────────────────────────────────────── */

export type TrendDirection = 'up' | 'down' | 'stable';

export function detectTrend(series: number[], threshold = 0.05): TrendDirection {
  if (series.length < 2) return 'stable';
  const recent  = series.slice(-3);              // últimos 3 pontos
  const earlier = series.slice(0, -3);           // anteriores
  const avgRecent  = recent.reduce((a, b) => a + b, 0) / recent.length;
  const avgEarlier = earlier.length > 0
    ? earlier.reduce((a, b) => a + b, 0) / earlier.length
    : avgRecent;
  const delta = avgEarlier > 0 ? (avgRecent - avgEarlier) / avgEarlier : 0;
  if (delta >  threshold) return 'up';
  if (delta < -threshold) return 'down';
  return 'stable';
}

/* ──────────────────────────────────────────────────────────────
   COMPUTE SIGNALS FOR CAMPAIGN
   Busca últimos N dias de Insights da campanha, computa sinais
   normalizados e score de pressão via benchmarkResolver.
────────────────────────────────────────────────────────────── */

export async function computeSignalsForCampaign(
  campaignId: string,
  tenantId: string,
  clientId?: string | null,
  windowDays = 7,
): Promise<NormalizedSignals> {
  // 1. Buscar série histórica recente
  const since = new Date();
  since.setDate(since.getDate() - windowDays);

  const rows = await prisma.insight.findMany({
    where: {
      campaignId,
      date: { gte: since },
    },
    orderBy: { date: 'asc' },
    select: {
      date: true,
      cpm: true,
      frequency: true,
      firstImpressionRatio: true,
      qualityRanking:        true,
      engagementRateRanking: true,
      conversionRateRanking: true,
      learningStatus:        true,
      learningConversions:   true,
    },
  });

  // 2. Resolver pesos via benchmarkResolver (4 camadas, zero hardcode)
  const segment = await resolveSegment(tenantId, clientId ?? undefined);
  const bm = await resolveBenchmarks(
    ['pressure_w_engagement','pressure_w_conversion','pressure_w_quality',
     'cpm_delta_max','frequency_max'],
    tenantId,
    segment?.id ?? null,
    clientId ?? null,
  );
  const weights: SignalWeights = {
    engagement:    Number(bm.pressure_w_engagement ?? 0.40),
    conversion:    Number(bm.pressure_w_conversion  ?? 0.35),
    quality:       Number(bm.pressure_w_quality     ?? 0.25),
    cpmThreshold:  Number(bm.cpm_delta_max          ?? 0.20),
    freqThreshold: Number(bm.frequency_max          ?? 4.0),
  };

  // 3. Computar tendências das séries
  const cpmSeries  = rows.map(r => r.cpm  ?? 0).filter(v => v > 0);
  const freqSeries = rows.map(r => r.frequency  ?? 0).filter(v => v > 0);
  const firSeries  = rows.map(r => r.firstImpressionRatio ?? 0).filter(v => v > 0);

  const cpmNow    = cpmSeries.at(-1)  ?? 0;
  const cpmEarlier = cpmSeries.length > 1
    ? cpmSeries.slice(0, -1).reduce((a, b) => a + b, 0) / (cpmSeries.length - 1)
    : cpmNow;
  const cpmDeltaPct = cpmEarlier > 0 ? (cpmNow - cpmEarlier) / cpmEarlier : 0;

  const freqNow   = freqSeries.at(-1) ?? 0;
  const freqPrev  = freqSeries.at(-2) ?? freqNow;
  const freqDelta = freqNow - freqPrev; // por dia

  const firNow    = firSeries.at(-1) ?? 1;
  const firPrev   = firSeries.at(-2) ?? firNow;
  const firDelta  = firNow - firPrev;

  // 4. Rankings — pega o mais recente
  const latest = rows.at(-1);
  const qualityRanking:    RankingValue = (latest?.qualityRanking        ?? null) as RankingValue;
  const engagementRanking: RankingValue = (latest?.engagementRateRanking ?? null) as RankingValue;
  const conversionRanking: RankingValue = (latest?.conversionRateRanking ?? null) as RankingValue;

  // 5. Construir NormalizedSignals
  const signals: NormalizedSignals = {
    campaignId,
    qualityRanking,
    engagementRanking,
    conversionRanking,
    cpmDeltaPct,
    frequencyNow:  freqNow,
    frequencyDelta: freqDelta,
    firstImpressionRatioNow:   firNow,
    firstImpressionRatioDelta: firDelta,
    learningStatus:      latest?.learningStatus      ?? undefined,
    learningConversions: latest?.learningConversions ?? undefined,
    pressureScore: 0,  // computado abaixo
  };

  signals.pressureScore = computePressure(signals, weights);
  return signals;
}
