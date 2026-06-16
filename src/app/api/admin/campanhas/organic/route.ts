import { NextRequest, NextResponse } from 'next/server';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { requireApiPermission } from '@/lib/auth/apiPermissions';
import { listOrganicPosts } from '@/lib/marketing/services/organicPublishService';

export const dynamic = 'force-dynamic';

// GET /api/admin/campanhas/organic?clientId=&status=&platform=
export async function GET(request: NextRequest) {
  const denied = await requireApiPermission(request, 'publicacoes-organicas', 'READ');
  if (denied) return denied;

  const payload = getTokenPayload(request);
  if (!payload?.tenantId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const rawClientId = searchParams.get('clientId') || undefined;
    // 'segment'/'all' = sem filtro de cliente; 'own' preservado; UUID preservado
    const clientId = rawClientId === 'segment' || rawClientId === 'all' ? undefined : rawClientId;

    const posts = await listOrganicPosts(payload.tenantId, {
      clientId,
      status:   searchParams.get('status')   || undefined,
      platform: searchParams.get('platform') || undefined,
    });

    return NextResponse.json({ posts });
  } catch (error: any) {
    console.error('GET /organic error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao listar publicações' }, { status: 500 });
  }
}
