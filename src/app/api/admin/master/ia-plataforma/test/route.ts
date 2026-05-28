import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { getLlmClientForCampaigns } from '@/lib/marketing/services/llmClient';

export const dynamic = 'force-dynamic';

// POST /api/admin/master/ia-plataforma/test
export async function POST(request: NextRequest) {
  const token = request.cookies.get('admin_auth_token')?.value;
  const decoded = token ? await verifyToken(token) : null;
  if (!decoded?.is_system_role) {
    return NextResponse.json({ error: 'Acesso Master Requerido' }, { status: 403 });
  }

  try {
    const llm = await getLlmClientForCampaigns();
    const response = await llm.complete('Responda apenas "OK" para confirmar conexão.', 20);

    return NextResponse.json({
      success: true,
      provider: llm.provider,
      model: llm.model,
      response: response.trim(),
    });
  } catch (error: any) {
    console.error('POST /master/ia-plataforma/test error:', error);
    return NextResponse.json({
      success: false,
      provider: '',
      model: '',
      error: error.message || 'Falha na conexão com LLM',
    });
  }
}
