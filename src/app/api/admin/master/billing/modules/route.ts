import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import pool from '@/lib/database/connection';
import { isStripeSecretConfigured } from '@/lib/stripe/client';
import { updateModulePrice } from '@/lib/stripe/moduleBilling';

async function requireMaster(request: NextRequest) {
  const token = request.cookies.get('admin_auth_token')?.value;
  const decoded = token ? await verifyToken(token) : null;
  if (!decoded || !decoded.is_system_role) {
    return { denied: NextResponse.json({ error: 'Acesso Master Requerido' }, { status: 403 }) };
  }
  return { denied: null };
}

/**
 * GET /api/admin/master/billing/modules
 *
 * Lista os 3 módulos billáveis (trafego-pago/mensageria/crm) com o valor
 * mensal atual — sempre um espelho do Price real na Stripe (nunca editado
 * fora desta rota). Não chama a API da Stripe nesta rota — puramente
 * leitura do cache local (system_module_billing), rápido e sem
 * dependência de STRIPE_SECRET_KEY estar configurada.
 */
export async function GET(request: NextRequest) {
  const { denied } = await requireMaster(request);
  if (denied) return denied;

  const { rows } = await pool.query(
    `SELECT
        sm.id AS module_id,
        sm.name AS module_name,
        sm.slug AS module_slug,
        smb.stripe_product_id,
        smb.stripe_price_id,
        smb.price_cents,
        smb.currency,
        smb.updated_at
      FROM system_module_billing smb
      JOIN system_modules sm ON sm.id = smb.module_id
      ORDER BY sm.name`,
  );

  // Mapeia snake_case (driver pg) -> camelCase (o que o frontend consome,
  // mesma convenção já usada no GET de /api/admin/master/billing).
  const modules = rows.map((row: any) => ({
    moduleId: row.module_id,
    moduleName: row.module_name,
    moduleSlug: row.module_slug,
    stripeProductId: row.stripe_product_id,
    stripePriceId: row.stripe_price_id,
    priceCents: row.price_cents,
    currency: row.currency,
    updatedAt: row.updated_at,
  }));

  return NextResponse.json({ modules, stripeConfigured: isStripeSecretConfigured() });
}

/**
 * PATCH /api/admin/master/billing/modules
 * Body: { moduleId, priceCents }
 *
 * Cria um Price NOVO na Stripe pro Product real do módulo (Price é
 * imutável — "editar" sempre é "criar um novo e trocar qual está ativo",
 * ver src/lib/stripe/moduleBilling.ts), troca o default_price do Product,
 * desativa o Price antigo, e só DEPOIS espelha o novo price_cents/
 * stripe_price_id em system_module_billing — nunca escreve o cache antes
 * de confirmar a mudança real na Stripe.
 *
 * Sem STRIPE_SECRET_KEY configurada, retorna 501 (mesmo padrão de
 * degradação graciosa do webhook em /api/public/webhooks/stripe) — nunca
 * deixa o Master editar um valor que não reflete o que será cobrado.
 */
export async function PATCH(request: NextRequest) {
  const { denied } = await requireMaster(request);
  if (denied) return denied;

  if (!isStripeSecretConfigured()) {
    return NextResponse.json(
      { error: 'Stripe não configurado neste ambiente (STRIPE_SECRET_KEY ausente)' },
      { status: 501 },
    );
  }

  const body = await request.json().catch(() => null);
  const { moduleId, priceCents } = body || {};

  if (!moduleId || typeof priceCents !== 'number' || priceCents <= 0) {
    return NextResponse.json({ error: 'moduleId e priceCents (> 0, em centavos) são obrigatórios' }, { status: 400 });
  }

  const current = await pool.query(
    `SELECT stripe_product_id, stripe_price_id, currency FROM system_module_billing WHERE module_id = $1`,
    [moduleId],
  );
  if (current.rows.length === 0) {
    return NextResponse.json({ error: 'Módulo não está registrado como billável (system_module_billing)' }, { status: 404 });
  }
  const { stripe_product_id: stripeProductId, stripe_price_id: previousPriceId, currency } = current.rows[0];
  if (!stripeProductId) {
    return NextResponse.json({ error: 'Módulo sem Product Stripe associado ainda' }, { status: 409 });
  }

  try {
    const { priceId, unitAmountCents } = await updateModulePrice({
      stripeProductId,
      previousStripePriceId: previousPriceId,
      unitAmountCents: priceCents,
      currency: currency || 'BRL',
    });

    const result = await pool.query(
      `UPDATE system_module_billing
          SET stripe_price_id = $1, price_cents = $2, updated_at = NOW()
        WHERE module_id = $3
        RETURNING module_id, stripe_price_id, price_cents`,
      [priceId, unitAmountCents, moduleId],
    );

    return NextResponse.json({ success: true, updated: result.rows[0] });
  } catch (err: any) {
    console.error('[master/billing/modules] erro ao atualizar price na Stripe', err);
    return NextResponse.json({ error: err.message || 'Erro ao atualizar valor na Stripe' }, { status: 500 });
  }
}
