/**
 * GET /api/admin/campanhas/segment-defaults
 *
 * Resolve os network_defaults do segmento para uma campanha.
 * Query params:
 *   network  — código da rede (ex: meta)
 *   clientId — UUID do cliente (opcional; se omitido, usa segmento do tenant)
 *
 * Retorna: { specialAdCategory, objective, customEventType, optimizationGoal, billingEvent }
 *
 * Revisão 2026-05-29 — seção 1.6 do plano mestre.
 * Fallback gracioso: se não há network_defaults, retorna defaults neutros (não quebra o wizard).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { resolveSegmentNetworkDefaults } from '@/lib/marketing/networks/factory';
import { resolveSegment } from '@/lib/intelligence/segmentResolver';
import { getSegmentAngles } from '@/lib/marketing/services/segmentTaxonomyService';
import type { NetworkCode } from '@/lib/marketing/networks/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const networkCode = (searchParams.get('network') || 'meta') as NetworkCode;
    const clientId    = searchParams.get('clientId') || null;

    // Resolve network defaults + segmento (para ângulos dirigidos por segmento)
    const [defaults, segment] = await Promise.all([
      resolveSegmentNetworkDefaults(payload.tenantId, clientId, networkCode),
      resolveSegment(payload.tenantId, clientId).catch(() => null),
    ]);

    // FASE 18.2 — ângulos do segmento (opções de ângulo do wizard, ZERO HARDCODE)
    const allowedAngles = segment
      ? await getSegmentAngles(segment.id).catch(() => [])
      : [];

    return NextResponse.json({
      ...defaults,
      segmentId:   segment?.id   ?? null,
      segmentName: segment?.name ?? null,
      allowedAngles,   // [{ slug, label }]
    });
  } catch (error: any) {
    console.error('[segment-defaults] GET error:', error);
    // Fallback gracioso — o wizard não deve quebrar por causa deste endpoint
    return NextResponse.json({
      specialAdCategory: 'NONE',
      objective:         'OUTCOME_LEADS',
      customEventType:   'LEAD',
      optimizationGoal:  'LEAD_GENERATION',
      billingEvent:      'IMPRESSIONS',
    });
  }
}
