/**
 * Utilitários para parsing seguro de parâmetros de API
 * 
 * Estas funções garantem que parâmetros inválidos não causem crashes (500 errors),
 * retornando valores padrão seguros em vez de NaN ou lançar exceções.
 */

/**
 * Parse seguro de inteiros de parâmetros de URL
 * 
 * @param value - Valor a ser parseado (pode ser null, undefined, ou string)
 * @param defaultValue - Valor padrão a retornar se parsing falhar
 * @param min - Valor mínimo permitido (opcional)
 * @param max - Valor máximo permitido (opcional)
 * @returns Número parseado ou valor padrão
 * 
 * @example
 * // Parsing de paginação
 * const page = safeParseInt(searchParams.get('page'), 1, 1)
 * const limit = safeParseInt(searchParams.get('limit'), 20, 1, 100)
 * 
 * // Parsing de IDs
 * const userId = safeParseInt(searchParams.get('userId'), 0, 1)
 */
export function safeParseInt(
    value: string | null | undefined,
    defaultValue: number,
    min?: number,
    max?: number
): number {
    // Se valor é null, undefined ou string vazia, retornar padrão
    if (value === null || value === undefined || value.trim() === '') {
        return defaultValue
    }

    // Tentar fazer parsing
    const parsed = parseInt(value, 10)

    // Se parsing falhou (NaN), retornar padrão
    if (isNaN(parsed)) {
        return defaultValue
    }

    // Aplicar limites se fornecidos
    let result = parsed

    if (min !== undefined && result < min) {
        result = min
    }

    if (max !== undefined && result > max) {
        result = max
    }

    return result
}

/**
 * Parse seguro de floats de parâmetros de URL
 * 
 * @param value - Valor a ser parseado
 * @param defaultValue - Valor padrão a retornar se parsing falhar
 * @param min - Valor mínimo permitido (opcional)
 * @param max - Valor máximo permitido (opcional)
 * @returns Número parseado ou valor padrão
 */
export function safeParseFloat(
    value: string | null | undefined,
    defaultValue: number,
    min?: number,
    max?: number
): number {
    if (value === null || value === undefined || value.trim() === '') {
        return defaultValue
    }

    const parsed = parseFloat(value)

    if (isNaN(parsed)) {
        return defaultValue
    }

    let result = parsed

    if (min !== undefined && result < min) {
        result = min
    }

    if (max !== undefined && result > max) {
        result = max
    }

    return result
}

/**
 * Parse seguro de booleanos de parâmetros de URL
 * 
 * @param value - Valor a ser parseado
 * @param defaultValue - Valor padrão a retornar se parsing falhar
 * @returns Boolean parseado ou valor padrão
 * 
 * @example
 * const isActive = safeParseBoolean(searchParams.get('active'), true)
 */
export function safeParseBoolean(
    value: string | null | undefined,
    defaultValue: boolean
): boolean {
    if (value === null || value === undefined || value.trim() === '') {
        return defaultValue
    }

    const normalized = value.toLowerCase().trim()

    if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
        return true
    }

    if (normalized === 'false' || normalized === '0' || normalized === 'no') {
        return false
    }

    return defaultValue
}
