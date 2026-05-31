import { NextRequest, NextResponse } from 'next/server';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { generateAiInsights } from '@/lib/marketing/services/aiInsights';

export const dynamic = 'force-dynamic';

// GET /api/admin/campanhas/insights/ai
export async function GET(request: NextRequest) {
  try {
    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const campaignId      = searchParams.get('campaignId')      || undefined;
    const clientId        = searchParams.get('clientId')        || undefined;
    const objectiveFilter = searchParams.get('objectiveFilter') || undefined;
    const statusFilter    = searchParams.get('statusFilter')    || undefined;
    const adSetId         = searchParams.get('adSetId')         || undefined;
    const startDate       = searchParams.get('startDate')       || undefined;
    const endDate         = searchParams.get('endDate')         || undefined;

    const insights = await generateAiInsights(
      campaignId, payload.tenantId, clientId,
      { objectiveFilter, statusFilter, adSetId, startDate, endDate },
    );

    return NextResponse.json(insights);
  } catch (error: any) {
    console.error('GET /insights/ai error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao gerar insights' }, { status: 500 });
  }
}
