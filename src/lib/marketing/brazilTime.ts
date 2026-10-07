/**
 * Helpers de data/hora em horário de Brasília, usados por qualquer serviço do servidor que
 * precise transformar uma data ("YYYY-MM-DD", sem hora) ou um horário de parede em um
 * instante real (UTC) — sem depender do fuso do processo Node.
 *
 * Achado real em produção (2026-10-07): os containers (prod_app/prod_feed) rodam com TZ=UTC
 * (confirmado ao vivo), mas toda data/horário desta plataforma é informado pelo admin em
 * horário de Brasília (único fuso atendido). `new Date("YYYY-MM-DD")` e `date.setHours()`
 * sempre operam no fuso do PROCESSO — nunca no de Brasília — então qualquer código que
 * confiava neles para "meia-noite do dia X" ou "22:40" ficava sistematicamente 3h deslocado
 * do horário real pretendido (achado originalmente em `organicRecurrenceService.ts`, FASE
 * 16.G/H; o mesmo padrão existia também no lançamento de campanha paga, `campaigns/route.ts`
 * — `start_time`/`end_time` do Ad Set são tratados pela Meta como timestamp UTC literal, não
 * reinterpretados pelo fuso da conta, confirmado na documentação oficial).
 *
 * Offset fixo, sem horário de verão — o Brasil não adota desde 2019 (decreto 10.166/2019),
 * então -03:00 nunca varia ao longo do ano.
 */

export const BR_OFFSET = '-03:00';

/** Componentes de data (ano/mês/dia) no fuso de Brasília, a partir de um instante real. */
export function brDateParts(instant: Date): { y: number; m: number; d: number } {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
  const [y, m, d] = fmt.format(instant).split('-').map(Number);
  return { y, m, d };
}

/** Instante real (UTC) correspondente a um horário de parede em Brasília (y/m/d hh:mm). */
export function brInstant(y: number, m: number, d: number, hh: number, mm: number, ss = 0, ms = 0): Date {
  const pad = (n: number, len = 2) => String(n).padStart(len, '0');
  return new Date(
    `${y}-${pad(m)}-${pad(d)}T${pad(hh)}:${pad(mm)}:${pad(ss)}.${String(ms).padStart(3, '0')}${BR_OFFSET}`,
  );
}

/** Próximo dia civil (y/m/d) — aritmética de calendário pura, nunca de instante/fuso real. */
export function nextCivilDay(y: number, m: number, d: number): { y: number; m: number; d: number } {
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + 1);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

/** Início do dia (00:00:00.000) em Brasília, a partir de uma data "YYYY-MM-DD" (sem hora). */
export function startOfDayBR(dateOnly: string): Date {
  const [y, m, d] = dateOnly.split('-').map(Number);
  return brInstant(y, m, d, 0, 0, 0, 0);
}

/** Fim do dia (23:59:59.999) em Brasília, a partir de uma data "YYYY-MM-DD" (sem hora). */
export function endOfDayBR(dateOnly: string): Date {
  const [y, m, d] = dateOnly.split('-').map(Number);
  return brInstant(y, m, d, 23, 59, 59, 999);
}
