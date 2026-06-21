import { NextRequest, NextResponse } from 'next/server';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { rejectJob } from '@/lib/marketing/services/creativeGenerationService';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/campanhas/criativos/generate/[jobId]/reject
 * Marca o job como rejeitado; variações não são promovidas.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { jobId: string } },
) {
  const payload = getTokenPayload(request);
  if (!payload?.tenantId || !payload?.userId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  try {
    await rejectJob(params.jobId, payload.tenantId, payload.userId);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Erro ao rejeitar job' }, { status: 400 });
  }
}
