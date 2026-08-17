/**
 * Resolve o filtro de período (botões 7/30/90 dias, "Personalizado" De/Até, "Histórico") do
 * Dashboard do CRM em bounds reais de data — nunca mais interpola `timeframe` direto num
 * `INTERVAL '${timeframe} days'`. Bug real (2026-08-16): as opções "Personalizado" e
 * "Histórico" sempre quebravam com "invalid input syntax for type interval" (Postgres
 * tentando parsear literalmente "custom days"/"all days") — nunca funcionaram desde que
 * foram adicionadas na UI, silenciosamente (o fetch falhava, o dashboard ficava com os
 * totais da última consulta bem-sucedida na tela, sem nenhum erro visível pro usuário).
 *
 * `from`/`to` sempre vêm como Date reais — nunca null — usando sentinelas de época bem
 * distante pra "sem limite", assim todo caller sempre faz bind de exatamente 2 parâmetros
 * de data, sem precisar montar SQL condicional nem interpolar texto de usuário na query.
 */
const EPOCH_START = new Date('1970-01-01T00:00:00.000Z')
const EPOCH_END = new Date('9999-12-31T23:59:59.999Z')
const DAYS_RE = /^\d+$/

export interface TimeframeRange {
  /** Limite inferior, inclusivo. */
  from: Date
  /** Limite superior, exclusivo. */
  to: Date
}

export function resolveTimeframeRange(
  timeframe: string,
  startDate?: string | null,
  endDate?: string | null,
): TimeframeRange {
  if (timeframe === 'all') {
    return { from: EPOCH_START, to: EPOCH_END }
  }

  if (timeframe === 'custom') {
    const from = startDate ? new Date(`${startDate}T00:00:00.000Z`) : null
    const to = endDate ? new Date(`${endDate}T00:00:00.000Z`) : null
    if (from && !isNaN(from.getTime()) && to && !isNaN(to.getTime())) {
      // Fim do dia inclusivo — mesmo idioma já usado no projeto (expandEndOfDay em
      // aiInsights.ts/strategicBriefing.ts): "Até 22/07" precisa cobrir o dia 22 inteiro.
      return { from, to: new Date(to.getTime() + 24 * 60 * 60 * 1000) }
    }
    // Datas ausentes/inválidas (ex.: usuário ainda não terminou de digitar) — cai no mesmo
    // default seguro do resto da tela (30 dias) em vez de quebrar a query.
  }

  const days = DAYS_RE.test(timeframe) ? parseInt(timeframe, 10) : 30
  return { from: new Date(Date.now() - days * 24 * 60 * 60 * 1000), to: EPOCH_END }
}
