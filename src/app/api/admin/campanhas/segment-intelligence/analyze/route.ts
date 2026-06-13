import { NextRequest, NextResponse } from 'next/server';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { generateSegmentIntelligence } from '@/lib/marketing/services/segmentIntelligenceService';
import type { SegmentDashboardResponse } from '../../dashboard/segment/route';

export const dynamic = 'force-dynamic';

// POST /api/admin/campanhas/segment-intelligence/analyze
// Body: { segmentData: SegmentDashboardResponse }
// Executa a inteligência LLM sobre os dados já carregados (evita re-fetch)
export async function POST(request: NextRequest) {
  try {
    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const segmentData: SegmentDashboardResponse = body.segmentData;

    if (!segmentData?.segment?.id) {
      return NextResponse.json({ error: 'segmentData obrigatório' }, { status: 400 });
    }

    const result = await generateSegmentIntelligence(segmentData, payload.tenantId);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('POST /segment-intelligence/analyze error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao gerar análise' }, { status: 500 });
  }
}
