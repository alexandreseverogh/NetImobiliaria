import { NextRequest, NextResponse } from 'next/server';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { resolveMetaAccessToken, searchMetaInterestsCached } from '@/lib/marketing/services/metaInterestService';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/campanhas/interests/search?q={query}&clientId={uuid}
 *
 * Busca interesses reais na Meta Targeting Search API usando o token do tenant.
 * Retorna IDs numéricos válidos, nome localizado e tamanho estimado da audiência.
 *
 * Se as credenciais não estiverem configuradas, retorna { data: [], configured: false }
 * para que a UI mostre uma mensagem amigável sem quebrar.
 */
export async function GET(request: NextRequest) {
  try {
    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const q        = request.nextUrl.searchParams.get('q')        || '';
    const clientId = request.nextUrl.searchParams.get('clientId') || null;
    const tenantId = payload.tenantId;

    if (q.trim().length < 2) {
      return NextResponse.json({ data: [], configured: true });
    }

    /* ── 1. Resolver access_token do tenant ── */
    const accessToken = await resolveMetaAccessToken(tenantId);

    if (!accessToken) {
      return NextResponse.json({
        data: [],
        configured: false,
        message: 'Token Meta não configurado. Acesse Configurações → Redes de Anúncios.',
      });
    }

    /* ── 2. Buscar (com cache — reduz rate-limit) ── */
    const data = await searchMetaInterestsCached(accessToken, q.trim(), 25);

    return NextResponse.json({ data, configured: true });

  } catch (err: any) {
    const metaError = err?.response?.data?.error;
    console.error('[interests/search] erro:', metaError || err.message);

    // Token expirado ou inválido
    if (metaError?.code === 190) {
      return NextResponse.json({
        data: [],
        configured: true,
        message: 'Token Meta expirado. Atualize em Configurações → Redes de Anúncios.',
      });
    }

    return NextResponse.json({
      data: [],
      configured: true,
      message: metaError?.message || 'Erro ao consultar a Meta API. Tente novamente.',
    });
  }
}
