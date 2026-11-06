import { NextRequest, NextResponse } from 'next/server';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { getWeeklySummary } from '@/lib/marketing/services/weeklySummaryService';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/campanhas/dashboard/weekly-summary
 * Resumo do período por campanha, com ações concretas. Regras determinísticas — ver
 * weeklySummaryService.ts. Sem CRM contratado, retorna qualityAvailable=false, sem ações de
 * qualidade.
 *
 * Query params:
 *   period   — dias (default 7)
 *   clientId — uuid | 'own' | omitido (todos)
 */
export async function GET(request: NextRequest) {
  try {
    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const periodDays = Math.min(Math.max(parseInt(searchParams.get('period') || '7'), 1), 365);
    const rawClient = searchParams.get('clientId');
    const clientId = rawClient === 'own' ? null : rawClient || undefined;

    const result = await getWeeklySummary({ tenantId: payload.tenantId, clientId, periodDays });
    return NextResponse.json(result);
  } catch (err) {
    console.error('[weekly-summary]', err);
    return NextResponse.json({ error: 'Erro ao gerar resumo' }, { status: 500 });
  }
}
