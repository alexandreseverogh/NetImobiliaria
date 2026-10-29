import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database/connection';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { requireApiPermission } from '@/lib/auth/apiPermissions';
import { resolveWhatsAppConfig, resolveEvolutionPairedNumber, whatsappNumbersMatch } from '@/lib/marketing/services/whatsappConfigResolver';

export const dynamic = 'force-dynamic';

/**
 * Número/mensagem padrão (tenant-wide) usados no redirect de CTA WhatsApp do anúncio
 * (`/api/r/[trackingId]`) quando a campanha não pertence a nenhum cliente específico, ou
 * quando o cliente dela não tem um override próprio. O override POR CLIENTE vive em
 * `/api/admin/clientes/[id]/campaign-settings` (mesmo padrão já usado lá pra page_id/pixel_id/
 * instagram_actor_id/website — "cliente sobrescreve, tenant é o fallback") — esta rota aqui
 * nunca recebe `clientId`, de propósito, pelo mesmo motivo de `MetaIdentitySection` nunca
 * receber: edição por cliente tem seu próprio lugar natural na tela daquele cliente.
 *
 * GET também expõe `evolutionNumber`/`numbersMatch` (achado #3, 2026-10-27): compara este
 * número contra o que está de fato pareado com a instância Evolution que recebe mensagem real
 * na Mensageria (`tenants.numero_whatsapp`) — um admin pode configurar aqui um número que nunca
 * chega na Mensageria sem perceber; isso torna esse desalinhamento visível, não silencioso.
 */
export async function GET(request: NextRequest) {
  try {
    const payload = getTokenPayload(request);
    if (!payload || !payload.tenantId) {
      return NextResponse.json({ error: 'Tenant não encontrado ou usuário não autenticado' }, { status: 401 });
    }

    const config = await resolveWhatsAppConfig(payload.tenantId, null);
    const evolutionNumber = await resolveEvolutionPairedNumber(payload.tenantId, null);
    const numbersMatch = whatsappNumbersMatch(config?.phoneNumber, evolutionNumber);

    return NextResponse.json({
      phoneNumber: config?.phoneNumber || '',
      defaultMessage: config?.defaultMessage || '',
      businessName: config?.businessName || '',
      evolutionNumber: evolutionNumber || '',
      numbersMatch,
    });
  } catch (error) {
    console.error('Erro no GET /settings/whatsapp:', error);
    return NextResponse.json({ error: 'Erro ao buscar config WhatsApp' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    // 'configuracoes-campanhas' é o resource real (o mesmo que o UpdateGuard client-side desta
    // tela já checa) — 'campanhasmarketingdigital' (usado aqui antes) é resource fantasma, nunca
    // existe no mapa de permissões de nenhum admin de tenant, mesma classe de bug já corrigida
    // em settings/route.ts, settings/meta-identity/route.ts e configuracoes/redes/route.ts.
    const denied = await requireApiPermission(request, 'configuracoes-campanhas', 'UPDATE');
    if (denied) return denied;

    const payload = getTokenPayload(request);
    if (!payload || !payload.tenantId) {
      return NextResponse.json({ error: 'Tenant não encontrado ou usuário não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { phoneNumber, defaultMessage, businessName } = body;
    if (!phoneNumber?.trim() || !defaultMessage?.trim()) {
      return NextResponse.json({ error: 'phoneNumber e defaultMessage são obrigatórios' }, { status: 400 });
    }

    // Upsert tenant-wide (client_id sempre NULL aqui) — mesma técnica de índice parcial com
    // COALESCE já usada em labels/canned_responses (ver migration-2026-10-28-whatsapp-config-
    // client-scope.sql); Prisma não suporta esse alvo de conflito, por isso SQL cru.
    const { rows } = await pool.query(
      `INSERT INTO campanhasmarketingdigital."WhatsAppConfig"
         (id, tenant_id, client_id, "phoneNumber", "defaultMessage", "businessName", "isDefault")
       VALUES (gen_random_uuid()::text, $1::uuid, NULL, $2, $3, $4, true)
       ON CONFLICT (tenant_id, (COALESCE(client_id, '00000000-0000-0000-0000-000000000000'::uuid)))
       DO UPDATE SET "phoneNumber" = EXCLUDED."phoneNumber",
                     "defaultMessage" = EXCLUDED."defaultMessage",
                     "businessName" = EXCLUDED."businessName"
       RETURNING id, "phoneNumber", "defaultMessage", "businessName"`,
      [payload.tenantId, phoneNumber.trim(), defaultMessage.trim(), businessName?.trim() || null],
    );

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error('Erro no PUT /settings/whatsapp:', error);
    return NextResponse.json({ error: 'Erro ao salvar config WhatsApp' }, { status: 500 });
  }
}
