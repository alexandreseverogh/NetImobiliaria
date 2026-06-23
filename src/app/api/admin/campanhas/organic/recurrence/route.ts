import { NextRequest, NextResponse } from 'next/server';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { requireApiPermission } from '@/lib/auth/apiPermissions';
import { createRecurrence, listRecurrences } from '@/lib/marketing/services/organicRecurrenceService';

export const dynamic = 'force-dynamic';

// GET /api/admin/campanhas/organic/recurrence
export async function GET(request: NextRequest) {
  const denied = await requireApiPermission(request, 'publicacoes-organicas', 'READ');
  if (denied) return denied;

  const payload = getTokenPayload(request);
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const rawClientId = searchParams.get('clientId');
  const clientId = rawClientId && rawClientId !== 'all' && rawClientId !== 'own' ? rawClientId : rawClientId === 'own' ? 'own' : undefined;

  const recurrences = await listRecurrences(payload.tenantId, clientId);
  return NextResponse.json({ recurrences });
}

// POST /api/admin/campanhas/organic/recurrence
export async function POST(request: NextRequest) {
  const denied = await requireApiPermission(request, 'publicacoes-organicas', 'CREATE');
  if (denied) return denied;

  const payload = getTokenPayload(request);
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  try {
    const body = await request.json().catch(() => ({}));
    const { clientId: rawClientId, platform, format, caption, mediaUrls, mediaKind, startDate, endDate, daysOfWeek, timeslots } = body;

    if (!platform || !format) return NextResponse.json({ error: 'platform e format são obrigatórios' }, { status: 400 });
    if (!startDate) return NextResponse.json({ error: 'startDate é obrigatório' }, { status: 400 });
    if (!daysOfWeek?.length) return NextResponse.json({ error: 'Selecione ao menos um dia da semana' }, { status: 400 });
    if (!timeslots?.length) return NextResponse.json({ error: 'Informe ao menos um horário' }, { status: 400 });

    const clientId = rawClientId && rawClientId !== 'own' && rawClientId !== 'all' ? rawClientId : null;

    const rec = await createRecurrence({
      tenantId: payload.tenantId,
      clientId,
      platform,
      format,
      caption,
      mediaUrls: mediaUrls ?? [],
      mediaKind,
      startDate,
      endDate: endDate || undefined,
      daysOfWeek,
      timeslots,
      createdBy: payload.userId || null,
    });

    return NextResponse.json(rec, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Erro ao criar recorrência' }, { status: 500 });
  }
}
