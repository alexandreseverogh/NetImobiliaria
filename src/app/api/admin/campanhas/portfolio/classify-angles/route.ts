import { NextRequest, NextResponse } from 'next/server';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import {
  getUnclassifiedCount,
  classifyCampaignAngles,
  saveAngleClassifications,
} from '@/lib/marketing/services/angleClassifierService';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/campanhas/portfolio/classify-angles
 * Retorna contagem de campanhas sem ângulo classificado.
 */
export async function GET(request: NextRequest) {
  try {
    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    const count = await getUnclassifiedCount(payload.tenantId);
    return NextResponse.json({ unclassifiedCount: count });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/campanhas/portfolio/classify-angles
 *
 * Body { mode: 'preview' }
 *   → Chama LLM e retorna sugestões sem salvar.
 *   → { results: ClassificationResult[] }
 *
 * Body { mode: 'confirm', assignments: [{ id, angle }] }
 *   → Salva as classificações no banco (angle_source = 'llm_auto').
 *   → { saved: number }
 */
export async function POST(request: NextRequest) {
  try {
    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { mode = 'preview', assignments, campaignIds } = body;

    if (mode === 'confirm') {
      if (!Array.isArray(assignments) || assignments.length === 0) {
        return NextResponse.json({ error: 'assignments[] obrigatório no modo confirm' }, { status: 400 });
      }
      const saved = await saveAngleClassifications(payload.tenantId, assignments);
      return NextResponse.json({ saved });
    }

    // mode === 'preview'
    const results = await classifyCampaignAngles(
      payload.tenantId,
      Array.isArray(campaignIds) && campaignIds.length > 0 ? campaignIds : undefined,
    );
    return NextResponse.json({ results });
  } catch (error: any) {
    console.error('[classify-angles] POST error:', error);
    return NextResponse.json({ error: error.message ?? 'Erro na classificação' }, { status: 500 });
  }
}
