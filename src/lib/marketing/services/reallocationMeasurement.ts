import prisma from '../prisma';
import { getLeadEvents, sumLeads, type LeadEvent } from './leadEvents';

/**
 * docs/PLANO_TIKTOK.md §8.4 — fecha o loop de aprendizado do motor de realocação (T4/T5):
 * mede, D+14 depois da execução, se o ganho de leads projetado se confirmou de verdade, e
 * alimenta o circuit breaker (§8.4/H15) que protege a conta do cliente de um haircut mal
 * calibrado corroendo performance silenciosamente ao longo de várias propostas.
 */

const MEASUREMENT_DELAY_DAYS = 14;
const MEASUREMENT_WINDOW_DAYS = 14; // mesma janela usada pra "antes" e "depois"
const CIRCUIT_BREAKER_WINDOW_DAYS = 90;
const CIRCUIT_BREAKER_THRESHOLD = 3;

// Confirma quando o ganho real bateu ao menos metade do projetado — tolerância deliberada
// (o haircut já é uma estimativa, não uma promessa exata). Nunca-positivo é sempre um fracasso
// claro (a realocação piorou ou não mudou nada), independente do quão perto do projetado.
const CONFIRMED_RATIO = 0.5;

export interface MeasurementResult {
  id: string;
  verdict: 'CONFIRMED' | 'NEUTRAL' | 'BACKFIRED';
  actualLeadGain: number;
  projectedLeadGain: number;
}

/** Mede todas as realocações EXECUTED há ≥14 dias e ainda não medidas, grava actual_lead_gain
 *  + verdict em cada uma. Retorna o que foi medido nesta rodada (pra digest/log do chamador). */
export async function measureDueReallocations(): Promise<MeasurementResult[]> {
  const cutoff = new Date(Date.now() - MEASUREMENT_DELAY_DAYS * 24 * 60 * 60 * 1000);

  const due = await prisma.budgetReallocation.findMany({
    where: { status: 'EXECUTED', measuredAt: null, executedAt: { lte: cutoff } },
  });
  if (due.length === 0) return [];

  const results: MeasurementResult[] = [];

  for (const r of due) {
    const executedAt = r.executedAt!;
    const before = { start: new Date(executedAt.getTime() - MEASUREMENT_WINDOW_DAYS * 86400000), end: executedAt };
    const after = { start: executedAt, end: new Date(executedAt.getTime() + MEASUREMENT_WINDOW_DAYS * 86400000) };

    const [sourceBefore, sourceAfter, targetBefore, targetAfter] = await Promise.all([
      getLeadEvents(r.tenantId, { campaignIds: [r.sourceCampaignId], startDate: before.start, endDate: before.end }),
      getLeadEvents(r.tenantId, { campaignIds: [r.sourceCampaignId], startDate: after.start, endDate: after.end }),
      getLeadEvents(r.tenantId, { campaignIds: [r.targetCampaignId], startDate: before.start, endDate: before.end }),
      getLeadEvents(r.tenantId, { campaignIds: [r.targetCampaignId], startDate: after.start, endDate: after.end }),
    ]);

    // Leads/dia antes vs. depois — mesma janela dos dois lados, então a diferença isola o
    // efeito da realocação (não uma sazonalidade genérica de "mais tráfego este mês").
    const perDay = (events: LeadEvent[]) => sumLeads(events) / MEASUREMENT_WINDOW_DAYS;
    const deltaSource = perDay(sourceAfter) - perDay(sourceBefore); // esperado negativo (perdeu verba)
    const deltaTarget = perDay(targetAfter) - perDay(targetBefore); // esperado positivo (ganhou verba)
    const actualLeadGain = deltaTarget + deltaSource;

    const projectedLeadGain = r.projectedLeadGain;
    let verdict: MeasurementResult['verdict'];
    if (actualLeadGain <= 0) {
      verdict = 'BACKFIRED';
    } else if (actualLeadGain >= projectedLeadGain * CONFIRMED_RATIO) {
      verdict = 'CONFIRMED';
    } else {
      verdict = 'NEUTRAL';
    }

    await prisma.budgetReallocation.update({
      where: { id: r.id },
      data: {
        status: 'MEASURED',
        measuredAt: new Date(),
        actualLeadGain,
        verdict,
      },
    });

    results.push({ id: r.id, verdict, actualLeadGain, projectedLeadGain });
  }

  return results;
}

/** §8.4 — ≥3 propostas BACKFIRED do tenant nos últimos 90 dias desliga a auto-sugestão
 *  (não apenas a auto-execução — o motor para de sugerir enquanto o padrão não for revisado). */
export async function isReallocationCircuitBreakerTripped(tenantId: string): Promise<boolean> {
  const since = new Date(Date.now() - CIRCUIT_BREAKER_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const count = await prisma.budgetReallocation.count({
    where: { tenantId, verdict: 'BACKFIRED', measuredAt: { gte: since } },
  });
  return count >= CIRCUIT_BREAKER_THRESHOLD;
}
