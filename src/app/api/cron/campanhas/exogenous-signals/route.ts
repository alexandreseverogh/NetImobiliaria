/**
 * FASE 18.1 — Cron: Atualização de sinais exógenos (Google Trends)
 * POST /api/cron/campanhas/exogenous-signals
 * Header: x-cron-secret
 * Frequência recomendada: diária (06:00 BRT)
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-cron-secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const startedAt = Date.now();
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  try {
    const { fetchAllAngleScores } = await import(
      '@/lib/marketing/services/exogenousTrendsService'
    );
    const pool = (await import('@/lib/database/connection')).default;

    const scores = await fetchAllAngleScores();
    const client = await pool.connect();

    let upserted = 0;
    try {
      await client.query('BEGIN');
      for (const score of scores) {
        await client.query(
          `INSERT INTO campanhasmarketingdigital.exogenous_signals
             (angle, signal_date, score, raw_values, term_used, geo, source)
           VALUES ($1, $2::date, $3, $4::jsonb, $5, 'BR', $6)
           ON CONFLICT (angle, signal_date, geo)
           DO UPDATE SET
             score      = EXCLUDED.score,
             raw_values = EXCLUDED.raw_values,
             term_used  = EXCLUDED.term_used,
             source     = EXCLUDED.source`,
          [score.angle, today, score.score, JSON.stringify(score.rawValues ?? []), score.term, score.source],
        );
        upserted++;
      }
      // Invalidar caches do dia para forçar recompute
      await client.query(
        `DELETE FROM campanhasmarketingdigital.demand_radar_cache WHERE cache_date = $1::date`,
        [today],
      );
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    const elapsedMs = Date.now() - startedAt;
    const hasTrends = scores.some(s => s.source === 'trends');

    console.log(`[exogenous-signals] ${upserted} ângulos atualizados em ${elapsedMs}ms — trends: ${hasTrends}`);

    return NextResponse.json({
      ok: true,
      date: today,
      upserted,
      hasTrendsData: hasTrends,
      elapsedMs,
      scores: scores.map(s => ({ angle: s.angle, score: s.score, source: s.source })),
    });
  } catch (err: any) {
    console.error('[exogenous-signals] Erro:', err?.message ?? err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? 'Erro interno', elapsedMs: Date.now() - startedAt },
      { status: 500 },
    );
  }
}
