/**
 * GET /api/admin/campanhas/segment-suggestion?clientId=...
 *
 * Sugestão de público (idade, gênero) e horário para uma nova campanha, baseada no histórico de
 * desempenho por quebra da própria empresa. Só recomenda — nunca altera nada.
 * Ver segmentSuggestionService.ts para as regras de volume mínimo e confiança.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { getSegmentSuggestion } from '@/lib/marketing/services/segmentSuggestionService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const payload = getTokenPayload(request);
  if (!payload?.tenantId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  const clientParam = new URL(request.url).searchParams.get('clientId');
  const clientId = clientParam && clientParam !== 'own' ? clientParam : null;

  try {
    const suggestion = await getSegmentSuggestion(payload.tenantId, clientId);
    return NextResponse.json(suggestion);
  } catch (error: any) {
    console.error('[segment-suggestion] GET error:', error);
    // Nunca quebra o wizard: sem sugestão, o passo simplesmente não aparece.
    return NextResponse.json({ ready: false, reason: 'Não foi possível calcular a sugestão agora.' });
  }
}
