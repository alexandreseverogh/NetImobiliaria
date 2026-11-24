import { NextRequest, NextResponse } from 'next/server';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import {
  buildSegmentationFacts,
  narrateSegmentationFacts,
} from '@/lib/marketing/services/segmentationInsightsService';

export const dynamic = 'force-dynamic';

function parseScope(request: NextRequest, tenantId: string) {
  const { searchParams } = new URL(request.url);
  const startStr = searchParams.get('startDate');
  const endStr = searchParams.get('endDate');
  let clientId = searchParams.get('clientId');
  if (clientId === 'segment' || clientId === 'all') clientId = null;
  const endDate = endStr
    ? (endStr.length === 10 ? endStr : endStr.slice(0, 10))
    : new Date().toISOString().slice(0, 10);
  const startDate = startStr
    ? (startStr.length === 10 ? startStr : startStr.slice(0, 10))
    : new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  return { tenantId, startDate, endDate, clientId, segmentId: searchParams.get('segmentId') };
}

/**
 * GET — fatos determinísticos do período (sem IA, rápido, sempre disponível).
 */
export async function GET(request: NextRequest) {
  try {
    const payload = getTokenPayload(request);
    if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    const scope = parseScope(request, payload.tenantId);
    const { days, hasData, facts } = await buildSegmentationFacts(scope);
    return NextResponse.json({ days, hasData, facts, narrative: null });
  } catch (error: any) {
    console.error('GET /dashboard/segmentation/insights error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST — pede à IA a narrativa (explicação + recomendação) sobre os fatos do período.
 * Acionado pelo botão "Gerar análise com IA" (custo de LLM só sob demanda).
 */
export async function POST(request: NextRequest) {
  try {
    const payload = getTokenPayload(request);
    if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    const scope = parseScope(request, payload.tenantId);
    const { days, hasData, facts } = await buildSegmentationFacts(scope);
    if (!hasData || facts.length === 0) {
      return NextResponse.json({ days, hasData, facts, narrative: null });
    }
    const narrative = await narrateSegmentationFacts(payload.tenantId, scope.segmentId, days, facts);
    return NextResponse.json({ days, hasData, facts, narrative });
  } catch (error: any) {
    console.error('POST /dashboard/segmentation/insights error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
