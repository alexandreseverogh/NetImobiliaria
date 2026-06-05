/**
 * FASE 18.1 — API: Radar de Demanda
 * GET /api/admin/campanhas/dashboard/demand-radar
 * Query params: periodDays (default 30), tenantId, clientId
 * Lê do cache diário; computa on-the-fly se miss.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTokenPayload } from '@/lib/auth/jwt-node';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Autenticação
  const payload = getTokenPayload(request);
  if (!payload?.tenantId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const periodDays = Math.min(90, Math.max(7, parseInt(searchParams.get('periodDays') ?? '30')));
  const tenantId   = searchParams.get('tenantId') ?? (payload.tenantId as string) ?? 'global';
  const clientId   = searchParams.get('clientId') ? parseInt(searchParams.get('clientId')!) : undefined;

  try {
    const today = new Date().toISOString().split('T')[0];

    // Tentar cache primeiro (evita recompute caro)
    let cachedData: any = null;
    try {
      const pool = (await import('@/lib/database/connection')).default;
      const { rows } = await pool.query(
        `SELECT radar_data
         FROM campanhasmarketingdigital.demand_radar_cache
         WHERE cache_date = $1::date
           AND tenant_id  = $2
           AND (
             ($3::integer IS NULL AND client_id IS NULL)
             OR client_id = $3::integer
           )
         LIMIT 1`,
        [today, tenantId, clientId ?? null],
      );

      if (rows.length > 0) {
        cachedData = rows[0].radar_data;
      }
    } catch {
      // Cache lookup failure is non-fatal — continue to compute
    }

    if (cachedData) {
      return NextResponse.json({ ...cachedData, fromCache: true });
    }

    // Cache miss: computar
    const { computeDemandRadar } = await import(
      '@/lib/marketing/services/demandRadarService'
    );

    const result = await computeDemandRadar(periodDays, tenantId, clientId);

    // Persistir cache assincronamente (não bloqueia resposta)
    setImmediate(async () => {
      try {
        const pool = (await import('@/lib/database/connection')).default;
        await pool.query(
          `DELETE FROM campanhasmarketingdigital.demand_radar_cache
           WHERE cache_date = $1::date
             AND tenant_id  = $2
             AND (
               ($3::integer IS NULL AND client_id IS NULL)
               OR client_id = $3::integer
             )`,
          [today, tenantId, clientId ?? null],
        );
        await pool.query(
          `INSERT INTO campanhasmarketingdigital.demand_radar_cache
             (cache_date, tenant_id, client_id, radar_data, endogenous_period_days)
           VALUES ($1::date, $2, $3::integer, $4::jsonb, $5)`,
          [today, tenantId, clientId ?? null, JSON.stringify(result), periodDays],
        );
      } catch {
        // Cache write failure is non-fatal
      }
    });

    return NextResponse.json({ ...result, fromCache: false });
  } catch (err: any) {
    console.error('[demand-radar] Erro:', err?.message ?? err);
    return NextResponse.json(
      { error: err?.message ?? 'Erro ao computar radar de demanda' },
      { status: 500 },
    );
  }
}
