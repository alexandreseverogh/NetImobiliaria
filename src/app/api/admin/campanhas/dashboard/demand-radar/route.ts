/**
 * FASE 18.2 — API: Radar de Demanda POR SEGMENTO
 * GET /api/admin/campanhas/dashboard/demand-radar
 * Query params: periodDays (default 30), clientId (uuid | 'own' | omitido=agregado)
 * Retorna { segments: [...] } — um radar por segmento no escopo.
 *
 * Compute é barato (exógeno vem do banco via cron; endógeno é SQL). Sem cache.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTokenPayload } from '@/lib/auth/jwt-node';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const payload = getTokenPayload(request);
  if (!payload?.tenantId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const periodDays = Math.min(90, Math.max(7, parseInt(searchParams.get('periodDays') ?? '30')));
  const tenantId   = (payload.tenantId as string);
  const clientId   = searchParams.get('clientId') || undefined; // uuid | 'own' | undefined

  try {
    const { computeDemandRadarBySegment } = await import(
      '@/lib/marketing/services/demandRadarService'
    );
    const result = await computeDemandRadarBySegment(periodDays, tenantId, clientId);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[demand-radar] Erro:', err?.message ?? err);
    return NextResponse.json(
      { error: err?.message ?? 'Erro ao computar radar de demanda' },
      { status: 500 },
    );
  }
}
