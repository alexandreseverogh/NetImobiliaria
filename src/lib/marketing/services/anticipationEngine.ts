/**
 * FASE 8.5 — anticipationEngine.ts
 *
 * SAÍDA B do motor de sinais: "quando / para onde"
 * Produz TimeToEvent[] e Trajectory[] para a seção Farol de Milha.
 *
 * Não há regressão linear aqui. Há heurísticas fundamentadas em sinais leading:
 *  ① TIME-TO-FATIGUE    — frequência crescente → quando bate o limiar?
 *  ② TIME-TO-EXIT-LEARNING — conversões acumuladas → quando sai do learning?
 *  ③ AUDIENCE-EXHAUSTION — first_impression_ratio caindo → quando satura?
 *
 * Todos os limiares resolvidos por benchmarkResolver (4 camadas, zero hardcode).
 */

import { resolveBenchmarks } from '@/lib/intelligence/benchmarkResolver';
import { resolveSegment }    from '@/lib/intelligence/segmentResolver';
import { prisma }            from '@/lib/marketing/prisma';
import { detectTrend }       from './signalEngine';

/* ──────────────────────────────────────────────────────────────
   TIPOS PÚBLICOS
────────────────────────────────────────────────────────────── */

export interface TimeToEvent {
  event:      'FATIGUE' | 'EXIT_LEARNING' | 'AUDIENCE_EXHAUSTION';
  adsetId?:   string;
  campaignId: string;
  daysUntil:  number | null;   // null = não estimável ainda
  detail:     string;          // "freq 3.6→limiar 4.0, subindo 0.1/dia"
  confidence: number;          // 0-1
}

export interface Trajectory {
  signal:     'engagement_ranking' | 'cpm' | 'frequency' | 'first_impression_ratio';
  direction:  'up' | 'down' | 'stable';
  implication: string;  // "CTR tende a cair", "custo subindo"
  values:     number[]; // últimos N pontos para sparkline
}

export interface AnticipationResult {
  campaignId: string;
  events:      TimeToEvent[];
  trajectories: Trajectory[];
}

/* ──────────────────────────────────────────────────────────────
   ENGINE PRINCIPAL
────────────────────────────────────────────────────────────── */

