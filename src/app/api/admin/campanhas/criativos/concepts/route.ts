/**
 * POST /api/admin/campanhas/criativos/concepts
 * FASE 6 — Gera 5 conceitos de criativos baseados em padrão vencedor.
 *
 * Body: { hookType, angle, emotionalTone, isUgc, avgCtr, avgCpl, adsCount }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { resolveSegment } from '@/lib/intelligence/segmentResolver';
import { generateCreativeConcepts } from '@/lib/marketing/services/creativeAnalysisService';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { hookType, angle, emotionalTone, isUgc, avgCtr, avgCpl, adsCount } = body;

    // Resolver segmento do tenant
    const segment = await resolveSegment(payload.tenantId, null);
    const segmentName = segment?.name || 'imobiliário';

    const style = isUgc ? 'UGC (User Generated Content)' : 'Corporativo/Profissional';

    const concepts = await generateCreativeConcepts({
      segment: segmentName,
      style,
      hook_type: hookType || 'benefit',
      angle: angle || 'lifestyle',
      emotional_tone: emotionalTone || 'aspirational',
      avg_ctr: avgCtr?.toString() || '0',
      avg_cpl: avgCpl?.toString() || '0',
      ads_count: adsCount?.toString() || '1',
    });

    return NextResponse.json({ concepts });
  } catch (err: any) {
    console.error('[concepts] erro:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
