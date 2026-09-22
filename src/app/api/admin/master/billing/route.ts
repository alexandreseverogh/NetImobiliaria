import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import pool from '@/lib/database/connection';

const VALID_STATUSES = ['active', 'past_due', 'canceled', 'trialing'] as const;
type BillingStatus = (typeof VALID_STATUSES)[number];

const ISENTO_COLUMN_BY_SLUG: Record<string, string> = {
  'trafego-pago': 'isento_marketingdigital',
  'mensageria': 'isento_mensageria',
  'crm': 'isento_crm',
};

async function requireMaster(request: NextRequest) {
  const token = request.cookies.get('admin_auth_token')?.value;
  const decoded = token ? await verifyToken(token) : null;
  if (!decoded || !decoded.is_system_role) {
    return { denied: NextResponse.json({ error: 'Acesso Master Requerido' }, { status: 403 }) };
  }
  return { denied: null };
}

/**
 * GET /api/admin/master/billing
 *
 * Lista, por tenant, o billing_status de cada módulo BILLÁVEL (trafego-pago/
 * mensageria/crm — os únicos com isento_* correspondente em `tenants`) que
 * o tenant tem contratado (tenant_modules.is_enabled=true). Módulos não-
 * billáveis (cadastros, imobiliario, etc.) nunca aparecem aqui — não fazem
 * parte do desenho de cobrança via Stripe (ver prisma/migration-2026-09-19-
 * stripe-billing-schema.sql).
 *
 * `?onlyIssues=1` filtra pra só tenants com pelo menos 1 módulo billável
 * em billing_status != 'active' (o caso que realmente precisa de atenção).
 */
export async function GET(request: NextRequest) {
  const { denied } = await requireMaster(request);
  if (denied) return denied;

  const onlyIssues = new URL(request.url).searchParams.get('onlyIssues') === '1';

  const { rows } = await pool.query(
    `SELECT
        t.id AS tenant_id,
        t.name AS tenant_name,
        t.stripe_customer_id,
        t.stripe_subscription_id,
        t.isento_marketingdigital,
        t.isento_mensageria,
        t.isento_crm,
        sm.id AS module_id,
        sm.slug AS module_slug,
        sm.name AS module_name,
        tm.billing_status,
        tm.stripe_subscription_item_id,
        tm.updated_at
      FROM tenant_modules tm
      JOIN tenants t ON t.id = tm.tenant_id
      JOIN system_modules sm ON sm.id = tm.module_id
      WHERE tm.is_enabled = true
        AND sm.slug IN ('trafego-pago', 'mensageria', 'crm')
      ORDER BY t.name, sm.name`,
  );

  const byTenant = new Map<string, any>();
  for (const row of rows) {
    if (!byTenant.has(row.tenant_id)) {
      byTenant.set(row.tenant_id, {
        tenantId: row.tenant_id,
        tenantName: row.tenant_name,
        stripeCustomerId: row.stripe_customer_id,
        stripeSubscriptionId: row.stripe_subscription_id,
        modules: [],
      });
    }
    const isentoColumn = ISENTO_COLUMN_BY_SLUG[row.module_slug];
    const isento = isentoColumn ? Boolean(row[isentoColumn]) : false;
    byTenant.get(row.tenant_id).modules.push({
      moduleId: row.module_id,
      moduleSlug: row.module_slug,
      moduleName: row.module_name,
      billingStatus: row.billing_status as BillingStatus,
      stripeSubscriptionItemId: row.stripe_subscription_item_id,
      isento,
      updatedAt: row.updated_at,
      // Bloqueado de verdade = past_due E o tenant não é isento daquele
      // módulo — mesma condição exata que get_sidebar_menu_for_user()/
      // getUserPermissions() usam pra decidir acesso.
      effectivelyBlocked: row.billing_status === 'past_due' && !isento,
    });
  }

  let tenants = Array.from(byTenant.values());
  if (onlyIssues) {
    tenants = tenants.filter((t) => t.modules.some((m: any) => m.billingStatus !== 'active'));
  }

  return NextResponse.json({ tenants });
}

/**
 * PATCH /api/admin/master/billing
 * Body: { tenantId, moduleId, billingStatus }
 *
 * Override manual do Master — mesmo campo que o webhook da Stripe altera
 * automaticamente (ver /api/public/webhooks/stripe). Usos legítimos: cobrar
 * um tenant fora da Stripe ainda (marcar past_due manualmente) ou dar um
 * respiro/forçar reativação antes do próximo ciclo de fatura processar.
 * Nunca mexe em stripe_subscription_item_id — isso continua sendo só a
 * Stripe quem escreve.
 */
export async function PATCH(request: NextRequest) {
  const { denied } = await requireMaster(request);
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  const { tenantId, moduleId, billingStatus } = body || {};

  if (!tenantId || !moduleId || !billingStatus) {
    return NextResponse.json({ error: 'tenantId, moduleId e billingStatus são obrigatórios' }, { status: 400 });
  }
  if (!VALID_STATUSES.includes(billingStatus)) {
    return NextResponse.json(
      { error: `billingStatus inválido. Valores aceitos: ${VALID_STATUSES.join(', ')}` },
      { status: 400 },
    );
  }

  const result = await pool.query(
    `UPDATE tenant_modules
        SET billing_status = $1, updated_at = NOW()
      WHERE tenant_id = $2 AND module_id = $3
      RETURNING tenant_id, module_id, billing_status`,
    [billingStatus, tenantId, moduleId],
  );

  if (result.rows.length === 0) {
    return NextResponse.json({ error: 'Tenant não tem esse módulo contratado (tenant_modules)' }, { status: 404 });
  }

  return NextResponse.json({ success: true, updated: result.rows[0] });
}
