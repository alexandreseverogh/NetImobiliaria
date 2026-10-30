import { NextRequest, NextResponse } from 'next/server';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { requireApiPermission } from '@/lib/auth/apiPermissions';
import pool from '@/lib/database/connection';

export const dynamic = 'force-dynamic';

/**
 * GET/POST /api/admin/campanhas/campaigns/[id]/manual-ref
 *
 * Código de rastreio manual pra campanha sem Ad/AdSet reais (importada direto da rede, ou
 * qualquer Campaign local) — o admin cola "[ref:<valor>]" direto na mensagem pré-preenchida do
 * CTA do anúncio, dentro da própria Meta. 3º caminho de `resolveCtaRef`
 * (src/lib/cta/service.ts) — ver docs/PLANO_REF_MANUAL_CAMPANHA_IMPORTADA.md.
 *
 * GET — retorna o código atual (ou null, se nunca gerado).
 * POST { regenerate?: boolean } — gera na 1ª vez; idempotente em chamadas seguintes (devolve o
 * mesmo valor) a menos que regenerate=true, que invalida o antigo e gera um novo.
 */

const PERMISSION_RESOURCE = 'campanhas-importar';

function generateManualRef(): string {
  // camp- + 6 chars alfanuméricos (sem caracteres ambíguos — sem 0/O/1/I/l) — curto o bastante
  // pra colar numa mensagem de WhatsApp sem poluir visualmente, prefixo deixa óbvio que é um
  // código técnico nosso (reduz chance de colisão com algo que um lead digitaria por acaso).
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `camp-${suffix}`;
}

async function loadCampaign(id: string, tenantId: string) {
  const { rows } = await pool.query(
    `SELECT id, name, manual_ref FROM campanhasmarketingdigital."Campaign"
      WHERE id = $1 AND tenant_id = $2::uuid
      LIMIT 1`,
    [id, tenantId],
  );
  return rows[0] || null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const denied = await requireApiPermission(request, PERMISSION_RESOURCE, 'READ');
    if (denied) return denied;

    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const campaign = await loadCampaign(params.id, payload.tenantId);
    if (!campaign) {
      return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 });
    }

    return NextResponse.json({
      manualRef: campaign.manual_ref,
      taggedMessage: campaign.manual_ref ? `[ref:${campaign.manual_ref}]` : null,
    });
  } catch (error: any) {
    console.error('GET /campaigns/[id]/manual-ref error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao buscar código' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    // 'CREATE', não 'UPDATE' — mesma permissão já concedida pra POST /campaigns/import (migração
    // 2026-10-25 só granteou read/create/execute pra esta feature, nunca update); gerar/regenerar
    // o código é semanticamente "criar um valor novo", não editar um campo central da campanha.
    const denied = await requireApiPermission(request, PERMISSION_RESOURCE, 'CREATE');
    if (denied) return denied;

    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    let regenerate = false;
    try {
      const body = await request.json();
      regenerate = !!body?.regenerate;
    } catch {
      // body vazio é válido — caso de uso normal "gerar pela 1ª vez" sem payload nenhum.
    }

    const campaign = await loadCampaign(params.id, payload.tenantId);
    if (!campaign) {
      return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 });
    }

    // Idempotente: já tem código e não pediu regenerar → devolve o mesmo, nunca troca à toa.
    if (campaign.manual_ref && !regenerate) {
      return NextResponse.json({
        manualRef: campaign.manual_ref,
        taggedMessage: `[ref:${campaign.manual_ref}]`,
      });
    }

    // Colisão é praticamente impossível (32^6 combinações, índice único global protege de
    // qualquer forma) — mas o loop evita um 500 no raríssimo caso de bater em outro tenant.
    let newRef = '';
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = generateManualRef();
      const { rows } = await pool.query(
        `SELECT 1 FROM campanhasmarketingdigital."Campaign" WHERE manual_ref = $1 LIMIT 1`,
        [candidate],
      );
      if (rows.length === 0) { newRef = candidate; break; }
    }
    if (!newRef) {
      return NextResponse.json({ error: 'Não foi possível gerar um código único — tente novamente.' }, { status: 500 });
    }

    const updated = await pool.query(
      `UPDATE campanhasmarketingdigital."Campaign"
       SET manual_ref = $1
       WHERE id = $2 AND tenant_id = $3::uuid
       RETURNING manual_ref`,
      [newRef, params.id, payload.tenantId],
    );

    return NextResponse.json({
      manualRef: updated.rows[0].manual_ref,
      taggedMessage: `[ref:${updated.rows[0].manual_ref}]`,
      regenerated: regenerate && !!campaign.manual_ref,
    });
  } catch (error: any) {
    if (error?.code === '23505') {
      return NextResponse.json({ error: 'Colisão de código — tente novamente.' }, { status: 409 });
    }
    console.error('POST /campaigns/[id]/manual-ref error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao gerar código' }, { status: 500 });
  }
}
