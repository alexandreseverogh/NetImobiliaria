/**
 * 🔍 HELPER FUNCTION PARA AUDITORIA DE IMÓVEIS
 * 
 * Esta função compara o estado ANTES (before) e DEPOIS (after) de uma edição
 * e retorna apenas os campos que foram alterados com seus valores before/after.
 * 
 * ⚠️ IMPORTANTE: Esta função é PURA e ISOLADA - não faz queries, não acessa banco,
 * não causa side-effects. Pode ser testada de forma completamente independente.
 * 
 * 🛡️ GUARDIAN RULES: Segue rigorosamente os princípios de não-destruição
 */

interface ImovelBefore {
  // Campos básicos
  titulo?: string | null
  descricao?: string | null
  codigo?: string | null
  
  // Endereço
  endereco?: string | null
  numero?: string | null
  complemento?: string | null
  bairro?: string | null
  cidade?: string | null
  estado?: string | null
  cep?: string | null
  latitude?: number | null
  longitude?: number | null
  
  // Preços
  preco?: number | null
  preco_condominio?: number | null
  preco_iptu?: number | null
  taxa_extra?: number | null
  
  // Características físicas
  area_total?: number | null
  area_construida?: number | null
  quartos?: number | null
  banheiros?: number | null
  suites?: number | null
  vagas_garagem?: number | null
  andar?: number | null
  total_andares?: number | null
  
  // Booleanos
  mobiliado?: boolean | null
  aceita_permuta?: boolean | null
  aceita_financiamento?: boolean | null
  destaque?: boolean | null
  
  // Relacionamentos (FKs)
  tipo_fk?: number | null
  finalidade_fk?: number | null
  status_fk?: number | null
  proprietario_uuid?: string | null
  
  // Amenidades (IDs)
  amenidades?: number[]
  
  // Proximidades (IDs)
  proximidades?: number[]
  
  // Contagem de imagens
  imagens_count?: number
  
  // Contagem de documentos
  documentos_count?: number
}

interface ImovelAfter {
  // Campos básicos
  titulo?: string
  descricao?: string
  proprietario_uuid?: string | null
  
  // Endereço (pode vir dentro de objeto 'endereco')
  endereco?: {
    endereco?: string
    numero?: string
    complemento?: string
    bairro?: string
    cidade?: string
    estado?: string
    cep?: string
  } | string
  latitude?: number | null
  longitude?: number | null
  
  // Preços (pode vir com nomes diferentes do frontend)
  preco?: number | string
  precoCondominio?: number | string
  preco_condominio?: number | string
  precoIPTU?: number | string
  preco_iptu?: number | string
  taxaExtra?: number | string
  taxa_extra?: number | string
  
  // Características físicas
  areaTotal?: number | string
  area_total?: number | string
  areaConstruida?: number | string
  area_construida?: number | string
  quartos?: number | string
  banheiros?: number | string
  suites?: number | string
  vagasGaragem?: number | string
  vagas_garagem?: number | string
  andar?: number | string
  totalAndares?: number | string
  total_andares?: number | string
  
  // Booleanos
  mobiliado?: boolean
  aceitaPermuta?: boolean
  aceita_permuta?: boolean
  aceitaFinanciamento?: boolean
  aceita_financiamento?: boolean
  destaque?: boolean
  
  // Relacionamentos (FKs)
  tipo_fk?: number | string
  finalidade_fk?: number | string
  status_fk?: number | string
  
  // Amenidades (pode vir como array de objetos ou IDs)
  amenidades?: Array<{ id: number } | number> | number[]
  
  // Proximidades (pode vir como array de objetos ou IDs)
  proximidades?: Array<{ id: number } | number> | number[]
  
  // Imagens (apenas contagem)
  imagens_count?: number
  
  // Documentos (apenas contagem)
  documentos_count?: number
}

interface ChangeDetail {
  before: any
  after: any
  added?: any
  removed?: any
  action?: 'added' | 'removed'
}

interface AuditChanges {
  [key: string]: ChangeDetail
}

/**
 * Normaliza valor numérico (string para number, null handling)
 */
function normalizeNumber(value: any): number | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = parseFloat(value.replace(/[^0-9.-]/g, ''))
    return isNaN(parsed) ? null : parsed
  }
  return null
}

/**
 * Normaliza valor booleano
 */
function normalizeBoolean(value: any): boolean | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true' || value === '1'
  }
  if (typeof value === 'number') {
    return value === 1
  }
  return null
}

/**
 * Normaliza string (trim, null handling)
 */
function normalizeString(value: any): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed === '' ? null : trimmed
  }
  return String(value)
}

/**
 * Normaliza array de IDs (de objetos ou números diretos)
 */
