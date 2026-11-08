/**
 * GET/PUT /api/admin/dados-empresa/whatsapp-campanhas
 *
 * Número de WhatsApp Business usado no redirect dos anúncios de click-to-WhatsApp (Meta).
 * Mesmo registro tenant-wide de /api/admin/campanhas/settings/whatsapp (WhatsAppConfig,
 * client_id NULL), mas acessível pela permissão `dados-empresa`, que o administrador da
 * empresa já tem. Não recebe clientId: o override por cliente fica na tela do cliente.
 */
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database/connection';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { requireAnyApiPermission } from '@/lib/auth/apiPermissions';
import {
  resolveWhatsAppConfig,
  resolveEvolutionPairedNumber,
  whatsappNumbersMatch,
} from '@/lib/marketing/services/whatsappConfigResolver';

export const dynamic = 'force-dynamic';

const RESOURCE = 'dados-empresa';
const DIGITS_RE = /^\d{10,13}$/;

export async function GET(request: NextRequest) {
  const payload = getTokenPayload(request);
  if (!payload?.tenantId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  const denied = await requireAnyApiPermission(request, [RESOURCE], 'READ');
  if (denied) return denied;

  const config = await resolveWhatsAppConfig(payload.tenantId, null);
  const evolutionNumber = await resolveEvolutionPairedNumber(payload.tenantId, null);
  return NextResponse.json({
    phoneNumber: config?.phoneNumber || '',
    defaultMessage: config?.defaultMessage || '',
    businessName: config?.businessName || '',
    evolutionNumber: evolutionNumber || '',
    numbersMatch: whatsappNumbersMatch(config?.phoneNumber, evolutionNumber),
  });
}

export async function PUT(request: NextRequest) {
  const payload = getTokenPayload(request);
  if (!payload?.tenantId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  const denied = await requireAnyApiPermission(request, [RESOURCE], 'UPDATE');
  if (denied) return denied;

  let body: { phoneNumber?: string; defaultMessage?: string; businessName?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Corpo inválido' }, { status: 400 });
  }

  const phone = (body.phoneNumber ?? '').replace(/\D/g, '');
  const message = (body.defaultMessage ?? '').trim();
  if (!DIGITS_RE.test(phone)) {
    return NextResponse.json({ error: 'Número deve conter apenas dígitos, com DDI e DDD (10 a 13 dígitos)' }, { status: 400 });
  }
  if (!message) {
    return NextResponse.json({ error: 'Mensagem padrão é obrigatória' }, { status: 400 });
  }

  // Upsert tenant-wide: mesmo índice parcial com COALESCE usado por settings/whatsapp.
  await pool.query(
    `INSERT INTO campanhasmarketingdigital."WhatsAppConfig"
       (id, tenant_id, client_id, "phoneNumber", "defaultMessage", "businessName", "isDefault")
     VALUES (gen_random_uuid()::text, $1::uuid, NULL, $2, $3, $4, true)
     ON CONFLICT (tenant_id, (COALESCE(client_id, '00000000-0000-0000-0000-000000000000'::uuid)))
     DO UPDATE SET "phoneNumber" = EXCLUDED."phoneNumber",
                   "defaultMessage" = EXCLUDED."defaultMessage",
                   "businessName" = EXCLUDED."businessName"`,
    [payload.tenantId, phone, message, body.businessName?.trim() || null],
  );
  return NextResponse.json({ success: true });
}
