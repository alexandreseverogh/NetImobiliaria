import { NextRequest, NextResponse } from 'next/server';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import pool from '@/lib/database/connection';
import axios from 'axios';

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

    /* ── 1. Resolver access_token do tenant (mesma lógica do factory) ── */
    let accessToken: string | null = null;

    // Tentativa 1: tenant_network_credentials (novo modelo)
    const credRes = await pool.query(
      `SELECT tnc.credentials
       FROM public.tenant_network_credentials tnc
       JOIN public.ad_networks n ON n.id = tnc.network_id
       WHERE tnc.tenant_id = $1::uuid
         AND n.code = 'meta'
         AND tnc.is_active = true
       LIMIT 1`,
      [tenantId],
    );
    if (credRes.rows[0]?.credentials?.access_token) {
      accessToken = credRes.rows[0].credentials.access_token;
    }

    // Tentativa 2: legado (tenants.meta_token)
    if (!accessToken) {
      const legacy = await pool.query(
        `SELECT meta_token FROM public.tenants WHERE id = $1::uuid LIMIT 1`,
        [tenantId],
      );
      accessToken = legacy.rows[0]?.meta_token || null;
    }

    if (!accessToken) {
      return NextResponse.json({
        data: [],
        configured: false,
        message: 'Token Meta não configurado. Acesse Configurações → Redes de Anúncios.',
      });
    }

    /* ── 2. Chamar Meta Targeting Search API ── */
    const metaRes = await axios.get('https://graph.facebook.com/v18.0/search', {
      params: {
        type:         'adinterest',
        q:            q.trim(),
        limit:        25,
        locale:       'pt_BR',
        access_token: accessToken,
      },
      timeout: 8000,
    });

    const raw: any[] = metaRes.data?.data || [];

    const data = raw.map(item => ({
      id:            String(item.id),
      name:          item.name as string,
      topic:         item.topic as string | undefined,
      path:          Array.isArray(item.path) ? item.path : [],
      audienceLower: item.audience_size_lower_bound as number | undefined,
      audienceUpper: item.audience_size_upper_bound as number | undefined,
    }));

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