function normalizeIdArray(value: any): number[] {
  if (!value) return []
  if (!Array.isArray(value)) return []
  
  return value.map(item => {
    if (typeof item === 'number') return item
    if (typeof item === 'object' && item.id) return item.id
    return null
  }).filter(id => id !== null) as number[]
}

/**
 * Compara arrays de IDs
 */
function arraysEqual(arr1: number[], arr2: number[]): boolean {
  if (arr1.length !== arr2.length) return false
  const sorted1 = [...arr1].sort((a, b) => a - b)
  const sorted2 = [...arr2].sort((a, b) => a - b)
  return sorted1.every((val, idx) => val === sorted2[idx])
}

/**
 * Extrai valor de endereço (pode vir como objeto ou string)
 */
function extractEnderecoValue(data: ImovelAfter, field: string): string | null {
  if (data.endereco && typeof data.endereco === 'object') {
    return normalizeString((data.endereco as any)[field])
  }
  return null
}

/**
 * 🎯 FUNÇÃO PRINCIPAL: Constrói objeto de mudanças (before/after)
 * 
 * @param before - Estado ANTES da edição (do banco de dados)
 * @param after - Estado DEPOIS da edição (da requisição)
 * @returns Objeto com apenas os campos que mudaram { campo: { before, after } }
 */
