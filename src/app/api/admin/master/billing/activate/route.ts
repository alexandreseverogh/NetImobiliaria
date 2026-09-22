import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import pool from '@/lib/database/connection';
import { isStripeSecretConfigured } from '@/lib/stripe/client';
import { activateTenantBilling } from '@/lib/stripe/tenantSubscription';

async function requireMaster(request: NextRequest) {
  const token = request.cookies.get('admin_auth_token')?.value;
  const decoded = token ? await verifyToken(token) : null;
  if (!decoded || !decoded.is_system_role) {
    return { denied: NextResponse.json({ error: 'Acesso Master Requerido' }, { status: 403 }) };
  }
  return { denied: null };
}

/**
 * POST /api/admin/master/billing/activate
 * Body: { tenantId }
 *
 * "Ativar Cobrança" — botão em /admin/master/billing, ação deliberada do
 * Master, NUNCA disparada automaticamente por outra tela. Cria o Customer
 * (ou reaproveita, se o tenant já tiver um) e 1 Subscription combinada na
 * Stripe cobrindo, num só assinatura, todo módulo billável que o tenant já
 * tem contratado (tenant_modules.is_enabled=true) — ver
 * src/lib/stripe/tenantSubscription.ts pro porquê de send_invoice.
 *
 * Idempotência: rejeita (409) se o tenant já tem stripe_subscription_id —
 * evita criar uma 2ª assinatura duplicada por clique repetido. "Editar"
 * módulos contratados depois de ativado é fora de escopo desta rota (fica
 * pra uma ação futura de "adicionar/remover item da assinatura").
 */
export async function POST(request: NextRequest) {
  const { denied } = await requireMaster(request);
  if (denied) return denied;

  if (!isStripeSecretConfigured()) {
    return NextResponse.json(
      { error: 'Stripe não configurado neste ambiente (STRIPE_SECRET_KEY ausente)' },
      { status: 501 },
    );
  }

  const body = await request.json().catch(() => null);
  const tenantId = body?.tenantId;
  if (!tenantId) {
    return NextResponse.json({ error: 'tenantId é obrigatório' }, { status: 400 });
  }

  const tenantRes = await pool.query(
    `SELECT id, name, email_contato, stripe_customer_id, stripe_subscription_id FROM tenants WHERE id = $1`,
    [tenantId],
  );
  if (tenantRes.rows.length === 0) {
    return NextResponse.json({ error: 'Tenant não encontrado' }, { status: 404 });
  }
  const tenant = tenantRes.rows[0];
  if (tenant.stripe_subscription_id) {
    return NextResponse.json(
      { error: 'Este tenant já tem cobrança ativada (stripe_subscription_id já existe)' },
      { status: 409 },
    );
  }
  // send_invoice exige e-mail no Customer (achado real via dry-run,
  // 2026-09-21) — sem isso a Stripe rejeita a Subscription inteira.
  if (!tenant.email_contato) {
    return NextResponse.json(
      { error: 'Tenant sem e-mail de contato cadastrado — preencha em /admin/master/tenants antes de ativar a cobrança' },
      { status: 400 },
    );
  }

  const modulesRes = await pool.query(
    `SELECT sm.id AS module_id, smb.stripe_price_id
       FROM tenant_modules tm
       JOIN system_modules sm ON sm.id = tm.module_id
       JOIN system_module_billing smb ON smb.module_id = sm.id
      WHERE tm.tenant_id = $1 AND tm.is_enabled = true AND smb.stripe_price_id IS NOT NULL`,
    [tenantId],
  );
  if (modulesRes.rows.length === 0) {
    return NextResponse.json(
      { error: 'Tenant não tem nenhum módulo billável contratado (Marketing Digital/Mensageria/CRM)' },
      { status: 400 },
    );
  }

  try {
    const { customerId, subscriptionId, itemsByModuleId } = await activateTenantBilling({
      tenantId,
      tenantName: tenant.name,
      tenantEmail: tenant.email_contato,
      existingStripeCustomerId: tenant.stripe_customer_id,
      modules: modulesRes.rows.map((r) => ({ moduleId: r.module_id, stripePriceId: r.stripe_price_id })),
    });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `UPDATE tenants SET stripe_customer_id = $1, stripe_subscription_id = $2 WHERE id = $3`,
        [customerId, subscriptionId, tenantId],
      );
      for (const [moduleId, subscriptionItemId] of Object.entries(itemsByModuleId)) {
        await client.query(
          `UPDATE tenant_modules
              SET stripe_subscription_item_id = $1, billing_status = 'active', updated_at = NOW()
            WHERE tenant_id = $2 AND module_id = $3`,
          [subscriptionItemId, tenantId, moduleId],
        );
      }
      await client.query('COMMIT');
    } catch (dbErr) {
      await client.query('ROLLBACK');
      throw dbErr;
    } finally {
      client.release();
    }

    return NextResponse.json({ success: true, customerId, subscriptionId, modulesActivated: Object.keys(itemsByModuleId).length });
  } catch (err: any) {
    console.error('[master/billing/activate] erro ao ativar cobrança na Stripe', err);
    return NextResponse.json({ error: err.message || 'Erro ao ativar cobrança na Stripe' }, { status: 500 });
  }
}
