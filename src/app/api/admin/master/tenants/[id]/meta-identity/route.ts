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
        `SELECT website, name, telefone,
                meta_app_id, meta_app_secret, meta_ad_account_id, meta_token, meta_token_expires_at,
                meta_page_id, meta_pixel_id, meta_instagram_actor_id
         FROM public.tenants WHERE id = $1::uuid LIMIT 1`,
        [tenantId],
      ),
    ]);

    const creds  = credsRes.rows[0]?.credentials || {};
    const tenant = tenantRes.rows[0] || {};

    return NextResponse.json({
      pageId:           tenant.meta_page_id      || creds.page_id            || '',
      pixelId:          tenant.meta_pixel_id     || creds.pixel_id           || '',
      instagramActorId: tenant.meta_instagram_actor_id || creds.instagram_actor_id  || '',
      accessToken:      tenant.meta_token || creds.access_token || '',
      appId:             tenant.meta_app_id       || creds.app_id             || '',
      metaAppSecret:     tenant.meta_app_secret   || creds.app_secret         || '',
      adAccountId:       tenant.meta_ad_account_id || credsRes.rows[0]?.account_id || '',
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
    const body = await request.json();
    const {
      pageId,
      pixelId,
      instagramActorId,
      website,
      metaAppId,
      metaAppSecret,
      metaToken,
      adAccountId,
    } = body;

    // 1. Atualizar public.tenants com os novos campos e campos de identidade
    const tenantSets: string[] = [];
    const tenantVals: any[] = [];
    let tIdx = 1;

    if (pageId !== undefined)           { tenantSets.push(`meta_page_id = $${tIdx++}`);           tenantVals.push(pageId); }
    if (pixelId !== undefined)          { tenantSets.push(`meta_pixel_id = $${tIdx++}`);          tenantVals.push(pixelId); }
    if (instagramActorId !== undefined) { tenantSets.push(`meta_instagram_actor_id = $${tIdx++}`); tenantVals.push(instagramActorId); }
    if (metaAppId !== undefined)        { tenantSets.push(`meta_app_id = $${tIdx++}`);            tenantVals.push(metaAppId); }
    if (metaAppSecret !== undefined)    { tenantSets.push(`meta_app_secret = $${tIdx++}`);        tenantVals.push(metaAppSecret); }
    if (metaToken !== undefined && metaToken !== '') {
      tenantSets.push(`meta_token = $${tIdx++}`);             tenantVals.push(metaToken);
      tenantSets.push(`meta_token_expires_at = $${tIdx++}`);  tenantVals.push(new Date(Date.now() + 60 * 86400 * 1000));
    }
    if (adAccountId !== undefined)      { tenantSets.push(`meta_ad_account_id = $${tIdx++}`);     tenantVals.push(adAccountId); }
    if (website !== undefined)          { tenantSets.push(`website = $${tIdx++}`);                tenantVals.push(website || null); }

    if (tenantSets.length > 0) {
      tenantVals.push(tenantId);
      await pool.query(
        `UPDATE public.tenants SET ${tenantSets.join(', ')}, updated_at = NOW() WHERE id = $${tIdx}::uuid`,
        tenantVals
      );
    }

    // 2. Atualizar tenant_network_credentials para retrocompatibilidade
    const patch: Record<string, any> = {};
    if (pageId !== undefined)           patch.page_id            = pageId;
    if (pixelId !== undefined)          patch.pixel_id           = pixelId;
    if (instagramActorId !== undefined) patch.instagram_actor_id = instagramActorId;
    if (metaAppId !== undefined)        patch.app_id             = metaAppId;
    if (metaAppSecret !== undefined)    patch.app_secret         = metaAppSecret;
    if (metaToken !== undefined && metaToken !== '') {
      patch.access_token = metaToken;
    }

    const hasCredsUpdate = Object.keys(patch).length > 0 || adAccountId !== undefined;

    if (hasCredsUpdate) {
      const existingRes = await pool.query(
        `SELECT tnc.id FROM public.tenant_network_credentials tnc
         JOIN public.ad_networks n ON n.id = tnc.network_id
         WHERE tnc.tenant_id = $1::uuid AND n.code = 'meta' LIMIT 1`,
        [tenantId],
      );

      const updates: string[] = [];
      const vals: any[] = [];
      let idx = 1;

      if (Object.keys(patch).length > 0) {
        updates.push(`credentials = credentials || $${idx++}::jsonb`);
        vals.push(JSON.stringify(patch));
      }
      if (adAccountId !== undefined) {
        updates.push(`account_id = $${idx++}`);
        vals.push(adAccountId);
      }
      if (metaToken !== undefined && metaToken !== '') {
        updates.push(`expires_at = $${idx++}`);
        vals.push(new Date(Date.now() + 60 * 86400 * 1000));
      }

      if (existingRes.rows[0]) {
        vals.push(existingRes.rows[0].id);
        await pool.query(
          `UPDATE public.tenant_network_credentials
           SET ${updates.join(', ')}, updated_at = NOW()
           WHERE id = $${idx}`,
          vals
        );
      } else {
        const insertCreds: Record<string, any> = {
          page_id:            pageId || '',
          pixel_id:           pixelId || '',
          instagram_actor_id: instagramActorId || '',
          app_id:             metaAppId || '',
          app_secret:         metaAppSecret || '',
          access_token:       metaToken || '',
        };

        await pool.query(
          `INSERT INTO public.tenant_network_credentials
             (tenant_id, network_id, credentials, account_id, display_name, is_active, expires_at)
           SELECT $1::uuid, n.id, $2::jsonb, $3, 'Meta Ads', true, $4
           FROM public.ad_networks n WHERE n.code = 'meta'`,
          [
            tenantId,
            JSON.stringify(insertCreds),
            adAccountId || null,
            metaToken ? new Date(Date.now() + 60 * 86400 * 1000) : null
          ]
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[master/tenant/meta-identity] PUT error:', error);
    return NextResponse.json({ error: 'Erro ao salvar identidade Meta' }, { status: 500 });
  }
}
