interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
    lastRequest: number
  }
}

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
  blockDurationMs?: number
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: number
  retryAfter?: number
}

const store: RateLimitStore = {}

// Configurações de rate limiting por tipo de endpoint
const rateLimitConfigs: { [key: string]: RateLimitConfig } = {
  'login': {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutos
    blockDurationMs: 30 * 60 * 1000 // 30 minutos de bloqueio
  },
  'api': {
    maxRequests: 100,
    windowMs: 15 * 60 * 1000, // 15 minutos
    blockDurationMs: 5 * 60 * 1000 // 5 minutos de bloqueio
  },
  'admin': {
    maxRequests: 200,
    windowMs: 15 * 60 * 1000, // 15 minutos
    blockDurationMs: 10 * 60 * 1000 // 10 minutos de bloqueio
  },
  'default': {
    maxRequests: 50,
    windowMs: 15 * 60 * 1000, // 15 minutos
    blockDurationMs: 5 * 60 * 1000 // 5 minutos de bloqueio
  }
}

export function rateLimit(
  identifier: string,
  endpointType: string = 'default',
  customConfig?: Partial<RateLimitConfig>
): RateLimitResult {
  const now = Date.now()
  const key = identifier
  const config = { ...rateLimitConfigs[endpointType] || rateLimitConfigs.default, ...customConfig }
  
  // Limpar entradas expiradas
  if (store[key] && now > store[key].resetTime) {
    delete store[key]
  }
  
  // Se não existe entrada, criar nova
  if (!store[key]) {
    store[key] = {
      count: 1,
      resetTime: now + config.windowMs,
      lastRequest: now
    }
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: store[key].resetTime
    }
  }
  
  // Verificar se está bloqueado
  if (config.blockDurationMs && (now - store[key].lastRequest) < config.blockDurationMs) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: store[key].resetTime,
      retryAfter: Math.ceil((config.blockDurationMs - (now - store[key].lastRequest)) / 1000)
    }
  }
  
  // Verificar limite de requisições
  if (store[key].count >= config.maxRequests) {
    store[key].lastRequest = now
    return {
      allowed: false,
      remaining: 0,
      resetTime: store[key].resetTime,
      retryAfter: Math.ceil((store[key].resetTime - now) / 1000)
    }
  }
  
  // Incrementar contador
  store[key].count++
  store[key].lastRequest = now
  
  return {
    allowed: true,
    remaining: config.maxRequests - store[key].count,
    resetTime: store[key].resetTime
  }
}

export function getRateLimitInfo(identifier: string): RateLimitResult | null {
  const key = identifier
  if (!store[key]) return null
  
  const now = Date.now()
  if (now > store[key].resetTime) {
    delete store[key]
    return null
  }
  
  return {
    allowed: store[key].count < 50, // Assumir limite padrão para info
    remaining: Math.max(0, 50 - store[key].count),
    resetTime: store[key].resetTime
  }
}

// Função para limpar store (útil para testes)
export function clearRateLimitStore(): void {
  Object.keys(store).forEach(key => delete store[key])
}

// Função para obter estatísticas do rate limiting
export function getRateLimitStats(): { totalKeys: number; activeKeys: number } {
  const now = Date.now()
  const activeKeys = Object.keys(store).filter(key => now <= store[key].resetTime).length
  
  return {
    totalKeys: Object.keys(store).length,
    activeKeys
  }
}

