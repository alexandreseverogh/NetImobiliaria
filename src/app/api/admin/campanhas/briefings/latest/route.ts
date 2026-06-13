import { NextRequest, NextResponse } from 'next/server';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { getLatestBriefingsForScope } from '@/lib/marketing/services/strategicBriefing';

export const dynamic = 'force-dynamic';

// GET /api/admin/campanhas/briefings/latest
export async function GET(request: NextRequest) {
  try {
    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type      = searchParams.get('type')      || undefined;
    const clientId  = searchParams.get('clientId')  || undefined;
    const segmentId = searchParams.get('segmentId') || undefined;

    // Passa segmentId para restringir ao escopo do segmento selecionado
    const briefings = await getLatestBriefingsForScope(type, payload.tenantId, clientId, segmentId);

    return NextResponse.json(briefings);
  } catch (error: any) {
    console.error('GET /briefings/latest error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao buscar briefing' }, { status: 500 });
  }
}
