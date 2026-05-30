/**
 * GET/PUT /api/admin/master/tenants/[id]/meta-identity
 *
 * Master gerencia a identidade Meta de qualquer tenant.
 * Campos: page_id, pixel_id, instagram_actor_id → tenant_network_credentials.credentials (JSONB)
 *         website                                → tenants.website
 *
 * Somente Master (is_system_role) pode acessar.
 */
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database/connection';
import { getTokenPayload } from '@/lib/auth/jwt-node';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const payload = getTokenPayload(request);
    if (!payload?.is_system_role) {
      return NextResponse.json({ error: 'Acesso restrito ao Master' }, { status: 403 });
    }

    const tenantId = params.id;

    const [credsRes, tenantRes] = await Promise.all([
      pool.query(
        `SELECT tnc.credentials, tnc.account_id, tnc.is_active, tnc.last_validated, tnc.expires_at
         FROM public.tenant_network_credentials tnc
         JOIN public.ad_networks n ON n.id = tnc.network_id
         WHERE tnc.tenant_id = $1::uuid AND n.code = 'meta'
         LIMIT 1`,
        [tenantId],
      ),
      pool.query(
        `SELECT website, name, telefone FROM public.tenants WHERE id = $1::uuid LIMIT 1`,
        [tenantId],
      ),
    ]);

    const creds  = credsRes.rows[0]?.credentials || {};
    const tenant = tenantRes.rows[0] || {};

    return NextResponse.json({
      pageId:           creds.page_id            || '',
      pixelId:          creds.pixel_id            || '',
      instagramActorId: creds.instagram_actor_id  || '',
      accessToken:      creds.access_token        ? '••••••••' : '',
      adAccountId:      credsRes.rows[0]?.account_id || '',
      credentialsActive: credsRes.rows[0]?.is_active ?? false,
      website:          tenant.website  || '',
      tenantName:       tenant.name     || '',
    });
  } catch (error: any) {
    console.error('[master/tenant/meta-identity] GET error:', error);
    return NextResponse.json({ error: 'Erro ao buscar identidade Meta' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const payload = getTokenPayload(request);
    if (!payload?.is_system_role) {
      return NextResponse.json({ error: 'Acesso restrito ao Master' }, { status: 403 });
    }

    const tenantId = params.id;
    const { pageId, pixelId, instagramActorId, website } = await request.json();

    // 1. Atualizar page_id / pixel_id / instagram_actor_id nas credentials do tenant
    if (pageId !== undefined || pixelId !== undefined || instagramActorId !== undefined) {
      const existingRes = await pool.query(
        `SELECT tnc.id FROM public.tenant_network_credentials tnc
         JOIN public.ad_networks n ON n.id = tnc.network_id
         WHERE tnc.tenant_id = $1::uuid AND n.code = 'meta' LIMIT 1`,
        [tenantId],
      );

      const patch: Record<string, string> = {};
      if (pageId !== undefined)           patch.page_id            = pageId;
      if (pixelId !== undefined)          patch.pixel_id           = pixelId;
      if (instagramActorId !== undefined) patch.instagram_actor_id = instagramActorId;

      if (existingRes.rows[0]) {
        await pool.query(
          `UPDATE public.tenant_network_credentials
           SET credentials = credentials || $1::jsonb, updated_at = NOW()
           WHERE id = $2`,
          [JSON.stringify(patch), existingRes.rows[0].id],
        );
      } else {
        await pool.query(
          `INSERT INTO public.tenant_network_credentials
             (tenant_id, network_id, credentials, display_name, is_active)
           SELECT $1::uuid, n.id, $2::jsonb, 'Meta Ads', true
           FROM public.ad_networks n WHERE n.code = 'meta'`,
          [tenantId, JSON.stringify(patch)],
        );
      }
    }

    // 2. Atualizar website no tenant
    if (website !== undefined) {
      await pool.query(
        `UPDATE public.tenants SET website = $1, updated_at = NOW() WHERE id = $2::uuid`,
        [website || null, tenantId],
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[master/tenant/meta-identity] PUT error:', error);
    return NextResponse.json({ error: 'Erro ao salvar identidade Meta' }, { status: 500 });
  }
}
