import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database/connection';
import { GoogleAdsAdapter } from '@/lib/marketing/networks/google/GoogleAdsAdapter';
import { getTokenPayload } from '@/lib/auth/jwt-node';

// Credenciais do Google Ads vivem em public.tenant_network_credentials (mesmo padrão do
// Meta), join por public.ad_networks.code = 'google'. Ver docs/PLANO_GOOGLE_TIKTOK.md —
// decisão de consolidação 2026-07-19 (não usar tabela dedicada).

async function loadGoogleCredentials(tenantId: string) {
  const res = await pool.query(
    `SELECT tnc.credentials, tnc.account_id, tnc.is_active
     FROM public.tenant_network_credentials tnc
     JOIN public.ad_networks n ON n.id = tnc.network_id
     WHERE tnc.tenant_id = $1::uuid AND n.code = 'google'
     LIMIT 1`,
    [tenantId],
  );
  return res.rows[0] || null;
}

export async function GET(request: NextRequest) {
  try {
    const payload = getTokenPayload(request);
    const tenantId = payload?.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const row = await loadGoogleCredentials(tenantId);
    if (!row) {
      return NextResponse.json({ config: null });
    }

    const creds = row.credentials || {};

    // Ofuscar senhas/tokens para segurança na UI
    return NextResponse.json({
      config: {
        developerToken: creds.developer_token ? '••••••••' : '',
        clientId: creds.client_id ? '••••••••' : '',
        clientSecret: creds.client_secret ? '••••••••' : '',
        refreshToken: creds.refresh_token ? '••••••••' : '',
        customerId: row.account_id || creds.customer_id || '',
        isActive: row.is_active,
      }
    });
  } catch (error: any) {
    console.error('Erro no GET /configuracoes/google-ads:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = getTokenPayload(request);
    const tenantId = payload?.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { developerToken, clientId, clientSecret, refreshToken, customerId, isActive } = body;

    // Se estiverem vindo com "••••••••", significa que o cliente não alterou esses campos no form.
    // Vamos buscar no BD para recuperar os originais antes de testar
    let finalDevToken = developerToken;
    let finalClientId = clientId;
    let finalClientSecret = clientSecret;
    let finalRefreshToken = refreshToken;

    if (developerToken === '••••••••' || clientId === '••••••••' || clientSecret === '••••••••' || refreshToken === '••••••••') {
      const existingRow = await loadGoogleCredentials(tenantId);
      const existing = existingRow?.credentials || {};
      if (developerToken === '••••••••') finalDevToken = existing.developer_token;
      if (clientId === '••••••••') finalClientId = existing.client_id;
      if (clientSecret === '••••••••') finalClientSecret = existing.client_secret;
      if (refreshToken === '••••••••') finalRefreshToken = existing.refresh_token;
    }

    // Testar as credenciais
    const adapter = new GoogleAdsAdapter({
      developer_token: finalDevToken,
      client_id: finalClientId,
      client_secret: finalClientSecret,
      refresh_token: finalRefreshToken,
      customer_id: customerId,
    });

    const validation = await adapter.validateCredentials();
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error || 'Credenciais inválidas' }, { status: 400 });
    }

    // Lookup do network_id (tabela genérica public.ad_networks)
    const netRes = await pool.query(
      `SELECT id FROM public.ad_networks WHERE code = 'google' LIMIT 1`,
    );
    if (!netRes.rows[0]) {
      return NextResponse.json({ error: 'Rede "google" não cadastrada em ad_networks' }, { status: 500 });
    }
    const networkId = netRes.rows[0].id;

    const credentials = {
      developer_token: finalDevToken,
      client_id: finalClientId,
      client_secret: finalClientSecret,
      refresh_token: finalRefreshToken,
      customer_id: customerId,
    };

    await pool.query(
      `INSERT INTO public.tenant_network_credentials
         (tenant_id, network_id, credentials, account_id, display_name, is_active, updated_at)
       VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, now())
       ON CONFLICT (tenant_id, network_id)
       DO UPDATE SET
         credentials  = EXCLUDED.credentials,
         account_id   = EXCLUDED.account_id,
         is_active    = EXCLUDED.is_active,
         updated_at   = now()`,
      [
        tenantId,
        networkId,
        JSON.stringify(credentials),
        customerId,
        'Google Ads',
        isActive !== undefined ? isActive : true,
      ],
    );

    return NextResponse.json({ success: true, config: { customerId, isActive: isActive !== undefined ? isActive : true } });
  } catch (error: any) {
    console.error('Erro no POST /configuracoes/google-ads:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}
