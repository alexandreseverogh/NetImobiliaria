import { NextRequest, NextResponse } from 'next/server';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { getCplTimeline } from '@/lib/marketing/services/cplTimelineService';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/campanhas/dashboard/cpl
 * CPL (Custo Por Lead) por dia, agregado corretamente por data (soma de todas as campanhas
 * no escopo) — endpoint genérico reutilizável (dashboard, relatórios futuros, alertas), em vez
 * de cada consumidor derivar o próprio cálculo. Ver src/lib/marketing/services/cplTimelineService.ts.
 *
 * Query params: startDate, endDate (YYYY-MM-DD) · clientId ('own'|<uuid>) · segmentId · campaignId
 */
export async function GET(request: NextRequest) {
  const payload = getTokenPayload(request);
  if (!payload?.tenantId) {
    return NextResponse.json({ error: 'Tenant não encontrado ou usuário não autenticado' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const startStr = searchParams.get('startDate');
  const endStr = searchParams.get('endDate');
  let clientId = searchParams.get('clientId');
  if (clientId === 'segment' || clientId === 'all') clientId = null;
  const segmentId = searchParams.get('segmentId');
  const campaignId = searchParams.get('campaignId');

  const endDate = endStr
    ? (endStr.length === 10 ? new Date(endStr + 'T23:59:59.999Z') : new Date(endStr))
    : new Date();
  const startDate = startStr ? new Date(startStr) : new Date(endDate.getTime() - 30 * 86400000);

  try {
    const result = await getCplTimeline(payload.tenantId, {
      startDate, endDate, clientId, segmentId, campaignId,
    });
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[dashboard/cpl] erro:', err);
    return NextResponse.json({ error: 'Erro ao calcular CPL por período' }, { status: 500 });
  }
}
