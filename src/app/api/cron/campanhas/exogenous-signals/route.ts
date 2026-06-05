/**
 * FASE 18.1 — Cron: Atualização de sinais exógenos reais (Google Trends)
 * POST /api/cron/campanhas/exogenous-signals
 * Header: x-cron-secret
 * Frequência recomendada: diária (06:00 BRT)
 * ZERO MOCK — só persiste scores reais (source='trends'). Nulos ignorados.
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-cron-secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const startedAt = Date.now();
  const today     = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  try {
    // Usa versão sequencial com delay para respeitar rate-limit do Google
    const { fetchAllAngleScoresCron } = await import(
      '@/lib/marketing/services/exogenousTrendsService'
    );
    const pool   = (await import('@/lib/database/connection')).default;
    const client = await pool.connect();

    const scores = await fetchAllAngleScoresCron();

    // Apenas scores com dados reais (nunca persiste null)
    const realScores = scores.filter(s => s.score !== null && s.source === 'trends');
    const failedAngles = scores
      .filter(s => s.score === null)
      .map(s => ({ angle: s.angle, error: s.error }));

    let upserted = 0;
    try {
      await client.query('BEGIN');
      for (const score of realScores) {
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

      // Invalida cache diário apenas se houver dados novos
      if (upserted > 0) {
        await client.query(
          `DELETE FROM campanhasmarketingdigital.demand_radar_cache WHERE cache_date = $1::date`,
          [today],
        );
      }

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    const elapsedMs = Date.now() - startedAt;

    console.log(
      `[exogenous-signals] ${upserted}/${scores.length} ângulos salvos em ${elapsedMs}ms`,
      failedAngles.length > 0 ? `| falhas: ${JSON.stringify(failedAngles)}` : '',
    );

    return NextResponse.json({
      ok:            true,
      date:          today,
      upserted,
      total:         scores.length,
      failedAngles,
      elapsedMs,
      scores: scores.map(s => ({
        angle:  s.angle,
        score:  s.score,
        source: s.source,
        error:  s.error,
      })),
    });
  } catch (err: any) {
    console.error('[exogenous-signals] Erro crítico:', err?.message ?? err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? 'Erro interno', elapsedMs: Date.now() - startedAt },
      { status: 500 },
    );
  }
}
