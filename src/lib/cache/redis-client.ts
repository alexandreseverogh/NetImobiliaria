/**
 * ============================================================
 * Redis Client — Fail-Safe Singleton
 * ============================================================
 * Se Redis não estiver configurado ou indisponível, todas as
 * operações retornam null/false silenciosamente.
 * A aplicação NUNCA quebra por causa do Redis.
 *
 * Variáveis de ambiente:
 *   REDIS_HOST     — Host do Redis (ex: localhost, redis)
 *   REDIS_PORT     — Porta (default: 6379)
 *   REDIS_PASSWORD — Senha (opcional)
 * ============================================================
 */

import Redis from 'ioredis'

let _client: Redis | null = null
let _connectionAttempted = false

function createClient(): Redis | null {
  if (_connectionAttempted) return _client
  _connectionAttempted = true

  const host = process.env.REDIS_HOST
  if (!host) {
    if (process.env.NODE_ENV !== 'test') {
      console.warn('⚠️ [Redis] REDIS_HOST não configurado. Cache desabilitado (modo degradado).')
    }
    return null
  }

  const port = parseInt(process.env.REDIS_PORT || '6379')
  const password = process.env.REDIS_PASSWORD || undefined

  try {
    const client = new Redis({
      host,
      port,
      password,
      maxRetriesPerRequest: 2,
      enableReadyCheck: true,
      connectTimeout: 5000,
      lazyConnect: true,
      retryStrategy: (times) => {
        if (times > 3) {
          console.error('❌ [Redis] Falha após 3 tentativas. Cache desabilitado.')
          return null // para de tentar reconectar
        }
        return Math.min(times * 300, 2000)
      },
    })

    client.on('connect', () =>
      console.log(`✅ [Redis] Conectado em ${host}:${port}`)
    )
    client.on('ready', () =>
      console.log('✅ [Redis] Pronto para uso.')
    )
    client.on('error', (err) => {
      // Não propaga — Redis é opcional para a aplicação
      console.warn('⚠️ [Redis] Erro de conexão (não crítico):', err.message)
    })

    // Conectar de forma lazy sem bloquear o startup
    client.connect().catch(() => {})

    return client
  } catch (err) {
    console.error('❌ [Redis] Falha ao criar cliente:', err)
    return null
  }
}

/** Retorna o cliente Redis (singleton). Pode ser null se não configurado. */
export function getRedisClient(): Redis | null {
  if (!_client && !_connectionAttempted) {
    _client = createClient()
  }
  return _client
}

/** Verifica se Redis está pronto para uso */
export function isRedisReady(): boolean {
  const client = getRedisClient()
  return client !== null && client.status === 'ready'
}

export default getRedisClient
