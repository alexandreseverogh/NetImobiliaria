import { NextRequest, NextResponse } from 'next/server';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { requireApiPermission } from '@/lib/auth/apiPermissions';
import { updateRecurrenceStatus } from '@/lib/marketing/services/organicRecurrenceService';

export const dynamic = 'force-dynamic';

// PATCH /api/admin/campanhas/organic/recurrence/[id]
// Body: { status: 'ACTIVE' | 'PAUSED' | 'CANCELLED' }
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requireApiPermission(request, 'publicacoes-organicas', 'UPDATE');
  if (denied) return denied;

  const payload = getTokenPayload(request);
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const { status } = await request.json().catch(() => ({}));
  if (!['ACTIVE', 'PAUSED', 'CANCELLED'].includes(status)) {
    return NextResponse.json({ error: 'Status inválido' }, { status: 400 });
  }

  const rec = await updateRecurrenceStatus(params.id, payload.tenantId, status);
  if (!rec) return NextResponse.json({ error: 'Recorrência não encontrada' }, { status: 404 });

  return NextResponse.json(rec);
}
