import { NextRequest, NextResponse } from 'next/server';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { resolveBenchmarks } from '@/lib/intelligence/benchmarkResolver';
import { Pool } from 'pg';

export const dynamic = 'force-dynamic';

let _pool: Pool | null = null;
function getPool() {
  if (!_pool) _pool = new Pool({ connectionString: process.env.MARKETING_DATABASE_URL });
  return _pool;
}

// GET /api/admin/campanhas/benchmarks?keys=hook_rate_critical,hook_rate_min,hook_rate_good&clientId=...&segmentId=...
export async function GET(request: NextRequest) {
  try {
    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const keysParam  = searchParams.get('keys') || 'hook_rate_critical,hook_rate_min,hook_rate_good';
    const clientId   = searchParams.get('clientId')  || null;
    const segmentId  = searchParams.get('segmentId') || null;

    const keys = keysParam.split(',').map(k => k.trim()).filter(Boolean);

    // Resolve segmentId do cliente se não vier na query
    let resolvedSegmentId = segmentId;
    if (!resolvedSegmentId && clientId && clientId !== 'own') {
      const pool = getPool();
      const res = await pool.query(
        `SELECT segment_id FROM public.clientes WHERE uuid = $1::uuid LIMIT 1`,
        [clientId],
      );
      resolvedSegmentId = res.rows[0]?.segment_id ?? null;
    }

    const benchmarks = await resolveBenchmarks(
      keys,
      payload.tenantId,
      resolvedSegmentId,
      clientId !== 'own' ? clientId : null,
    );

    return NextResponse.json(benchmarks);
  } catch (error: any) {
    console.error('GET /benchmarks error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
