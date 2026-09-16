/**
 * POST /api/admin/campanhas/audiences/[id]/refresh
 *
 * Tier 3 do plano "Loop do ICP" — consulta o status real de processamento da audiência na Meta
 * e atualiza a linha local. Chamado sob demanda (botão na UI), nunca por cron nesta v1.
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireApiPermission } from '@/lib/auth/apiPermissions';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { refreshAudienceStatus } from '@/lib/marketing/services/audienceService';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requireApiPermission(request, 'dashboard-campanhas', 'READ');
  if (denied) return denied;

  const payload = getTokenPayload(request);
  if (!payload?.tenantId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  try {
    const audience = await refreshAudienceStatus(params.id, payload.tenantId);
    return NextResponse.json({ audience });
  } catch (e: any) {
    console.error('POST /audiences/[id]/refresh error:', e);
    const status = e.message?.includes('não encontrada') ? 404 : 500;
    return NextResponse.json({ error: e.message || 'Erro ao atualizar status' }, { status });
  }
}
