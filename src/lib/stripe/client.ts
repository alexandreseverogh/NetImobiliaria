import Stripe from 'stripe'

/**
 * Cliente Stripe compartilhado — lazy, só instancia quando de fato chamado
 * (nunca no import do módulo), pra nunca derrubar o build/boot da aplicação
 * se STRIPE_SECRET_KEY não estiver configurada ainda (mesmo padrão de
 * degradação graciosa já usado no resto da plataforma para chaves de LLM
 * ausentes).
 */
let cachedClient: Stripe | null = null

export function getStripeClient(): Stripe {
  if (cachedClient) return cachedClient
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY não configurada')
  }
  cachedClient = new Stripe(secretKey, {
    apiVersion: '2026-08-26.dahlia',
  })
  return cachedClient
}

/** true só quando as duas envs necessárias pro WEBHOOK estão presentes. */
export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET)
}

/**
 * true quando só a Secret Key está presente — suficiente pra chamadas de
 * escrita/leitura diretas à API (ex.: criar/editar Price de módulo), que
 * não envolvem verificação de assinatura de webhook nenhuma.
 */
export function isStripeSecretConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY)
}
