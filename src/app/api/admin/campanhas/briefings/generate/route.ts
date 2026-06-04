import { NextRequest, NextResponse } from 'next/server';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { generateStrategicBriefing } from '@/lib/marketing/services/strategicBriefing';
import { requireApiPermission } from '@/lib/auth/apiPermissions';

export const dynamic = 'force-dynamic';

// POST /api/admin/campanhas/briefings/generate
export async function POST(request: NextRequest) {
  try {
    // Verificar permissão de execução server-side
    const denied = await requireApiPermission(request, 'dashboard-campanhas', 'READ');
    if (denied) return denied;

    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const type: 'morning' | 'closing' | 'manual' = body.type || 'manual';
    const clientId: string | undefined = body.clientId || undefined;
    // periodDays override: se passado pelo cliente, usa ele; senão usa o padrão do tipo
    const periodDays: number | undefined = body.periodDays ? parseInt(String(body.periodDays)) : undefined;

    if (!['morning', 'closing', 'manual'].includes(type)) {
      return NextResponse.json({ error: 'Tipo inválido. Use: morning, closing ou manual' }, { status: 400 });
    }

    const briefing = await generateStrategicBriefing(type, payload.tenantId, clientId, periodDays);

    return NextResponse.json(briefing);
  } catch (error: any) {
    console.error('POST /briefings/generate error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao gerar briefing' }, { status: 500 });
  }
}
