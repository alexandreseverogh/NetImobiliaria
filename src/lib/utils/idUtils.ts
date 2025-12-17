/**
 * Utilitários para trabalhar com Dual Key (INTEGER e UUID)
 * FASE 2: Suporte para migração gradual INTEGER → UUID
 */

/**
 * Detecta se um ID é UUID ou INTEGER
 */
export function isUUID(id: string | number): boolean {
  if (typeof id === 'number') {
    return false
  }
  
  // Pattern UUID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidPattern.test(id)
}

/**
 * Converte ID para o tipo apropriado
 */
export function parseId(id: string | number): { value: string | number, isUUID: boolean } {
  const uuid = isUUID(id)
  
  if (uuid) {
    return { value: id as string, isUUID: true }
  } else {
    const numValue = typeof id === 'string' ? parseInt(id, 10) : id
    return { value: numValue, isUUID: false }
  }
}

/**
 * Cria query SQL que aceita INTEGER ou UUID
 */
export function buildDualKeyQuery(
  tableName: 'clientes' | 'proprietarios',
  id: string | number
): { query: string, params: any[] } {
  const { value, isUUID: isUuid } = parseId(id)
  
  if (isUuid) {
    // Buscar por UUID
    return {
      query: `SELECT * FROM ${tableName} WHERE uuid = $1`,
      params: [value]
    }
  } else {
    // Buscar por INTEGER
    return {
      query: `SELECT * FROM ${tableName} WHERE id = $1`,
      params: [value]
    }
  }
}

/**
 * Normaliza ID de rota para INTEGER ou UUID
 * Usado em rotas dinâmicas [id]
 */
export function normalizeRouteId(routeId: string): string | number {
  if (isUUID(routeId)) {
    return routeId // UUID como string
  }
  
  const numValue = parseInt(routeId, 10)
  if (isNaN(numValue)) {
    throw new Error('ID inválido')
  }
  
  return numValue // INTEGER como number
}

/**
 * Formata ID para exibição
 */
export function formatId(id: string | number, showType: boolean = false): string {
  const { isUUID: isUuid } = parseId(id)
  
  if (showType) {
    return isUuid ? `UUID: ${id}` : `ID: ${id}`
  }
  
  return String(id)
}

/**
 * Valida se ID é válido (INTEGER ou UUID)
 */
export function isValidId(id: any): boolean {
  if (typeof id === 'number') {
    return !isNaN(id) && id > 0
  }
  
  if (typeof id === 'string') {
    // Pode ser INTEGER como string ou UUID
    if (isUUID(id)) {
      return true
    }
    
    const numValue = parseInt(id, 10)
    return !isNaN(numValue) && numValue > 0
  }
  
  return false
}


