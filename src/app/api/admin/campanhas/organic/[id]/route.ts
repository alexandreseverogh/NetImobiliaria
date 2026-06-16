import { NextRequest, NextResponse } from 'next/server';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { requireApiPermission } from '@/lib/auth/apiPermissions';
import { cancelOrganicPost } from '@/lib/marketing/services/organicPublishService';

export const dynamic = 'force-dynamic';

// DELETE /api/admin/campanhas/organic/[id] — cancela agendamento / remove rascunho ou falha
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requireApiPermission(request, 'publicacoes-organicas', 'CREATE');
  if (denied) return denied;

  const payload = getTokenPayload(request);
  if (!payload?.tenantId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  try {
    const ok = await cancelOrganicPost(payload.tenantId, params.id);
    if (!ok) {
      return NextResponse.json({ error: 'Publicação não encontrada ou já publicada' }, { status: 404 });
    }
    return NextResponse.json({ deleted: true });
  } catch (error: any) {
    console.error('DELETE /organic/[id] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
