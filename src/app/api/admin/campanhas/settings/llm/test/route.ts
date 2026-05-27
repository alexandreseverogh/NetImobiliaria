import { NextRequest, NextResponse } from 'next/server';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { getLlmClient } from '@/lib/marketing/services/llmClient';

export const dynamic = 'force-dynamic';

// POST /api/admin/campanhas/settings/llm/test
export async function POST(request: NextRequest) {
  try {
    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const llm = await getLlmClient(payload.tenantId);
    const response = await llm.complete('Responda apenas "OK" para confirmar conexão.', 20);

    return NextResponse.json({
      success: true,
      provider: llm.provider,
      model: llm.model,
      response: response.trim(),
    });
  } catch (error: any) {
    console.error('POST /settings/llm/test error:', error);
    return NextResponse.json({
      success: false,
      provider: '',
      model: '',
      error: error.message || 'Falha na conexão com LLM',
    });
  }
}
