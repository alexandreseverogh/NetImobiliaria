import { NextResponse } from 'next/server';
import { listActiveSegments } from '@/lib/intelligence/segmentResolver';

export const dynamic = 'force-dynamic';

/**
 * GET /api/system/segments
 * Returns all active segments for use in selectors — never hardcode.
 * No auth required (used in public-facing forms too).
 */
export async function GET() {
  try {
    const segments = await listActiveSegments();
    return NextResponse.json({ segments });
  } catch (err: any) {
    return NextResponse.json({ error: 'Erro ao buscar segmentos', detail: err.message }, { status: 500 });
  }
}
