import { NextRequest, NextResponse } from 'next/server';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { getBriefingHistory } from '@/lib/marketing/services/strategicBriefing';

export const dynamic = 'force-dynamic';

// GET /api/admin/campanhas/briefings
export async function GET(request: NextRequest) {
  try {
    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit    = parseInt(searchParams.get('limit') || '10');
    const type     = searchParams.get('type')     || undefined;
    const clientId = searchParams.get('clientId') || undefined;

    const briefings = await getBriefingHistory(limit, type, payload.tenantId, clientId);

    return NextResponse.json(briefings);
  } catch (error: any) {
    console.error('GET /briefings error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao listar briefings' }, { status: 500 });
  }
}
