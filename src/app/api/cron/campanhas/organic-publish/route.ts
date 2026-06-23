import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/cron/campanhas/organic-publish
 * FASE 16.F/G — Publica posts agendados vencidos + gera posts de recorrências ativas.
 *
 * Agendamento sugerido: a cada 5 minutos.
 * Protegido por CRON_SECRET (header x-cron-secret).
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-cron-secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const startedAt = Date.now();
  try {
    const [{ runDueScheduledPosts }, { generateDuePosts }] = await Promise.all([
      import('@/lib/marketing/services/organicPublishService'),
      import('@/lib/marketing/services/organicRecurrenceService'),
    ]);

    const [publishResult, generateResult] = await Promise.all([
      runDueScheduledPosts(),
      generateDuePosts(),
    ]);

    const elapsed = Date.now() - startedAt;
    console.log(
      `[organic-publish] published=${publishResult.published} failed=${publishResult.failed}` +
      ` | recurrence: processed=${generateResult.processed} generated=${generateResult.generated}` +
      ` | ${elapsed}ms`,
    );

    return NextResponse.json({ ok: true, publish: publishResult, recurrence: generateResult, elapsedMs: elapsed });
  } catch (error: any) {
    console.error('POST /cron/campanhas/organic-publish error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
