/**
 * FASE 16.G — Agendamento recorrente de publicações orgânicas.
 *
 * Cada OrganicRecurrenceSchedule define um template + regra de repetição
 * (dias da semana + horários). O cron chama `generateDuePosts` para materializar
 * OrganicPost individuais com status SCHEDULED até HORIZON dias à frente.
 */

import { prisma } from '@/lib/marketing/prisma';
import { brDateParts, brInstant, nextCivilDay } from '@/lib/marketing/brazilTime';

const HORIZON_DAYS = 14; // gera posts até 14 dias à frente

// Achado real em produção (2026-10-07): os containers (prod_app/prod_feed) rodam com TZ=UTC
// (confirmado ao vivo — `new Date().toString()` imprime "GMT+0000"), mas `daysOfWeek`/
// `timeslots` são sempre informados pelo admin em horário de Brasília (é o único fuso que
// esta plataforma atende). A versão anterior usava `Date.setHours()`/`.getDay()` puros —
// métodos que operam no fuso DO PROCESSO, nunca no de Brasília — causando 2 efeitos
// silenciosos e reais: (1) o "dia de hoje" calculado pelo servidor já virava o dia seguinte
// assim que passava da meia-noite UTC (21h em Brasília), derrubando o 1º dia de qualquer
// recorrência criada à noite; (2) o horário gravado em `scheduled_at` era 3h mais cedo do
// que o admin digitou (22:40 digitado virava 22:40 UTC = 19:40 em Brasília, não 22:40).
// Os helpers (`@/lib/marketing/brazilTime`, compartilhados com `campaigns/route.ts` — mesmo
// achado existia no lançamento de campanha paga) sempre calculam/constroem em termos do
// calendário e horário de Brasília, nunca do fuso do processo.

export interface RecurrenceInput {
  tenantId:   string;
  clientId?:  string | null;
  platform:   'facebook' | 'instagram';
  format:     string;
  caption?:   string;
  mediaUrls?: string[];
  /** Pool de criativos para rodízio — cada posição é 1 post (pode ter >1 URL p/ carrossel).
   *  Quando preenchido, tem prioridade sobre `mediaUrls` (que vira só fallback legado). */
  mediaPool?: string[][];
  mediaKind?: string;
  startDate:  string;   // YYYY-MM-DD
  endDate?:   string;   // YYYY-MM-DD, opcional
  daysOfWeek: number[]; // [0-6], 0=Dom, 1=Seg ... 6=Sáb
  timeslots:  string[]; // ['09:00', '14:00']
  createdBy?: string | null;
}

export interface RecurrenceRecord {
  id:          string;
  tenantId:    string;
  clientId:    string | null;
  platform:    string;
  format:      string;
  caption:     string | null;
  mediaUrls:   string[];
  mediaPool:   string[][] | null;
  mediaKind:   string | null;
  startDate:   string;
  endDate:     string | null;
  daysOfWeek:  number[];
  timeslots:   string[];
  status:      string;
  createdAt:   string;
  postsCount?: number;
}

export async function createRecurrence(input: RecurrenceInput): Promise<RecurrenceRecord> {
  const rec = await prisma.organicRecurrenceSchedule.create({
    data: {
      tenantId:   input.tenantId,
      clientId:   input.clientId ?? null,
      platform:   input.platform,
      format:     input.format,
      caption:    input.caption ?? null,
      mediaUrls:  input.mediaUrls ?? [],
      mediaPool:  input.mediaPool && input.mediaPool.length > 0 ? input.mediaPool : undefined,
      mediaKind:  input.mediaKind ?? null,
      startDate:  new Date(input.startDate),
      endDate:    input.endDate ? new Date(input.endDate) : null,
      daysOfWeek: input.daysOfWeek,
      timeslots:  input.timeslots,
      status:     'ACTIVE',
      createdBy:  input.createdBy ?? null,
    },
  });

  // Gera posts imediatamente para o horizonte inicial
  await generatePostsForSchedule(rec.id);

  return toRecord(rec);
}

