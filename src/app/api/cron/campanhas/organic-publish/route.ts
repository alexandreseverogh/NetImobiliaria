import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/cron/campanhas/organic-publish
 * FASE 16.F — Publica as publicações orgânicas agendadas cujo horário já chegou.
 *
 * Agendamento sugerido: a cada 5 minutos (cron: "* /5 * * * *").
 * Protegido por CRON_SECRET (header x-cron-secret).
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-cron-secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const startedAt = Date.now();
  try {
    const { runDueScheduledPosts } = await import('@/lib/marketing/services/organicPublishService');
    const result = await runDueScheduledPosts();

    const elapsed = Date.now() - startedAt;
    console.log(`[organic-publish] due=${result.due} published=${result.published} failed=${result.failed} ${elapsed}ms`);

    return NextResponse.json({ ok: true, ...result, elapsedMs: elapsed });
  } catch (error: any) {
    console.error('POST /cron/campanhas/organic-publish error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
