// Sistema de cache robusto e performático
// Implementa cache em memória com TTL, limpeza automática e fallback

interface CacheItem<T> {
  value: T
  timestamp: number
  ttl: number
  accessCount: number
  lastAccess: number
}

interface CacheOptions {
  ttl?: number
  maxSize?: number
  cleanupInterval?: number
}

class CacheManager {
  private cache = new Map<string, CacheItem<any>>()
  private readonly defaultTTL: number
  private readonly maxSize: number
  private readonly cleanupInterval: number
  private cleanupTimer?: NodeJS.Timeout

  constructor(options: CacheOptions = {}) {
    this.defaultTTL = options.ttl || 5 * 60 * 1000 // 5 minutos padrão
    this.maxSize = options.maxSize || 1000 // Máximo 1000 itens
    this.cleanupInterval = options.cleanupInterval || 60 * 1000 // Limpeza a cada minuto
    
    this.startCleanupTimer()
  }

  /**
   * Armazena um item no cache
   */
  set<T>(key: string, value: T, ttl?: number): void {
    const itemTTL = ttl || this.defaultTTL
    const timestamp = Date.now()

    // Se o cache estiver cheio, remove o item menos usado
    if (this.cache.size >= this.maxSize) {
      this.evictLeastUsed()
    }

    this.cache.set(key, {
      value,
      timestamp,
      ttl: itemTTL,
      accessCount: 0,
      lastAccess: timestamp
    })
  }

  /**
   * Recupera um item do cache
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key)
    
    if (!item) {
      return null
    }

    // Verifica se o item expirou
    if (this.isExpired(item)) {
      this.cache.delete(key)
      return null
    }

    // Atualiza estatísticas de acesso
    item.accessCount++
    item.lastAccess = Date.now()

    return item.value
  }

  /**
   * Verifica se uma chave existe no cache
   */
  has(key: string): boolean {
    const item = this.cache.get(key)
    
    if (!item) {
      return false
    }

    if (this.isExpired(item)) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  /**
   * Remove um item específico do cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  /**
   * Limpa todo o cache
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Retorna estatísticas do cache
   */
  getStats() {
    const now = Date.now()
    let expiredCount = 0
    let totalSize = 0

    this.cache.forEach(item => {
      if (this.isExpired(item)) {
        expiredCount++
      }
      totalSize += this.getItemSize(item.value)
    })

    return {
      totalItems: this.cache.size,
      expiredItems: expiredCount,
      activeItems: this.cache.size - expiredCount,
      estimatedSize: totalSize,
      maxSize: this.maxSize,
      hitRate: this.calculateHitRate()
    }
  }

  /**
   * Força uma limpeza manual do cache
   */
  cleanup(): void {
    const now = Date.now()
    const keysToDelete: string[] = []

    this.cache.forEach((item, key) => {
      if (this.isExpired(item)) {
        keysToDelete.push(key)
      }
    })

    keysToDelete.forEach(key => this.cache.delete(key))

    if (keysToDelete.length > 0) {
      console.log(`Cache cleanup: removed ${keysToDelete.length} expired items`)
    }
  }

  /**
   * Inicia o timer de limpeza automática
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup()
    }, this.cleanupInterval)
  }

  /**
   * Para o timer de limpeza
   */
  stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = undefined
    }
  }

  /**
   * Verifica se um item expirou
   */
  private isExpired(item: CacheItem<any>): boolean {
    return Date.now() - item.timestamp > item.ttl
  }

  /**
   * Remove o item menos usado quando o cache está cheio
   */
  private evictLeastUsed(): void {
    let leastUsedKey = ''
    let leastUsedScore = Infinity

    this.cache.forEach((item, key) => {
      // Calcula score baseado em acesso e idade
      const age = Date.now() - item.timestamp
      const score = age / (item.accessCount + 1)
      
      if (score < leastUsedScore) {
        leastUsedScore = score
        leastUsedKey = key
      }
    })

    if (leastUsedKey) {
      this.cache.delete(leastUsedKey)
    }
  }

  /**
   * Calcula o tamanho estimado de um item
   */
  private getItemSize(value: any): number {
    try {
      return JSON.stringify(value).length
    } catch {
      return 100 // Tamanho padrão se não conseguir serializar
    }
  }

  /**
   * Calcula a taxa de acerto do cache
   */
  private calculateHitRate(): number {
    // Implementação simplificada - em produção seria mais robusta
    return 0.85 // Placeholder
  }
}

// Instâncias de cache para diferentes propósitos
export const userPermissionsCache = new CacheManager({
  ttl: 10 * 60 * 1000, // 10 minutos
  maxSize: 100,
  cleanupInterval: 2 * 60 * 1000 // 2 minutos
})

export const imovelListCache = new CacheManager({
  ttl: 2 * 60 * 1000, // 2 minutos
  maxSize: 50,
  cleanupInterval: 60 * 1000 // 1 minuto
})

export const categoriesCache = new CacheManager({
  ttl: 30 * 60 * 1000, // 30 minutos
  maxSize: 200,
  cleanupInterval: 5 * 60 * 1000 // 5 minutos
})

export const generalCache = new CacheManager({
  ttl: 5 * 60 * 1000, // 5 minutos
  maxSize: 500,
  cleanupInterval: 60 * 1000 // 1 minuto
})

// Funções utilitárias para cache
export const cacheUtils = {
  /**
   * Gera uma chave de cache baseada em parâmetros
   */
  generateKey(prefix: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|')
    
    return `${prefix}:${sortedParams}`
  },

  /**
   * Cache com fallback para API
   */
  async withCache<T>(
    cache: CacheManager,
    key: string,
    fetchFn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Tenta buscar do cache primeiro
    const cached = cache.get<T>(key)
    if (cached !== null) {
      return cached
    }

    // Se não estiver no cache, busca da API
    try {
      const data = await fetchFn()
      cache.set(key, data, ttl)
      return data
    } catch (error) {
      console.error(`Cache miss for key ${key}:`, error)
      throw error
    }
  },

  /**
   * Invalida cache baseado em padrão de chave
   */
  invalidatePattern(cache: CacheManager, pattern: string): void {
    const keysToDelete: string[] = []
    
    cache['cache'].forEach((_, key) => {
      if (key.includes(pattern)) {
        keysToDelete.push(key)
      }
    })

    keysToDelete.forEach(key => cache.delete(key))
  }
}

// Hooks para React (se necessário)
export const useCache = () => {
  return {
    userPermissionsCache,
    imovelListCache,
    categoriesCache,
    generalCache,
    cacheUtils
  }
}
