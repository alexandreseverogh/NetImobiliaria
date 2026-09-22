import { getStripeClient } from './client'

/**
 * "Ativar Cobrança" — ação deliberada do Master (botão em /admin/master/
 * billing), nunca automática na criação/edição de tenant (decisão de
 * 2026-09-21: o Master decide quando um tenant específico de fato começa
 * a ser cobrado via Stripe, não é side-effect silencioso de outra tela).
 *
 * Cria (ou reaproveita) o Customer do tenant na Stripe e uma Subscription
 * COMBINADA cobrindo, num único assinatura, 1 line-item por módulo
 * billável que o tenant já tem contratado (tenant_modules.is_enabled=true)
 * — decisão de 2026-09-19, "1 Subscription por tenant" em vez de 1 por
 * módulo.
 *
 * collection_method='send_invoice': a Stripe gera uma fatura hospedada a
 * cada ciclo, com prazo de `days_until_due` dias — o tenant paga por lá
 * (cartão OU outros métodos que sua conta Stripe aceitar), SEM precisar
 * de nenhuma tela nossa de coleta de cartão. Cobre a exigência original
 * de "invoice E cartão" sem exigir Payment Element nenhum agora; migrar
 * pra `charge_automatically` (cobrança automática recorrente) é possível
 * depois, quando/se um fluxo de coleta de cartão for construído.
 */
export async function activateTenantBilling(params: {
  tenantId: string
  tenantName: string
  tenantEmail: string
  existingStripeCustomerId: string | null
  modules: { moduleId: string; stripePriceId: string }[]
}): Promise<{
  customerId: string
  subscriptionId: string
  itemsByModuleId: Record<string, string>
}> {
  const stripe = getStripeClient()

  // collection_method='send_invoice' EXIGE e-mail no Customer (a Stripe
  // rejeita a Subscription sem isso — achado real, testado ao vivo via
  // dry-run em 2026-09-21) — sem e-mail, não há pra onde mandar a fatura.
  const customer = params.existingStripeCustomerId
    ? await stripe.customers.retrieve(params.existingStripeCustomerId)
    : await stripe.customers.create({
        name: params.tenantName,
        email: params.tenantEmail,
        metadata: { tenant_id: params.tenantId },
      })
  const customerId = customer.id

  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: params.modules.map((m) => ({ price: m.stripePriceId })),
    collection_method: 'send_invoice',
    days_until_due: 15,
    metadata: { tenant_id: params.tenantId },
  })

  // Correlaciona cada SubscriptionItem devolvido pela Stripe de volta ao
  // nosso module_id, casando por price.id (a Stripe não sabe o que é
  // "moduleId" pra gente — nunca ecoa esse dado de volta sozinha).
  const priceToModule = new Map(params.modules.map((m) => [m.stripePriceId, m.moduleId]))
  const itemsByModuleId: Record<string, string> = {}
  for (const item of subscription.items.data) {
    const moduleId = priceToModule.get(item.price.id)
    if (moduleId) itemsByModuleId[moduleId] = item.id
  }

  return { customerId, subscriptionId: subscription.id, itemsByModuleId }
}
