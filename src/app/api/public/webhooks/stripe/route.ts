import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { getStripeClient, isStripeConfigured } from '@/lib/stripe/client'
import type Stripe from 'stripe'

export const dynamic = 'force-dynamic'

/**
 * POST /api/public/webhooks/stripe
 *
 * Recebe eventos da Stripe e atualiza public.tenant_modules.billing_status —
 * o único sinal que get_sidebar_menu_for_user() checa pra decidir se um
 * módulo pago some da sidebar por inadimplência (ver
 * prisma/migration-2026-09-19-sidebar-billing-gate.sql). Nunca toca em
 * tenant_modules.is_enabled (isso continua sendo o toggle manual do
 * Master) nem em tenants.isento_* (isso continua sendo curadoria manual).
 *
 * Modelo de cobrança (decisão de 2026-09-19): 1 Subscription COMBINADA por
 * tenant, com 1 line-item (SubscriptionItem) por módulo contratado — nunca
 * uma Subscription por módulo. Isso significa que, na prática, todos os
 * módulos de um tenant costumam ficar past_due/active JUNTOS (a fatura
 * cobre todos os line-items de uma vez) — trade-off aceito explicitamente
 * pelo usuário em troca de simplicidade de implementação/reconciliação.
 *
 * Eventos tratados:
 * - invoice.paid / invoice.payment_failed — o sinal mais preciso (por
 *   line-item, via invoice.lines.data[].subscription_item).
 * - customer.subscription.updated/.deleted — fallback por tenant inteiro,
 *   pego pelo stripe_subscription_id gravado em tenants (cobre estados que
 *   o ciclo de fatura sozinho não cobriria, ex. cancelamento direto).
 *
 * Falha de processamento retorna 500 de propósito — é o comportamento que a
 * própria Stripe recomenda pra disparar retry automático dela (backoff por
 * vários dias), em vez de engolir um erro transitório (timeout de DB, etc.)
 * e perder o evento pra sempre.
 */
export async function POST(request: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ ok: false, error: 'Stripe não configurado neste ambiente' }, { status: 501 })
  }

  const rawBody = await request.text()
  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ ok: false, error: 'sem assinatura' }, { status: 400 })
  }

  const stripe = getStripeClient()
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: `assinatura inválida: ${err.message}` }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'invoice.paid':
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const status = event.type === 'invoice.paid' ? 'active' : 'past_due'
        // API 2026-08-26.dahlia+: o SubscriptionItem de uma linha de fatura
        // não fica mais em invoice.line.subscription_item (campo antigo,
        // removido) — vive em line.parent.subscription_item_details.
        const subscriptionItemIds = (invoice.lines?.data ?? [])
          .map((line) => line.parent?.subscription_item_details?.subscription_item)
          .filter((id): id is string => typeof id === 'string')

        if (subscriptionItemIds.length > 0) {
          await pool.query(
            `UPDATE public.tenant_modules
                SET billing_status = $1, updated_at = NOW()
              WHERE stripe_subscription_item_id = ANY($2::text[])`,
            [status, subscriptionItemIds],
          )
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const status = mapStripeStatusToLocal(subscription.status)
        if (status) {
          await pool.query(
            `UPDATE public.tenant_modules
                SET billing_status = $1, updated_at = NOW()
              WHERE tenant_id = (
                SELECT id FROM public.tenants WHERE stripe_subscription_id = $2
              )`,
            [status, subscription.id],
          )
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await pool.query(
          `UPDATE public.tenant_modules
              SET billing_status = 'canceled', updated_at = NOW()
            WHERE tenant_id = (
              SELECT id FROM public.tenants WHERE stripe_subscription_id = $1
            )`,
          [subscription.id],
        )
        break
      }

      default:
        // Evento sem relação com o gate de acesso — ignorado de propósito.
        break
    }
  } catch (err: any) {
    console.error('[stripe-webhook] erro ao processar evento', event.type, err)
    return NextResponse.json({ ok: false, error: 'erro ao processar evento' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

function mapStripeStatusToLocal(
  status: Stripe.Subscription.Status,
): 'active' | 'past_due' | 'canceled' | 'trialing' | null {
  switch (status) {
    case 'active':
      return 'active'
    case 'trialing':
      return 'trialing'
    case 'past_due':
    case 'unpaid':
    case 'incomplete':
      return 'past_due'
    case 'canceled':
    case 'incomplete_expired':
      return 'canceled'
    case 'paused':
      // Pausa é uma decisão manual da Stripe/tenant, fora do escopo do
      // gate de inadimplência — não altera billing_status.
      return null
    default:
      return null
  }
}
