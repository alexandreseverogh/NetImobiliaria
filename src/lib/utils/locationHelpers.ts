/**
 * Utilitários para trabalhar com localização (estados e municípios)
 * Baseado no JSON de municípios
 */

/**
 * Mapeamento de IDs de estados para siglas
 * Ordem alfabética por sigla
 */
export const ESTADO_ID_TO_SIGLA: { [key: number]: string } = {
  0: 'RO',  // Rondônia
  1: 'AC',  // Acre
  2: 'AM',  // Amazonas
  3: 'RR',  // Roraima
  4: 'PA',  // Pará
  5: 'AP',  // Amapá
  6: 'TO',  // Tocantins
  7: 'MA',  // Maranhão
  8: 'PI',  // Piauí
  9: 'CE',  // Ceará
  10: 'RN', // Rio Grande do Norte
  11: 'PB', // Paraíba
  12: 'PE', // Pernambuco
  13: 'AL', // Alagoas
  14: 'SE', // Sergipe
  15: 'BA', // Bahia
  16: 'MG', // Minas Gerais
  17: 'ES', // Espírito Santo
  18: 'RJ', // Rio de Janeiro
  19: 'SP', // São Paulo
  20: 'PR', // Paraná
  21: 'SC', // Santa Catarina
  22: 'RS', // Rio Grande do Sul
  23: 'MS', // Mato Grosso do Sul
  24: 'MT', // Mato Grosso
  25: 'GO', // Goiás
  26: 'DF'  // Distrito Federal
}

/**
 * Mapeamento inverso: sigla para ID
 */
export const ESTADO_SIGLA_TO_ID: { [key: string]: number } = Object.entries(ESTADO_ID_TO_SIGLA)
  .reduce((acc, [id, sigla]) => {
    acc[sigla] = parseInt(id)
    return acc
  }, {} as { [key: string]: number })

/**
 * Nomes completos dos estados por sigla
 */
export const ESTADO_SIGLA_TO_NOME: { [key: string]: string } = {
  'RO': 'Rondônia',
  'AC': 'Acre',
  'AM': 'Amazonas',
  'RR': 'Roraima',
  'PA': 'Pará',
  'AP': 'Amapá',
  'TO': 'Tocantins',
  'MA': 'Maranhão',
  'PI': 'Piauí',
  'CE': 'Ceará',
  'RN': 'Rio Grande do Norte',
  'PB': 'Paraíba',
  'PE': 'Pernambuco',
  'AL': 'Alagoas',
  'SE': 'Sergipe',
  'BA': 'Bahia',
  'MG': 'Minas Gerais',
  'ES': 'Espírito Santo',
  'RJ': 'Rio de Janeiro',
  'SP': 'São Paulo',
  'PR': 'Paraná',
  'SC': 'Santa Catarina',
  'RS': 'Rio Grande do Sul',
  'MS': 'Mato Grosso do Sul',
  'MT': 'Mato Grosso',
  'GO': 'Goiás',
  'DF': 'Distrito Federal'
}

/**
 * Converte ID do estado para sigla
 * @param estadoId - ID do estado (0-26)
 * @returns Sigla do estado ou null se ID inválido
 * 
 * @example
 * getEstadoSigla(19) // 'SP'
 * getEstadoSigla(12) // 'PE'
 */
export function getEstadoSigla(estadoId: number): string | null {
  return ESTADO_ID_TO_SIGLA[estadoId] || null
}

/**
 * Converte sigla do estado para ID
 * @param sigla - Sigla do estado (ex: 'SP', 'RJ')
 * @returns ID do estado ou null se sigla inválida
 * 
 * @example
 * getEstadoId('SP') // 19
 * getEstadoId('PE') // 12
 */
export function getEstadoId(sigla: string): number | null {
  const upperSigla = sigla.toUpperCase()
  return ESTADO_SIGLA_TO_ID[upperSigla] ?? null
}

/**
 * Converte sigla do estado para nome completo
 * @param sigla - Sigla do estado (ex: 'SP', 'RJ')
 * @returns Nome completo do estado ou null se sigla inválida
 * 
 * @example
 * getEstadoNome('SP') // 'São Paulo'
 * getEstadoNome('PE') // 'Pernambuco'
 */
export function getEstadoNome(sigla: string): string | null {
  const upperSigla = sigla.toUpperCase()
  return ESTADO_SIGLA_TO_NOME[upperSigla] || null
}

/**
 * Converte ID do estado para nome completo
 * @param estadoId - ID do estado (0-26)
 * @returns Nome completo do estado ou null se ID inválido
 * 
 * @example
 * getEstadoNomeById(19) // 'São Paulo'
 * getEstadoNomeById(12) // 'Pernambuco'
 */
export function getEstadoNomeById(estadoId: number): string | null {
  const sigla = getEstadoSigla(estadoId)
  return sigla ? getEstadoNome(sigla) : null
}

/**
 * Valida se uma sigla de estado é válida
 * @param sigla - Sigla do estado
 * @returns true se válida, false caso contrário
 * 
 * @example
 * isValidEstadoSigla('SP') // true
 * isValidEstadoSigla('XX') // false
 */
export function isValidEstadoSigla(sigla: string): boolean {
  const upperSigla = sigla.toUpperCase()
  return upperSigla in ESTADO_SIGLA_TO_ID
}

/**
 * Valida se um ID de estado é válido
 * @param estadoId - ID do estado
 * @returns true se válido, false caso contrário
 * 
 * @example
 * isValidEstadoId(19) // true
 * isValidEstadoId(99) // false
 */
export function isValidEstadoId(estadoId: number): boolean {
  return estadoId in ESTADO_ID_TO_SIGLA
}

/**
 * Retorna todos os estados como array de objetos
 * @returns Array com { id, sigla, nome } de todos os estados
 * 
 * @example
 * getAllEstados() // [{ id: 0, sigla: 'RO', nome: 'Rondônia' }, ...]
 */
export function getAllEstados(): Array<{ id: number; sigla: string; nome: string }> {
  return Object.entries(ESTADO_ID_TO_SIGLA).map(([id, sigla]) => ({
    id: parseInt(id),
    sigla,
    nome: ESTADO_SIGLA_TO_NOME[sigla]
  }))
}

/**
 * Busca estados por nome parcial
 * @param searchTerm - Termo de busca
 * @returns Array com estados que correspondem à busca
 * 
 * @example
 * searchEstados('paulo') // [{ id: 19, sigla: 'SP', nome: 'São Paulo' }]
 * searchEstados('rio') // [{ id: 10, sigla: 'RN', nome: 'Rio Grande do Norte' }, { id: 18, sigla: 'RJ', nome: 'Rio de Janeiro' }, { id: 22, sigla: 'RS', nome: 'Rio Grande do Sul' }]
 */
export function searchEstados(searchTerm: string): Array<{ id: number; sigla: string; nome: string }> {
  const lowerSearch = searchTerm.toLowerCase()
  return getAllEstados().filter(estado => 
    estado.nome.toLowerCase().includes(lowerSearch) ||
    estado.sigla.toLowerCase().includes(lowerSearch)
  )
}


