import { NextRequest, NextResponse } from 'next/server';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { requireApiPermission } from '@/lib/auth/apiPermissions';
import { prisma } from '@/lib/marketing/prisma';
import { getNetworkServiceForTenant } from '@/lib/marketing/networks/factory';
import type { MetaAdsAdapter } from '@/lib/marketing/networks/meta/metaAdsAdapter';

export const dynamic = 'force-dynamic';

// GET /api/admin/campanhas/organic/[id]/insights — métricas orgânicas de um post publicado
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requireApiPermission(request, 'publicacoes-organicas', 'READ');
  if (denied) return denied;

  const payload = getTokenPayload(request);
  if (!payload?.tenantId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  try {
    const post = await prisma.organicPost.findFirst({
      where: { id: params.id, tenantId: payload.tenantId },
    });
    if (!post) return NextResponse.json({ error: 'Publicação não encontrada' }, { status: 404 });
    if (post.status !== 'PUBLISHED' || !post.externalPostId) {
      return NextResponse.json({ error: 'Publicação ainda não publicada' }, { status: 400 });
    }

    const service = await getNetworkServiceForTenant(payload.tenantId, 'meta', post.clientId ?? null);
    const meta    = service as unknown as MetaAdsAdapter;
    const insights = await meta.getOrganicInsights(post.platform as 'facebook' | 'instagram', post.externalPostId);

    return NextResponse.json({ insights });
  } catch (error: any) {
    console.error('GET /organic/[id]/insights error:', error);
    return NextResponse.json({ error: error?.response?.data?.error?.message || error.message }, { status: 500 });
  }
}
