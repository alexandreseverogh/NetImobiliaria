import { NextRequest, NextResponse } from 'next/server';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { calculateWastedSpend } from '@/lib/marketing/services/wastedSpendService';

export const dynamic = 'force-dynamic';

// GET /api/admin/campanhas/desperdicio?clientId=&days=30
export async function GET(request: NextRequest) {
  try {
    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clientId  = searchParams.get('clientId') || null;
    const periodDays = Math.min(90, Math.max(7, Number(searchParams.get('days') || '30')));

    const report = await calculateWastedSpend(payload.tenantId, clientId, periodDays);

    return NextResponse.json(report);
  } catch (error: any) {
    console.error('GET /desperdicio error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao calcular desperdícios' }, { status: 500 });
  }
}
