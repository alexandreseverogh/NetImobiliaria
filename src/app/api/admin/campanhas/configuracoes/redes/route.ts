import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database/connection';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { requireApiPermission } from '@/lib/auth/apiPermissions';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/campanhas/configuracoes/redes
 * Returns all ad networks with connection status for the authenticated tenant.
 */
export async function GET(request: NextRequest) {
  try {
    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    const tenantId = payload.tenantId;

    const res = await pool.query(
      `SELECT
         n.id,
         n.code,
         n.name,
         n.icon,
         n.color,
         n.is_active         AS network_active,
         n.capabilities,
         n.sort_order,
         tnc.id              AS credential_id,
         tnc.account_id,
         tnc.display_name,
         tnc.is_active       AS credential_active,
         tnc.expires_at,
         tnc.last_validated,
         tnc.updated_at      AS connected_at,
         CASE WHEN tnc.id IS NOT NULL AND tnc.is_active THEN true ELSE false END AS connected
       FROM public.ad_networks n
       LEFT JOIN public.tenant_network_credentials tnc
         ON tnc.network_id = n.id AND tnc.tenant_id = $1::uuid
       ORDER BY n.sort_order, n.name`,
      [tenantId],
    );

    return NextResponse.json({ networks: res.rows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/campanhas/configuracoes/redes
 * Connect or update credentials for a network.
 *
 * Body: { network_code, credentials: { access_token, ad_account_id, ... }, display_name? }
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar permissão de criação server-side
    const denied = await requireApiPermission(request, 'campanhasmarketingdigital', 'UPDATE');
    if (denied) return denied;

    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    const tenantId = payload.tenantId;

    const body = await request.json();
    const { network_code, credentials, display_name, account_id } = body as {
      network_code: string;
      credentials: Record<string, string>;
      display_name?: string;
      account_id?: string;
    };

    if (!network_code || !credentials) {
      return NextResponse.json({ error: 'network_code e credentials são obrigatórios' }, { status: 400 });
    }

    // Lookup network
    const netRes = await pool.query(
      `SELECT id FROM public.ad_networks WHERE code = $1 LIMIT 1`,
      [network_code],
    );
    if (!netRes.rows[0]) {
      return NextResponse.json({ error: `Rede "${network_code}" não encontrada` }, { status: 404 });
    }
    const networkId = netRes.rows[0].id;

    // For Meta: also sync back to legacy tenant columns
    if (network_code === 'meta') {
      await pool.query(
        `UPDATE public.tenants
         SET meta_token            = $2,
             meta_ad_account_id    = $3,
             meta_app_id           = $4,
             meta_app_secret       = $5,
             meta_token_expires_at = $6,
             updated_at            = now()
         WHERE id = $1::uuid`,
        [
          tenantId,
          credentials.access_token || null,
          account_id || credentials.ad_account_id || null,
          credentials.app_id || null,
          credentials.app_secret || null,
          credentials.expires_at ? new Date(credentials.expires_at) : null,
        ],
      );
    }

    await pool.query(
      `INSERT INTO public.tenant_network_credentials
         (tenant_id, network_id, credentials, account_id, display_name, is_active, updated_at)
       VALUES ($1::uuid, $2::uuid, $3, $4, $5, true, now())
       ON CONFLICT (tenant_id, network_id)
       DO UPDATE SET
         credentials  = EXCLUDED.credentials,
         account_id   = EXCLUDED.account_id,
         display_name = EXCLUDED.display_name,
         is_active    = true,
         updated_at   = now()`,
      [
        tenantId,
        networkId,
        JSON.stringify(credentials),
        account_id || credentials.ad_account_id || null,
        display_name || `${network_code.toUpperCase()} Ads`,
      ],
    );

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/campanhas/configuracoes/redes?network_code=meta
 * Disconnect a network (sets is_active=false, does not delete credentials).
 */
export async function DELETE(request: NextRequest) {
  try {
    // Verificar permissão de exclusão server-side
    const denied = await requireApiPermission(request, 'campanhasmarketingdigital', 'DELETE');
    if (denied) return denied;

    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    const tenantId = payload.tenantId;

    const { searchParams } = new URL(request.url);
    const networkCode = searchParams.get('network_code');
    if (!networkCode) {
      return NextResponse.json({ error: 'network_code é obrigatório' }, { status: 400 });
    }

    await pool.query(
      `UPDATE public.tenant_network_credentials tnc
       SET is_active = false, updated_at = now()
       FROM public.ad_networks n
       WHERE tnc.network_id = n.id
         AND tnc.tenant_id = $1::uuid
         AND n.code = $2`,
      [tenantId, networkCode],
    );

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
