import { NextRequest, NextResponse } from 'next/server';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { approveJob } from '@/lib/marketing/services/creativeGenerationService';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/campanhas/criativos/generate/[jobId]/approve
 *
 * Body opcional: { selectedUrls: string[] }
 * Promove as variações selecionadas (ou todas) para CreativeAsset.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { jobId: string } },
) {
  const payload = getTokenPayload(request);
  if (!payload?.tenantId || !payload?.userId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  let selectedUrls: string[] | undefined;
  try {
    const body = await request.json().catch(() => ({}));
    selectedUrls = Array.isArray(body?.selectedUrls) ? body.selectedUrls : undefined;
  } catch {
    // body opcional
  }

  try {
    const result = await approveJob(params.jobId, payload.tenantId, payload.userId, selectedUrls);
    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Erro ao aprovar job' }, { status: 400 });
  }
}