export async function listRecurrences(tenantId: string, clientId?: string | null): Promise<RecurrenceRecord[]> {
  const where: any = { tenantId, status: { not: 'CANCELLED' } };
  if (clientId === 'own') where.clientId = null;
  else if (clientId)      where.clientId = clientId;

  const rows = await prisma.organicRecurrenceSchedule.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { posts: true } } },
  });

  return rows.map(r => ({ ...toRecord(r), postsCount: r._count.posts }));
}

export async function updateRecurrenceStatus(
  id: string,
  tenantId: string,
  status: 'ACTIVE' | 'PAUSED' | 'CANCELLED',
): Promise<RecurrenceRecord | null> {
  const rec = await prisma.organicRecurrenceSchedule.findFirst({ where: { id, tenantId } });
  if (!rec) return null;

  if (status === 'CANCELLED') {
    // Remove definitivamente TODOS os posts pendentes vinculados — pedido explícito do
    // usuário: remover a recorrência é remoção de verdade, nunca deixa resíduo pra trás.
    // Achado real (2026-10-08): o filtro anterior só pegava `status='SCHEDULED' AND
    // scheduledAt > now` — um post cuja tentativa de publicação FALHOU (token Meta
    // inválido/expirado, por exemplo) fica com `status='FAILED'`, fora desse filtro, e
    // sobrevivia ao "cancelar" mesmo nunca tendo saído de verdade; o mesmo valia pra um post
    // SCHEDULED cujo horário já tinha passado mas o cron ainda não tinha processado (corrida
    // com o polling de 5 em 5 min). "Programada" cobre qualquer coisa que NUNCA chegou a
    // publicar — só PUBLISHED (histórico real, já foi ao ar) fica de fora.
    await prisma.organicPost.deleteMany({
      where: { recurrenceId: id, status: { in: ['DRAFT', 'SCHEDULED', 'FAILED', 'PUBLISHING'] } },
    });
  }

  const updated = await prisma.organicRecurrenceSchedule.update({
    where: { id },
    data:  { status },
  });
  return toRecord(updated);
}

/**
 * Chamado pelo cron: percorre recorrências ACTIVE e gera OrganicPosts
 * agendados até HORIZON_DAYS à frente.
 */
export async function generateDuePosts(): Promise<{ processed: number; generated: number }> {
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + HORIZON_DAYS);

  const schedules = await prisma.organicRecurrenceSchedule.findMany({
    where: {
      status: 'ACTIVE',
      startDate: { lte: horizon },
      OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
    },
  });

  let generated = 0;
  for (const s of schedules) {
    generated += await generatePostsForSchedule(s.id);
  }

  return { processed: schedules.length, generated };
}

