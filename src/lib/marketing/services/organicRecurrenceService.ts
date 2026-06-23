/**
 * FASE 16.G — Agendamento recorrente de publicações orgânicas.
 *
 * Cada OrganicRecurrenceSchedule define um template + regra de repetição
 * (dias da semana + horários). O cron chama `generateDuePosts` para materializar
 * OrganicPost individuais com status SCHEDULED até HORIZON dias à frente.
 */

import { prisma } from '@/lib/marketing/prisma';

const HORIZON_DAYS = 14; // gera posts até 14 dias à frente

export interface RecurrenceInput {
  tenantId:   string;
  clientId?:  string | null;
  platform:   'facebook' | 'instagram';
  format:     string;
  caption?:   string;
  mediaUrls?: string[];
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
    // Cancela posts SCHEDULED futuros vinculados
    await prisma.organicPost.updateMany({
      where: { recurrenceId: id, status: 'SCHEDULED', scheduledAt: { gt: new Date() } },
      data:  { status: 'DRAFT' },
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
  const until     = s.endDate && s.endDate < horizon ? s.endDate : horizon;

  if (from >= until) return 0;

  const daysOfWeek = s.daysOfWeek as number[];
  const timeslots  = s.timeslots  as string[];
  const startDate  = s.startDate;

  // Coleta todos os slots de data/hora no intervalo [from, until]
  const slots: Date[] = [];
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);

  while (cursor <= until) {
    if (cursor >= startDate && daysOfWeek.includes(cursor.getDay())) {
      for (const slot of timeslots) {
        const [hh, mm] = slot.split(':').map(Number);
        const dt = new Date(cursor);
        dt.setHours(hh, mm, 0, 0);
        if (dt > now && dt <= until) slots.push(new Date(dt));
      }
    }
    cursor.setDate(cursor.getDate() + 1);
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

  await prisma.organicPost.createMany({
    data: newSlots.map(dt => ({
      tenantId:     s.tenantId,
      clientId:     s.clientId,
      platform:     s.platform,
      format:       s.format,
      caption:      s.caption,
      mediaUrls:    s.mediaUrls as any,
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
    mediaKind:  r.mediaKind ?? null,
    startDate:  (r.startDate instanceof Date ? r.startDate : new Date(r.startDate)).toISOString().slice(0, 10),
    endDate:    r.endDate ? (r.endDate instanceof Date ? r.endDate : new Date(r.endDate)).toISOString().slice(0, 10) : null,
    daysOfWeek: (r.daysOfWeek as number[]) ?? [],
    timeslots:  (r.timeslots as string[]) ?? [],
    status:     r.status,
    createdAt:  (r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt)).toISOString(),
  };
}
