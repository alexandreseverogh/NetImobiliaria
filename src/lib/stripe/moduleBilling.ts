import { getStripeClient } from './client'

/**
 * "Editar o preço" de um módulo, no modelo real da Stripe: Price é
 * imutável (nunca se reescreve o valor de uma fatura já emitida), então
 * atualizar significa criar um Price NOVO sob o MESMO Product, trocar o
 * default_price do Product pra ele, e desativar o Price antigo (deixa de
 * valer pra assinaturas NOVAS; quem já estava numa Subscription com o
 * Price antigo continua nele até ser migrado explicitamente — comportamento
 * padrão de qualquer SaaS sobre Stripe, nunca muda retroativamente o que
 * já foi cobrado).
 *
 * Retorna o novo Price (id + unit_amount) pra persistir em
 * system_module_billing.
 */
export async function updateModulePrice(params: {
  stripeProductId: string
  previousStripePriceId: string | null
  unitAmountCents: number
  currency: string
}): Promise<{ priceId: string; unitAmountCents: number }> {
  const stripe = getStripeClient()

  const newPrice = await stripe.prices.create({
    product: params.stripeProductId,
    unit_amount: params.unitAmountCents,
    currency: params.currency.toLowerCase(),
    recurring: { interval: 'month' },
  })

  await stripe.products.update(params.stripeProductId, {
    default_price: newPrice.id,
  })

  if (params.previousStripePriceId && params.previousStripePriceId !== newPrice.id) {
    // Best-effort — desativar a price antiga nunca deve impedir a troca de
    // ter sido persistida (o default_price já mudou acima, que é o que
    // importa pra assinaturas novas).
    await stripe.prices.update(params.previousStripePriceId, { active: false }).catch(() => {})
  }

  return { priceId: newPrice.id, unitAmountCents: newPrice.unit_amount ?? params.unitAmountCents }
}
