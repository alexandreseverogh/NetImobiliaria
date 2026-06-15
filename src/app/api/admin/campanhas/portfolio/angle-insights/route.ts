import { NextRequest, NextResponse } from 'next/server';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { getAngleInsights } from '@/lib/marketing/services/angleInsightsService';
import { invokeForContext } from '@/lib/intelligence/llmInvoker';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/campanhas/portfolio/angle-insights
 * Retorna performance agregada por ângulo + narrativa LLM opcional.
 *
 * Query params:
 *   period    — dias (default 30)
 *   clientId  — uuid | 'own' | omitido (todos)
 *   narrative — 'true' para disparar chamada LLM e retornar narrativa
 */
export async function GET(request: NextRequest) {
  try {
    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period    = Math.min(Math.max(parseInt(searchParams.get('period') || '30'), 1), 365);
    const clientId  = searchParams.get('clientId') || undefined;
    const segmentId = searchParams.get('segmentId') || undefined;
    const wantNarr  = searchParams.get('narrative') === 'true';

    // segmentId isola os ângulos a um único segmento — CPL por ângulo só é
    // comparável dentro do mesmo nicho (a taxonomia de ângulos é por-segmento).
    const result = await getAngleInsights(period, payload.tenantId, clientId, segmentId);

    let narrative: string | null = null;
    if (wantNarr && result.angleStats.length > 0) {
      try {
        narrative = await invokeForContext({
          templateKey: 'angle_performance_insight',
          tenantId: payload.tenantId,
          clientId,
          variables: {
            period_days:  String(period),
            angle_stats:  result.textSummary,
            top_angle:    result.topAngle
              ? `${result.topAngle.label} (CPL R$${result.topAngle.cpl!.toFixed(2)})`
              : 'não identificado',
            worst_angle:  result.worstAngle
              ? `${result.worstAngle.label} (CPL R$${result.worstAngle.cpl!.toFixed(2)})`
              : 'não identificado',
          },
          maxTokens: 250,
        });
      } catch {
        // narrativa LLM é opcional — não bloqueia
      }
    }

    return NextResponse.json({ ...result, narrative });
  } catch (error: any) {
    console.error('GET /angle-insights error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao carregar insights de ângulo' }, { status: 500 });
  }
}