export async function computeAnticipation(
  campaignId: string,
  tenantId:   string,
  clientId?:  string | null,
  windowDays = 7,
): Promise<AnticipationResult> {

  const since = new Date();
  since.setDate(since.getDate() - windowDays);

  // Buscar série histórica com sinais
  const rows = await prisma.insight.findMany({
    where: { campaignId, date: { gte: since } },
    orderBy: { date: 'asc' },
    select: {
      date: true,
      cpm: true,
      frequency: true,
      firstImpressionRatio:  true,
      learningStatus:        true,
      learningConversions:   true,
      engagementRateRanking: true,
      conversions:           true,
    },
  });

  // Resolver limiares (zero hardcode)
  const segment = await resolveSegment(tenantId, clientId ?? undefined);
  const bm = await resolveBenchmarks(
    ['frequency_max', 'learning_conv_target', 'fir_floor'],
    tenantId,
    segment?.id ?? null,
    clientId ?? null,
  );

  const freqMax     = bm.frequency_max       ?? 4.0;
  const convTarget  = bm.learning_conv_target ?? 50;
  const firFloor    = bm.fir_floor            ?? 0.20;

  const events:      TimeToEvent[] = [];
  const trajectories: Trajectory[] = [];

  // Séries de valores para cálculos de tendência
  const freqSeries  = rows.map(r => r.frequency         ?? 0).filter(v => v > 0);
  const cpmSeries   = rows.map(r => r.cpm               ?? 0).filter(v => v > 0);
  const firSeries   = rows.map(r => r.firstImpressionRatio ?? 0).filter(v => v > 0);
  const convSeries  = rows.map(r => r.conversions        ?? 0);

  /* ① TIME-TO-FATIGUE ─────────────────────────────────────────
     Δf_dia = (freq_hoje − freq_há_N) / N
     daysUntil = (freqMax − freqNow) / Δf_dia
  ─────────────────────────────────────────────────────────── */
  if (freqSeries.length >= 2) {
    const freqNow  = freqSeries.at(-1)!;
    const N        = freqSeries.length - 1;
    const deltaPerDay = (freqNow - freqSeries[0]) / N;

    if (freqNow < freqMax) {
      const daysUntil = deltaPerDay > 0
        ? Math.ceil((freqMax - freqNow) / deltaPerDay)
        : null;

      events.push({
        event:      'FATIGUE',
        campaignId,
        daysUntil,
        confidence: deltaPerDay > 0 ? 0.80 : 0.40,
        detail: deltaPerDay > 0
          ? `Freq ${freqNow.toFixed(1)}x subindo ${deltaPerDay.toFixed(2)}/dia → limiar ${freqMax}x`
          : `Freq ${freqNow.toFixed(1)}x estável (limiar ${freqMax}x) — sem risco imediato`,
      });
    } else {
      // Já passou do limiar — fadiga iminente
      events.push({
        event: 'FATIGUE', campaignId, daysUntil: 0, confidence: 0.93,
        detail: `Freq ${freqNow.toFixed(1)}x já ultrapassa limiar ${freqMax}x — fadiga ativa`,
      });
    }
  }

  /* ② TIME-TO-EXIT-LEARNING ──────────────────────────────────
     restantes = convTarget − learning_conversions
     r_dia     = média recente de conversões/dia
     daysUntil = restantes / r_dia
  ─────────────────────────────────────────────────────────── */
  const latestRow = rows.at(-1);
  if (latestRow?.learningStatus === 'LEARNING' || latestRow?.learningStatus === 'LEARNING_LIMITED') {
    const accumulated = latestRow.learningConversions ?? 0;
    const remaining   = Math.max(0, convTarget - accumulated);

    // Taxa de conversão recente (média dos últimos 3 dias)
    const recentConv  = convSeries.slice(-3);
    const rDia        = recentConv.length > 0
      ? recentConv.reduce((a, b) => a + b, 0) / recentConv.length
      : 0;

    const daysUntil = rDia > 0 ? Math.ceil(remaining / rDia) : null;

    events.push({
      event:      'EXIT_LEARNING',
      campaignId,
      daysUntil:  remaining === 0 ? 0 : daysUntil,
      confidence: rDia > 0 ? 0.75 : 0.35,
      detail: remaining === 0
        ? `${accumulated}/${convTarget} conversões — deve sair do learning em breve`
        : `Faltam ${remaining} de ${convTarget} conversões (${accumulated} acumuladas)${rDia > 0 ? ` · ~${rDia.toFixed(1)}/dia` : ''}`,
    });
  }

  /* ③ AUDIENCE-EXHAUSTION ────────────────────────────────────
     first_impression_ratio caindo e < floor → esgotamento
  ─────────────────────────────────────────────────────────── */
  if (firSeries.length >= 2) {
    const firNow  = firSeries.at(-1)!;
    const trendDir = detectTrend(firSeries);
    const isLow    = firNow < firFloor;

    if (isLow || trendDir === 'down') {
      const daysUntil = isLow
        ? (firNow < firFloor * 0.5 ? 0 : null)  // já crítico ou desconhecido
        : null;

      events.push({
        event:      'AUDIENCE_EXHAUSTION',
        campaignId,
        daysUntil,
        confidence: isLow ? 0.85 : 0.60,
        detail: `${(firNow * 100).toFixed(0)}% de impressões novas (piso ${(firFloor * 100).toFixed(0)}%) — ${trendDir === 'down' ? 'caindo' : 'abaixo do mínimo'}`,
      });
    }
  }

  /* TRAJECTORIES ─────────────────────────────────────────────
     Sinais leading com direção e implicação textual
  ─────────────────────────────────────────────────────────── */

  if (cpmSeries.length >= 3) {
    const dir = detectTrend(cpmSeries);
    trajectories.push({
      signal:      'cpm',
      direction:    dir,
      implication:  dir === 'up'   ? 'Custo de mídia subindo — concorrência cresceu no leilão'
                  : dir === 'down' ? 'Custo de mídia caindo — menor pressão competitiva'
                  :                  'CPM estável',
      values: cpmSeries.slice(-7),
    });
  }

  if (freqSeries.length >= 3) {
    const dir = detectTrend(freqSeries);
    trajectories.push({
      signal:      'frequency',
      direction:    dir,
      implication:  dir === 'up'   ? 'Frequência crescendo — público sendo reexposto (fadiga se aproxima)'
                  : dir === 'down' ? 'Frequência caindo — bom sinal, público renovando'
                  :                  'Frequência estável',
      values: freqSeries.slice(-7),
    });
  }

  if (firSeries.length >= 3) {
    const dir = detectTrend(firSeries);
    trajectories.push({
      signal:      'first_impression_ratio',
      direction:    dir,
      implication:  dir === 'down' ? 'Menos impressões novas — público se esgotando'
                  : dir === 'up'   ? 'Mais impressões novas — alcance se ampliando'
                  :                  'Saturação de audiência estável',
      values: firSeries.slice(-7),
    });
  }

  // Ranking de engajamento como trajetória categórica
  const engRankingSeries = rows
    .map(r => r.engagementRateRanking ?? 'average')
    .filter(Boolean);

  if (engRankingSeries.length >= 2) {
    const rankToNum = (r: string) =>
      ({ below_average_10: 0.1, below_average_20: 0.3, below_average_35: 0.5, average: 0.65, above_average: 1.0 }[r] ?? 0.5);

    const numSeries = engRankingSeries.map(rankToNum);
    const dir = detectTrend(numSeries);
    trajectories.push({
      signal:      'engagement_ranking',
      direction:    dir,
      implication:  dir === 'down' ? 'Engajamento piorando vs. concorrentes — CTR tende a cair'
                  : dir === 'up'   ? 'Engajamento melhorando vs. concorrentes — CTR tende a subir'
                  :                  'Engajamento estável',
      values: numSeries.slice(-7),
    });
  }

  return { campaignId, events, trajectories };
}
