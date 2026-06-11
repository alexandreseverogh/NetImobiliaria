/**
 * FASE 18.2 — Cron: sinais exógenos reais (Google Trends) POR SEGMENTO
 * POST /api/cron/campanhas/exogenous-signals
 * Header: x-cron-secret
 * Frequência recomendada: diária (06:00 BRT)
 * ZERO MOCK — só persiste scores reais (source='trends').
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-cron-secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const startedAt = Date.now();
  const today     = new Date().toISOString().split('T')[0];

  try {
    const { listActiveSegments } = await import('@/lib/intelligence/segmentResolver');
    const { fetchSegmentAngleScores } = await import('@/lib/marketing/services/exogenousTrendsService');
    const pool = (await import('@/lib/database/connection')).default;

    const segments = await listActiveSegments();
    const client = await pool.connect();

    let totalUpserted = 0;
    const perSegment: { segment: string; upserted: number; failed: number }[] = [];

    try {
      for (const seg of segments) {
        const scores = await fetchSegmentAngleScores(seg.id);
        if (scores.length === 0) continue; // segmento sem ângulos (ex: master)

        const real = scores.filter(s => s.score !== null && s.source === 'trends');
        const failed = scores.length - real.length;

        await client.query('BEGIN');
        for (const s of real) {
          await client.query(
            `INSERT INTO campanhasmarketingdigital.exogenous_signals
               (segment_id, angle, signal_date, score, raw_values, term_used, geo, source)
             VALUES ($1::uuid, $2, $3::date, $4, $5::jsonb, $6, 'BR', 'trends')
             ON CONFLICT (segment_id, angle, signal_date, geo)
             DO UPDATE SET
               score      = EXCLUDED.score,
               raw_values = EXCLUDED.raw_values,
               term_used  = EXCLUDED.term_used`,
            [seg.id, s.angle, today, s.score, JSON.stringify(s.rawValues ?? []), s.term],
          );
          totalUpserted++;
        }
        await client.query('COMMIT');

        perSegment.push({ segment: seg.slug, upserted: real.length, failed });
      }

      // Invalida cache do dia se houve dados novos
      if (totalUpserted > 0) {
        await client.query(
          `DELETE FROM campanhasmarketingdigital.demand_radar_cache WHERE cache_date = $1::date`,
          [today],
        );
      }
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch { /* ignore */ }
      throw e;
    } finally {
      client.release();
    }

    const elapsedMs = Date.now() - startedAt;
    console.log(`[exogenous-signals] ${totalUpserted} sinais salvos em ${elapsedMs}ms`, JSON.stringify(perSegment));

    return NextResponse.json({ ok: true, date: today, totalUpserted, perSegment, elapsedMs });
  } catch (err: any) {
    console.error('[exogenous-signals] Erro crítico:', err?.message ?? err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? 'Erro interno', elapsedMs: Date.now() - startedAt },
      { status: 500 },
    );
  }
}