async function generatePostsForSchedule(scheduleId: string): Promise<number> {
  const s = await prisma.organicRecurrenceSchedule.findUnique({ where: { id: scheduleId } });
  if (!s || s.status !== 'ACTIVE') return 0;

  const now       = new Date();
  const horizon   = new Date(); horizon.setDate(horizon.getDate() + HORIZON_DAYS);
  const from      = s.generatedUntil && s.generatedUntil > now ? s.generatedUntil : now;

  // s.endDate vem do banco como meia-noite UTC do dia calendário configurado (coluna DATE,
  // lida via getters UTC — é como o valor foi persistido, nunca fuso local). "Fim do dia"
  // precisa ser o fim do dia EM BRASÍLIA (23:59:59.999 -03:00), não no fuso do processo —
  // ver nota de fuso no topo do arquivo.
  const endOfDayLocal = s.endDate
    ? brInstant(s.endDate.getUTCFullYear(), s.endDate.getUTCMonth() + 1, s.endDate.getUTCDate(), 23, 59, 59, 999)
    : null;
  const until = endOfDayLocal && endOfDayLocal < horizon ? endOfDayLocal : horizon;

  if (from >= until) return 0;

  const daysOfWeek = s.daysOfWeek as number[];
  const timeslots  = s.timeslots  as string[];
  // s.startDate também é coluna DATE (meia-noite UTC do dia civil configurado) — comparado
  // abaixo só por dia civil (ms de Date.UTC), nunca por instante, já que "dia de início" é
  // um conceito de calendário, não de fuso.
  const startDayUtcMs = Date.UTC(s.startDate.getUTCFullYear(), s.startDate.getUTCMonth(), s.startDate.getUTCDate());

  // Coleta todos os slots de data/hora no intervalo [from, until], sempre em termos do
  // calendário e horário de Brasília (nunca do fuso do processo — ver nota no topo).
  const slots: Date[] = [];
  let { y, m, d } = brDateParts(from);

  while (brInstant(y, m, d, 0, 0) <= until) {
    const dayUtcMs = Date.UTC(y, m - 1, d);
    const weekday  = new Date(dayUtcMs).getUTCDay(); // dia da semana é propriedade do calendário, não do fuso
    if (dayUtcMs >= startDayUtcMs && daysOfWeek.includes(weekday)) {
      for (const slot of timeslots) {
        const [hh, mm] = slot.split(':').map(Number);
        const dt = brInstant(y, m, d, hh, mm);
        if (dt > now && dt <= until) slots.push(dt);
      }
    }
    ({ y, m, d } = nextCivilDay(y, m, d));
  }

  if (slots.length === 0) return 0;

  // Filtra slots que já têm post gerado (evita duplicatas)
  const existing = await prisma.organicPost.findMany({
    where: {
      recurrenceId: scheduleId,
      scheduledAt: { in: slots },
    },
    select: { scheduledAt: true },
  });
  const existingTs = new Set(existing.map(e => e.scheduledAt!.getTime()));
  const newSlots   = slots.filter(d => !existingTs.has(d.getTime()));

  if (newSlots.length === 0) {
    await prisma.organicRecurrenceSchedule.update({
      where: { id: scheduleId },
      data:  { generatedUntil: until },
    });
    return 0;
  }

  // Pool de criativos (rodízio round-robin) — quando ausente/vazio, cai no comportamento
  // legado (s.mediaUrls fixo repetido em toda ocorrência). O índice de rodízio é a
  // contagem de posts JÁ gerados por esta recorrência (não um contador à parte) — garante
  // continuidade do rodízio entre chamadas sucessivas do cron, sem precisar de coluna extra.
  const pool = (s.mediaPool as string[][] | null) ?? [];
  let rotationCursor = 0;
  if (pool.length > 0) {
    rotationCursor = await prisma.organicPost.count({ where: { recurrenceId: s.id } });
  }

  await prisma.organicPost.createMany({
    data: newSlots.map((dt, i) => ({
      tenantId:     s.tenantId,
      clientId:     s.clientId,
      platform:     s.platform,
      format:       s.format,
      caption:      s.caption,
      mediaUrls:    (pool.length > 0 ? pool[(rotationCursor + i) % pool.length] : (s.mediaUrls as any)) as any,
      mediaKind:    s.mediaKind,
      status:       'SCHEDULED',
      scheduledAt:  dt,
      recurrenceId: s.id,
      createdBy:    s.createdBy,
    })),
  });

  await prisma.organicRecurrenceSchedule.update({
    where: { id: scheduleId },
    data:  { generatedUntil: until },
  });

  return newSlots.length;
}

function toRecord(r: any): RecurrenceRecord {
  return {
    id:         r.id,
    tenantId:   r.tenantId,
    clientId:   r.clientId ?? null,
    platform:   r.platform,
    format:     r.format,
    caption:    r.caption ?? null,
    mediaUrls:  (r.mediaUrls as string[]) ?? [],
    mediaPool:  (r.mediaPool as string[][]) ?? null,
    mediaKind:  r.mediaKind ?? null,
    startDate:  (r.startDate instanceof Date ? r.startDate : new Date(r.startDate)).toISOString().slice(0, 10),
    endDate:    r.endDate ? (r.endDate instanceof Date ? r.endDate : new Date(r.endDate)).toISOString().slice(0, 10) : null,
    daysOfWeek: (r.daysOfWeek as number[]) ?? [],
    timeslots:  (r.timeslots as string[]) ?? [],
    status:     r.status,
    createdAt:  (r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt)).toISOString(),
  };
}
