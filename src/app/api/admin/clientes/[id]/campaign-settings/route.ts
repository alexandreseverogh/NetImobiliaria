/**
 * GET/PUT /api/admin/clientes/[id]/campaign-settings
 *
 * Lê e grava as configurações de campanha de um cliente específico:
 *   page_id, pixel_id, instagram_actor_id, website, whatsappNumber/whatsappMessage/
 *   whatsappBusinessName (achado #1/#2, 2026-10-27 — o único jeito real de um cliente ter um
 *   número de WhatsApp PRÓPRIO no redirect de CTA de anúncio, em vez de sempre herdar o
 *   número do tenant inteiro mesmo quando a campanha é dele).
 *
 * Também retorna os valores do tenant como fallback, para o UI
 * mostrar "usando configuração do tenant" quando o campo está vazio.
 *
 * O WhatsApp fica numa tabela própria (campanhasmarketingdigital."WhatsAppConfig"), não em
 * colunas de public.clientes — lido/gravado via whatsappConfigResolver.ts, a mesma fonte usada
 * pelo redirect real (/api/r/[trackingId]) e pela config tenant-wide (/settings/whatsapp).
 */
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database/connection';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { requireApiPermission } from '@/lib/auth/apiPermissions';
import { resolveWhatsAppConfig, resolveEvolutionPairedNumber, whatsappNumbersMatch } from '@/lib/marketing/services/whatsappConfigResolver';

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
      JOIN public.tenants t ON t.id = c.tenant_id
      LEFT JOIN public.ad_networks an ON an.code = 'meta'
      LEFT JOIN public.tenant_network_credentials tnc
             ON tnc.tenant_id = c.tenant_id AND tnc.network_id = an.id
      WHERE c.uuid = $1::uuid AND c.tenant_id = $2::uuid
    `, [params.id, payload.tenantId]);

    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    const row = res.rows[0];

    // WhatsApp: cliente (se existir) + fallback do tenant-wide, via a mesma cascata do redirect
    // real — nunca duplica a lógica de resolução.
    const clientWpp = await resolveWhatsAppConfig(payload.tenantId, params.id);
    const tenantWpp = await resolveWhatsAppConfig(payload.tenantId, null);
    const isClientOverride = clientWpp?.scope === 'client';
    const effectiveNumber = isClientOverride ? clientWpp?.phoneNumber : tenantWpp?.phoneNumber;
    const evolutionNumber = await resolveEvolutionPairedNumber(payload.tenantId, params.id);
    const numbersMatch = whatsappNumbersMatch(effectiveNumber, evolutionNumber);

    return NextResponse.json({
      clientId:  row.uuid,
      clientName: row.nome,
      // Valores do cliente (sobrescrevem tenant quando preenchidos)
      pageId:           row.client_page_id            || '',
      pixelId:          row.client_pixel_id           || '',
      instagramActorId: row.client_instagram_actor_id || '',
      website:          row.client_website            || '',
      whatsappNumber:        isClientOverride ? clientWpp!.phoneNumber    : '',
      whatsappMessage:       isClientOverride ? clientWpp!.defaultMessage : '',
      whatsappBusinessName:  isClientOverride ? (clientWpp!.businessName || '') : '',
      // Fallbacks do tenant (exibidos no UI como "padrão do tenant")
      fallback: {
        pageId:           row.tenant_page_id            || '',
        pixelId:          row.tenant_pixel_id           || '',
        instagramActorId: row.tenant_instagram_actor_id || '',
        website:          row.tenant_website            || '',
        adAccountId:      row.ad_account_id             || '',
        credentialsActive: row.credentials_active       ?? false,
        whatsappNumber:        tenantWpp?.phoneNumber    || '',
        whatsappMessage:       tenantWpp?.defaultMessage || '',
        whatsappBusinessName:  tenantWpp?.businessName   || '',
      },
      // Achado #3 (2026-10-27) — compara o número EFETIVO (cliente se houver override, senão
      // tenant) contra o que de fato está pareado com a Evolution na escala do cliente.
      // `null` = nenhum nível tem número configurado em algum dos dois lados, não dá pra comparar.
      evolutionNumber: evolutionNumber || '',
      numbersMatch,
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

    const { pageId, pixelId, instagramActorId, website, whatsappNumber, whatsappMessage, whatsappBusinessName } = await request.json();

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

    // WhatsApp: ambos preenchidos → grava override do cliente (upsert); ambos vazios → apaga o
    // override (restaura herança do tenant); só um preenchido → combinação inválida, 400.
    const wantsNumber  = (whatsappNumber || '').trim();
    const wantsMessage = (whatsappMessage || '').trim();
    if (!!wantsNumber !== !!wantsMessage) {
      return NextResponse.json(
        { error: 'WhatsApp: informe número e mensagem juntos, ou deixe os dois vazios para herdar do tenant.' },
        { status: 400 },
      );
    }
    if (wantsNumber && wantsMessage) {
      await pool.query(
        `INSERT INTO campanhasmarketingdigital."WhatsAppConfig"
           (id, tenant_id, client_id, "phoneNumber", "defaultMessage", "businessName", "isDefault")
         VALUES (gen_random_uuid()::text, $1::uuid, $2::uuid, $3, $4, $5, true)
         ON CONFLICT (tenant_id, (COALESCE(client_id, '00000000-0000-0000-0000-000000000000'::uuid)))
         DO UPDATE SET "phoneNumber" = EXCLUDED."phoneNumber",
                       "defaultMessage" = EXCLUDED."defaultMessage",
                       "businessName" = EXCLUDED."businessName"`,
        [payload.tenantId, params.id, wantsNumber, wantsMessage, (whatsappBusinessName || '').trim() || null],
      );
    } else {
      await pool.query(
        `DELETE FROM campanhasmarketingdigital."WhatsAppConfig" WHERE tenant_id = $1::uuid AND client_id = $2::uuid`,
        [payload.tenantId, params.id],
      );
    }

    const row = res.rows[0];
    return NextResponse.json({
      pageId:           row.page_id            || '',
      pixelId:          row.pixel_id           || '',
      instagramActorId: row.instagram_actor_id || '',
      website:          row.website            || '',
      whatsappNumber:       wantsNumber,
      whatsappMessage:      wantsMessage,
      whatsappBusinessName: (whatsappBusinessName || '').trim(),
    });
  } catch (error: any) {
    console.error('[campaign-settings PUT] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
