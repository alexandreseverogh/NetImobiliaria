import { NextRequest, NextResponse } from 'next/server';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { getJob } from '@/lib/marketing/services/creativeGenerationService';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/campanhas/criativos/generate/[jobId]
 * Retorna status atual do job (polling do frontend durante geração)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } },
) {
  const payload = getTokenPayload(request);
  if (!payload?.tenantId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const job = await getJob(params.jobId, payload.tenantId);
  if (!job) {
    return NextResponse.json({ error: 'Job não encontrado' }, { status: 404 });
  }

  return NextResponse.json({ job });
}
