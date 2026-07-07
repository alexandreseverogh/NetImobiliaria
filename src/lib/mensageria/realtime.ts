/**
 * Tempo real do Mensageria via Redis Pub/Sub → SSE.
 * Fail-safe: se Redis não estiver configurado/disponível, publish() e subscribe()
 * são no-ops — a aplicação funciona normalmente sem tempo real (só sem live update),
 * mesmo padrão de tolerância do restante da plataforma (ver redis-client.ts).
 *
 * Ver docs/PLANO_MENSAGERIA.md seção 6.
 */
import { getRedisClient } from '@/lib/cache/redis-client'
import type Redis from 'ioredis'

export type MensageriaEvent =
  | { type: 'message.created'; conversationId: string; message: any }
  | { type: 'conversation.updated'; conversationId: string; patch: any }

function channelFor(tenantId: string): string {
  return `mensageria:${tenantId}`
}

/** Publica um evento para todos os assinantes do tenant (outras abas/atendentes). */
export function publishMensageriaEvent(tenantId: string, event: MensageriaEvent): void {
  const client = getRedisClient()
  if (!client) return
  client.publish(channelFor(tenantId), JSON.stringify(event)).catch(() => {})
}

/**
 * Abre uma conexão DEDICADA de subscribe (ioredis exige conexão própria para
 * modo subscribe — não pode compartilhar com o client de comandos normais).
 * Retorna null se Redis não estiver disponível. Chamador é responsável por
 * chamar `.disconnect()` no client retornado quando a conexão SSE fechar.
 */
export function subscribeMensageriaEvents(
  tenantId: string,
  onMessage: (event: MensageriaEvent) => void,
): Redis | null {
  const base = getRedisClient()
  if (!base) return null

  const subscriber = base.duplicate()
  subscriber.subscribe(channelFor(tenantId)).catch(() => {})
  subscriber.on('message', (_channel, raw) => {
    try {
      onMessage(JSON.parse(raw))
    } catch {
      // payload inválido — ignora
    }
  })
  return subscriber
}
