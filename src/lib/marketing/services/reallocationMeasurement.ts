import prisma from '../prisma';
import { getLeadEvents, sumLeads, type LeadEvent } from './leadEvents';
import { resolveBenchmark } from '@/lib/intelligence/benchmarkResolver';
import { resolveSegment } from '@/lib/intelligence/segmentResolver';

/**
 * docs/PLANO_TIKTOK.md §8.4 — fecha o loop de aprendizado do motor de realocação (T4/T5):
 * mede, após a janela configurada da execução, se o ganho de leads projetado se confirmou de verdade, e
 * alimenta o circuit breaker (§8.4/H15) que protege a conta do cliente de um haircut mal
 * calibrado corroendo performance silenciosamente ao longo de várias propostas.
 */

// Janela de medição e limites do circuit breaker vêm do banco (regras realloc_*), por segmento.
// Os valores abaixo são só o fallback de segurança quando o segmento não tem a regra configurada.
const FALLBACK_WINDOW_DAYS = 14;
const FALLBACK_CB_WINDOW_DAYS = 90;
const FALLBACK_CB_THRESHOLD = 3;

/** Lê a regra do segmento do tenant. Retorna null quando não configurada (zero é valor válido
 *  no resolvedor, mas aqui 0 dias/0 propostas desligariam a regra, então tratamos como ausente). */
async function readRule(key: string, tenantId: string): Promise<number | null> {
  const seg = await resolveSegment(tenantId, null);
  if (!seg) return null;
  const v = await resolveBenchmark(key, tenantId, seg.id, null);
  return v > 0 ? v : null;
}

async function measurementWindowDays(tenantId: string): Promise<number> {
  return (await readRule('realloc_window_days', tenantId)) ?? FALLBACK_WINDOW_DAYS;
}

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

/** Mede as realocações EXECUTED já maduras (janela realloc_window_days, por tenant) e ainda não medidas, grava actual_lead_gain
 *  + verdict em cada uma. Retorna o que foi medido nesta rodada (pra digest/log do chamador). */
export async function measureDueReallocations(): Promise<MeasurementResult[]> {
  // Sem filtro de data aqui: a janela configurada (realloc_window_days) é checada por tenant
  // dentro do loop, então um 14 dias fixo nunca limita o que é medido.
  const due = await prisma.budgetReallocation.findMany({
    where: { status: 'EXECUTED', measuredAt: null },
  });
  if (due.length === 0) return [];

  const results: MeasurementResult[] = [];

  for (const r of due) {
    const executedAt = r.executedAt!;
    const windowDays = await measurementWindowDays(r.tenantId);
    // Só mede depois que a janela configurada já passou (não o 14 fixo de antes).
    if (Date.now() < executedAt.getTime() + windowDays * 86400000) continue;

    const before = { start: new Date(executedAt.getTime() - windowDays * 86400000), end: executedAt };
    const after = { start: executedAt, end: new Date(executedAt.getTime() + windowDays * 86400000) };

    const [sourceBefore, sourceAfter, targetBefore, targetAfter] = await Promise.all([
      getLeadEvents(r.tenantId, { campaignIds: [r.sourceCampaignId], startDate: before.start, endDate: before.end }),
      getLeadEvents(r.tenantId, { campaignIds: [r.sourceCampaignId], startDate: after.start, endDate: after.end }),
      getLeadEvents(r.tenantId, { campaignIds: [r.targetCampaignId], startDate: before.start, endDate: before.end }),
      getLeadEvents(r.tenantId, { campaignIds: [r.targetCampaignId], startDate: after.start, endDate: after.end }),
    ]);

    // Leads/dia antes vs. depois — mesma janela dos dois lados, então a diferença isola o
    // efeito da realocação (não uma sazonalidade genérica de "mais tráfego este mês").
    const perDay = (events: LeadEvent[]) => sumLeads(events) / windowDays;
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
  const windowDays = (await readRule('realloc_circuit_window_days', tenantId)) ?? FALLBACK_CB_WINDOW_DAYS;
  const threshold  = (await readRule('realloc_circuit_threshold', tenantId)) ?? FALLBACK_CB_THRESHOLD;
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
  const count = await prisma.budgetReallocation.count({
    where: { tenantId, verdict: 'BACKFIRED', measuredAt: { gte: since } },
  });
  return count >= threshold;
}
