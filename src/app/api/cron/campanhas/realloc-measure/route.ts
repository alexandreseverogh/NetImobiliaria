import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/cron/campanhas/realloc-measure
 * docs/PLANO_TIKTOK.md §8.4 — mede, D+14 depois de cada realocação de verba EXECUTED, se o
 * ganho de leads projetado se confirmou de verdade (grava actual_lead_gain + verdict). Fecha o
 * loop de aprendizado do motor de realocação (T4) — sem isso ele nunca melhora, e o circuit
 * breaker (§8.4/H15) nunca teria dado de onde disparar.
 *
 * Agendamento sugerido: diário (não precisa ser mais frequente — a janela de medição é de dias).
 * Protegido por CRON_SECRET.
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-cron-secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const startedAt = Date.now();

  try {
    const { measureDueReallocations } = await import('@/lib/marketing/services/reallocationMeasurement');
    const results = await measureDueReallocations();

    const byVerdict = results.reduce<Record<string, number>>((acc, r) => {
      acc[r.verdict] = (acc[r.verdict] ?? 0) + 1;
      return acc;
    }, {});

    const elapsed = Date.now() - startedAt;
    console.log(`[realloc-measure] measured=${results.length} ${JSON.stringify(byVerdict)} ${elapsed}ms`);

    return NextResponse.json({ ok: true, measured: results.length, byVerdict, elapsedMs: elapsed });
  } catch (error: any) {
    console.error('POST /cron/campanhas/realloc-measure error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