export function buildImovelAuditChanges(
  before: ImovelBefore,
  after: ImovelAfter
): AuditChanges {
  const changes: AuditChanges = {}
  
  // ============================================
  // CAMPOS BÁSICOS
  // ============================================
  
  // Título
  const tituloBefore = normalizeString(before.titulo)
  const tituloAfter = normalizeString(after.titulo)
  if (tituloBefore !== tituloAfter) {
    changes.titulo = { before: tituloBefore, after: tituloAfter }
  }
  
  // Descrição
  const descricaoBefore = normalizeString(before.descricao)
  const descricaoAfter = normalizeString(after.descricao)
  if (descricaoBefore !== descricaoAfter) {
    changes.descricao = { before: descricaoBefore, after: descricaoAfter }
  }
  
  // ============================================
  // ENDEREÇO
  // ============================================
  
  // Endereço (logradouro)
  const enderecoBefore = normalizeString(before.endereco)
  const enderecoAfter = extractEnderecoValue(after, 'endereco') || normalizeString(after.endereco)
  if (enderecoBefore !== enderecoAfter) {
    changes.endereco = { before: enderecoBefore, after: enderecoAfter }
  }
  
  // Número
  const numeroBefore = normalizeString(before.numero)
  const numeroAfter = extractEnderecoValue(after, 'numero')
  if (numeroBefore !== numeroAfter) {
    changes.numero = { before: numeroBefore, after: numeroAfter }
  }
  
  // Complemento
  const complementoBefore = normalizeString(before.complemento)
  const complementoAfter = extractEnderecoValue(after, 'complemento')
  if (complementoBefore !== complementoAfter) {
    changes.complemento = { before: complementoBefore, after: complementoAfter }
  }
  
  // Bairro
  const bairroBefore = normalizeString(before.bairro)
  const bairroAfter = extractEnderecoValue(after, 'bairro')
  if (bairroBefore !== bairroAfter) {
    changes.bairro = { before: bairroBefore, after: bairroAfter }
  }
  
  // Cidade
  const cidadeBefore = normalizeString(before.cidade)
  const cidadeAfter = extractEnderecoValue(after, 'cidade')
  if (cidadeBefore !== cidadeAfter) {
    changes.cidade = { before: cidadeBefore, after: cidadeAfter }
  }
  
  // Estado
  const estadoBefore = normalizeString(before.estado)
  const estadoAfter = extractEnderecoValue(after, 'estado')
  if (estadoBefore !== estadoAfter) {
    changes.estado = { before: estadoBefore, after: estadoAfter }
  }
  
  // CEP
  const cepBefore = normalizeString(before.cep)
  const cepAfter = extractEnderecoValue(after, 'cep')
  if (cepBefore !== cepAfter) {
    changes.cep = { before: cepBefore, after: cepAfter }
  }
  
  // Latitude
  const latitudeBefore = normalizeNumber(before.latitude)
  const latitudeAfter = normalizeNumber(after.latitude)
  if (latitudeBefore !== latitudeAfter) {
    changes.latitude = { before: latitudeBefore, after: latitudeAfter }
  }
  
  // Longitude
  const longitudeBefore = normalizeNumber(before.longitude)
  const longitudeAfter = normalizeNumber(after.longitude)
  if (longitudeBefore !== longitudeAfter) {
    changes.longitude = { before: longitudeBefore, after: longitudeAfter }
  }
  
  // ============================================
  // PREÇOS
  // ============================================
  
  // Preço
  const precoBefore = normalizeNumber(before.preco)
  const precoAfter = normalizeNumber(after.preco)
  if (precoBefore !== precoAfter) {
    changes.preco = { before: precoBefore, after: precoAfter }
  }
  
  // Preço Condomínio (pode vir com nomes diferentes)
  const precoCondominioBefore = normalizeNumber(before.preco_condominio)
  const precoCondominioAfter = normalizeNumber(
    after.precoCondominio || after.preco_condominio
  )
  if (precoCondominioBefore !== precoCondominioAfter) {
    changes.preco_condominio = { before: precoCondominioBefore, after: precoCondominioAfter }
  }
  
  // Preço IPTU
  const precoIPTUBefore = normalizeNumber(before.preco_iptu)
  const precoIPTUAfter = normalizeNumber(
    after.precoIPTU || after.preco_iptu
  )
  if (precoIPTUBefore !== precoIPTUAfter) {
    changes.preco_iptu = { before: precoIPTUBefore, after: precoIPTUAfter }
  }
  
  // Taxa Extra
  const taxaExtraBefore = normalizeNumber(before.taxa_extra)
  const taxaExtraAfter = normalizeNumber(
    after.taxaExtra || after.taxa_extra
  )
  if (taxaExtraBefore !== taxaExtraAfter) {
    changes.taxa_extra = { before: taxaExtraBefore, after: taxaExtraAfter }
  }
  
  // ============================================
  // CARACTERÍSTICAS FÍSICAS
  // ============================================
  
  // Área Total
  const areaTotalBefore = normalizeNumber(before.area_total)
  const areaTotalAfter = normalizeNumber(
    after.areaTotal || after.area_total
  )
  if (areaTotalBefore !== areaTotalAfter) {
    changes.area_total = { before: areaTotalBefore, after: areaTotalAfter }
  }
  
  // Área Construída
  const areaConstruidaBefore = normalizeNumber(before.area_construida)
  const areaConstruidaAfter = normalizeNumber(
    after.areaConstruida || after.area_construida
  )
  if (areaConstruidaBefore !== areaConstruidaAfter) {
    changes.area_construida = { before: areaConstruidaBefore, after: areaConstruidaAfter }
  }
  
  // Quartos
  const quartosBefore = normalizeNumber(before.quartos)
  const quartosAfter = normalizeNumber(after.quartos)
  if (quartosBefore !== quartosAfter) {
    changes.quartos = { before: quartosBefore, after: quartosAfter }
  }
  
  // Banheiros
  const banheirosBefore = normalizeNumber(before.banheiros)
  const banheirosAfter = normalizeNumber(after.banheiros)
  if (banheirosBefore !== banheirosAfter) {
    changes.banheiros = { before: banheirosBefore, after: banheirosAfter }
  }
  
  // Suites
  const suitesBefore = normalizeNumber(before.suites)
  const suitesAfter = normalizeNumber(after.suites)
  if (suitesBefore !== suitesAfter) {
    changes.suites = { before: suitesBefore, after: suitesAfter }
  }
  
  // Vagas Garagem
  const vagasGaragemBefore = normalizeNumber(before.vagas_garagem)
  const vagasGaragemAfter = normalizeNumber(
    after.vagasGaragem || after.vagas_garagem
  )
  if (vagasGaragemBefore !== vagasGaragemAfter) {
    changes.vagas_garagem = { before: vagasGaragemBefore, after: vagasGaragemAfter }
  }
  
  // Andar
  const andarBefore = normalizeNumber(before.andar)
  const andarAfter = normalizeNumber(after.andar)
  if (andarBefore !== andarAfter) {
    changes.andar = { before: andarBefore, after: andarAfter }
  }
  
  // Total Andares
  const totalAndaresBefore = normalizeNumber(before.total_andares)
  const totalAndaresAfter = normalizeNumber(
    after.totalAndares || after.total_andares
  )
  if (totalAndaresBefore !== totalAndaresAfter) {
    changes.total_andares = { before: totalAndaresBefore, after: totalAndaresAfter }
  }
  
  // ============================================
  // BOOLEANOS
  // ============================================
  
  // Mobiliado
  const mobiliadoBefore = normalizeBoolean(before.mobiliado)
  const mobiliadoAfter = normalizeBoolean(
    after.mobiliado
  )
  if (mobiliadoBefore !== mobiliadoAfter) {
    changes.mobiliado = { before: mobiliadoBefore, after: mobiliadoAfter }
  }
  
  // Aceita Permuta
  const aceitaPermutaBefore = normalizeBoolean(before.aceita_permuta)
  const aceitaPermutaAfter = normalizeBoolean(
    after.aceitaPermuta || after.aceita_permuta
  )
  if (aceitaPermutaBefore !== aceitaPermutaAfter) {
    changes.aceita_permuta = { before: aceitaPermutaBefore, after: aceitaPermutaAfter }
  }
  
  // Aceita Financiamento
  const aceitaFinanciamentoBefore = normalizeBoolean(before.aceita_financiamento)
  const aceitaFinanciamentoAfter = normalizeBoolean(
    after.aceitaFinanciamento || after.aceita_financiamento
  )
  if (aceitaFinanciamentoBefore !== aceitaFinanciamentoAfter) {
    changes.aceita_financiamento = { before: aceitaFinanciamentoBefore, after: aceitaFinanciamentoAfter }
  }
  
  // Destaque (já tem auditoria separada, mas incluímos aqui para completude)
  const destaqueBefore = normalizeBoolean(before.destaque)
  const destaqueAfter = normalizeBoolean(after.destaque)
  if (destaqueBefore !== destaqueAfter) {
    changes.destaque = { before: destaqueBefore, after: destaqueAfter }
  }
  
  // ============================================
  // RELACIONAMENTOS (FKs)
  // ============================================
  
  // Tipo FK
  const tipoFkBefore = normalizeNumber(before.tipo_fk)
  const tipoFkAfter = normalizeNumber(after.tipo_fk)
  if (tipoFkBefore !== tipoFkAfter) {
    changes.tipo_fk = { before: tipoFkBefore, after: tipoFkAfter }
  }
  
  // Finalidade FK
  const finalidadeFkBefore = normalizeNumber(before.finalidade_fk)
  const finalidadeFkAfter = normalizeNumber(after.finalidade_fk)
  if (finalidadeFkBefore !== finalidadeFkAfter) {
    changes.finalidade_fk = { before: finalidadeFkBefore, after: finalidadeFkAfter }
  }
  
  // Status FK (já tem auditoria separada, mas incluímos aqui)
  const statusFkBefore = normalizeNumber(before.status_fk)
  const statusFkAfter = normalizeNumber(after.status_fk)
  if (statusFkBefore !== statusFkAfter) {
    changes.status_fk = { before: statusFkBefore, after: statusFkAfter }
  }
  
  // Proprietário FK / UUID
  const proprietarioUuidBefore = before.proprietario_uuid ?? null
  const proprietarioUuidAfter = after.proprietario_uuid ?? null
  if (proprietarioUuidBefore !== proprietarioUuidAfter) {
    changes.proprietario_uuid = { before: proprietarioUuidBefore, after: proprietarioUuidAfter }
  }
  
  // ============================================
  // RELACIONAMENTOS COMPLEXOS (Arrays)
  // ============================================
  
  // Amenidades
  const amenidadesBefore = normalizeIdArray(before.amenidades || [])
  const amenidadesAfter = normalizeIdArray(after.amenidades || [])
  if (!arraysEqual(amenidadesBefore, amenidadesAfter)) {
    const added = amenidadesAfter.filter(id => !amenidadesBefore.includes(id))
    const removed = amenidadesBefore.filter(id => !amenidadesAfter.includes(id))
    
    changes.amenidades = {
      before: amenidadesBefore,
      after: amenidadesAfter,
      added: added.length > 0 ? added : undefined,
      removed: removed.length > 0 ? removed : undefined
    }
  }
  
  // Proximidades
  const proximidadesBefore = normalizeIdArray(before.proximidades || [])
  const proximidadesAfter = normalizeIdArray(after.proximidades || [])
  if (!arraysEqual(proximidadesBefore, proximidadesAfter)) {
    const added = proximidadesAfter.filter(id => !proximidadesBefore.includes(id))
    const removed = proximidadesBefore.filter(id => !proximidadesAfter.includes(id))
    
    changes.proximidades = {
      before: proximidadesBefore,
      after: proximidadesAfter,
      added: added.length > 0 ? added : undefined,
      removed: removed.length > 0 ? removed : undefined
    }
  }
  
  // Contagem de Imagens
  const imagensCountBefore = before.imagens_count || 0
  const imagensCountAfter = after.imagens_count || 0
  if (imagensCountBefore !== imagensCountAfter) {
    changes.imagens_count = {
      before: imagensCountBefore,
      after: imagensCountAfter,
      action: imagensCountAfter > imagensCountBefore ? 'added' : 'removed'
    }
  }
  
  // Contagem de Documentos
  const documentosCountBefore = before.documentos_count || 0
  const documentosCountAfter = after.documentos_count || 0
  if (documentosCountBefore !== documentosCountAfter) {
    changes.documentos_count = {
      before: documentosCountBefore,
      after: documentosCountAfter,
      action: documentosCountAfter > documentosCountBefore ? 'added' : 'removed'
    }
  }
  
  return changes
}

