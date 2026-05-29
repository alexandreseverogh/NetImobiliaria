/**
 * GET/PUT /api/admin/clientes/[id]/campaign-settings
 *
 * Lê e grava as configurações de campanha de um cliente específico:
 *   page_id, pixel_id, instagram_actor_id, website
 *
 * Também retorna os valores do tenant como fallback, para o UI
 * mostrar "usando configuração do tenant" quando o campo está vazio.
 */
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database/connection';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { requireApiPermission } from '@/lib/auth/apiPermissions';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Busca campos do cliente + fallbacks do tenant em uma query
    const res = await pool.query(`
      SELECT
        c.uuid,
        c.nome,
        c.page_id            AS client_page_id,
        c.pixel_id           AS client_pixel_id,
        c.instagram_actor_id AS client_instagram_actor_id,
        c.website            AS client_website,
        -- fallbacks do tenant
        tnc.credentials->>'page_id'            AS tenant_page_id,
        tnc.credentials->>'pixel_id'           AS tenant_pixel_id,
        tnc.credentials->>'instagram_actor_id' AS tenant_instagram_actor_id,
        t.website                               AS tenant_website,
        tnc.credentials->>'ad_account_id'       AS ad_account_id,
        tnc.is_active                           AS credentials_active
      FROM public.clientes c
      JOIN public.tenants t ON t.uuid = c.tenant_id
      LEFT JOIN public.ad_networks an ON an.code = 'meta'
      LEFT JOIN public.tenant_network_credentials tnc
             ON tnc.tenant_id = c.tenant_id AND tnc.network_id = an.id
      WHERE c.uuid = $1::uuid AND c.tenant_id = $2::uuid
    `, [params.id, payload.tenantId]);

    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    const row = res.rows[0];
    return NextResponse.json({
      clientId:  row.uuid,
      clientName: row.nome,
      // Valores do cliente (sobrescrevem tenant quando preenchidos)
      pageId:           row.client_page_id            || '',
      pixelId:          row.client_pixel_id           || '',
      instagramActorId: row.client_instagram_actor_id || '',
      website:          row.client_website            || '',
      // Fallbacks do tenant (exibidos no UI como "padrão do tenant")
      fallback: {
        pageId:           row.tenant_page_id            || '',
        pixelId:          row.tenant_pixel_id           || '',
        instagramActorId: row.tenant_instagram_actor_id || '',
        website:          row.tenant_website            || '',
        adAccountId:      row.ad_account_id             || '',
        credentialsActive: row.credentials_active       ?? false,
      },
    });
  } catch (error: any) {
    console.error('[campaign-settings GET] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const denied = await requireApiPermission(request, 'clientes', 'UPDATE');
    if (denied) return denied;

    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { pageId, pixelId, instagramActorId, website } = await request.json();

    const res = await pool.query(`
      UPDATE public.clientes
      SET
        page_id            = $1,
        pixel_id           = $2,
        instagram_actor_id = $3,
        website            = $4,
        updated_at         = NOW()
      WHERE uuid = $5::uuid AND tenant_id = $6::uuid
      RETURNING uuid, nome, page_id, pixel_id, instagram_actor_id, website
    `, [
      pageId            || null,
      pixelId           || null,
      instagramActorId  || null,
      website           || null,
      params.id,
      payload.tenantId,
    ]);

    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    const row = res.rows[0];
    return NextResponse.json({
      pageId:           row.page_id            || '',
      pixelId:          row.pixel_id           || '',
      instagramActorId: row.instagram_actor_id || '',
      website:          row.website            || '',
    });
  } catch (error: any) {
    console.error('[campaign-settings PUT] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
