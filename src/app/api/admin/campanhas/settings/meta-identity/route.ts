/**
 * GET/PUT /api/admin/campanhas/settings/meta-identity
 *
 * Gerencia os campos de "Identidade Meta" do tenant:
 *   - page_id, pixel_id, instagram_actor_id → tenant_network_credentials.credentials (JSONB)
 *   - website                               → tenants.website
 *
 * Revisão 2026-05-29 — Camada de Lançamento (seção 1.6.8 do plano mestre)
 */
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database/connection';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { requireApiPermission } from '@/lib/auth/apiPermissions';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const tenantId = payload.tenantId;

    // Buscar credenciais Meta existentes (tenant_network_credentials)
    const credsRes = await pool.query(
      `SELECT tnc.credentials, tnc.account_id, tnc.is_active, tnc.last_validated, tnc.expires_at
       FROM public.tenant_network_credentials tnc
       JOIN public.ad_networks n ON n.id = tnc.network_id
       WHERE tnc.tenant_id = $1::uuid AND n.code = 'meta'
       LIMIT 1`,
      [tenantId],
    );

    // Buscar website e nome do tenant
    const tenantRes = await pool.query(
      `SELECT website, name, meta_ad_account_id, meta_token_expires_at,
              meta_page_id, meta_pixel_id, meta_instagram_actor_id
       FROM public.tenants WHERE id = $1::uuid LIMIT 1`,
      [tenantId],
    );

    const creds = credsRes.rows[0]?.credentials || {};
    const tenant = tenantRes.rows[0] || {};

    return NextResponse.json({
      // Campos que vêm de public.tenants com fallback para tenant_network_credentials.credentials
      pageId:            tenant.meta_page_id      || creds.page_id            || '',
      pixelId:           tenant.meta_pixel_id     || creds.pixel_id           || '',
      instagramActorId:  tenant.meta_instagram_actor_id || creds.instagram_actor_id || '',
      accessToken:       tenant.meta_token || creds.access_token        || '',
      appId:             creds.app_id              || '',
      // account_id fica em tnc.account_id (coluna separada)
      adAccountId:       credsRes.rows[0]?.account_id || tenant.meta_ad_account_id || '',
      credentialsActive: credsRes.rows[0]?.is_active ?? false,
      lastValidated:     credsRes.rows[0]?.last_validated || null,
      tokenExpiresAt:    credsRes.rows[0]?.expires_at || tenant.meta_token_expires_at || null,
      // Campo que vem de tenants.website
      website:           tenant.website || '',
      tenantName:        tenant.name    || '',
    });
  } catch (error: any) {
    console.error('[meta-identity] GET error:', error);
    return NextResponse.json({ error: 'Erro ao buscar identidade Meta' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const denied = await requireApiPermission(request, 'campanhasmarketingdigital', 'UPDATE');
    if (denied) return denied;

    const tenantId = payload.tenantId;
    const body = await request.json();

    const {
      pageId,
      pixelId,
      instagramActorId,
      website,
    } = body as {
      pageId?:           string;
      pixelId?:          string;
      instagramActorId?: string;
      website?:          string;
    };

    // 1. Atualizar meta_page_id / meta_pixel_id / meta_instagram_actor_id em public.tenants
    if (pageId !== undefined || pixelId !== undefined || instagramActorId !== undefined) {
      const sets: string[] = [];
      const vals: any[] = [];
      let idx = 1;
      if (pageId !== undefined)           { sets.push(`meta_page_id = $${idx++}`);           vals.push(pageId); }
      if (pixelId !== undefined)          { sets.push(`meta_pixel_id = $${idx++}`);          vals.push(pixelId); }
      if (instagramActorId !== undefined) { sets.push(`meta_instagram_actor_id = $${idx++}`); vals.push(instagramActorId); }
      
      vals.push(tenantId);
      await pool.query(
        `UPDATE public.tenants SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${idx}::uuid`,
        vals
      );
    }

    // 2. Atualizar page_id / pixel_id / instagram_actor_id em tenant_network_credentials (retrocompatibilidade)
    //    Usa JSONB merge para não sobreescrever access_token/app_id/app_secret existentes
    if (pageId !== undefined || pixelId !== undefined || instagramActorId !== undefined) {
      // Verifica se já existe registro de credenciais Meta para o tenant
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
        // Merge JSONB: mantém campos existentes e atualiza apenas os enviados
        await pool.query(
          `UPDATE public.tenant_network_credentials
           SET credentials = credentials || $1::jsonb,
               updated_at  = NOW()
           WHERE id = $2`,
          [JSON.stringify(patch), existingRes.rows[0].id],
        );
      } else {
        // Cria registro se não existir (ex.: tenant ainda sem token Meta)
        await pool.query(
          `INSERT INTO public.tenant_network_credentials
             (tenant_id, network_id, credentials, display_name, is_active)
           SELECT $1::uuid, n.id, $2::jsonb, 'Meta Ads', true
           FROM public.ad_networks n WHERE n.code = 'meta'`,
          [tenantId, JSON.stringify(patch)],
        );
      }
    }

    // 3. Atualizar website no tenant
    if (website !== undefined) {
      await pool.query(
        `UPDATE public.tenants SET website = $1, updated_at = NOW() WHERE id = $2::uuid`,
        [website || null, tenantId],
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[meta-identity] PUT error:', error);
    return NextResponse.json({ error: 'Erro ao salvar identidade Meta' }, { status: 500 });
  }
}
