import pool from './connection'
import { getDbCapabilities } from './schemaCapabilities'

export interface PublicImovelFilters {
  tipoIds?: number[]
  estado?: string
  cidade?: string
  bairro?: string
  precoMin?: number
  precoMax?: number
  quartosMin?: number
  quartosMax?: number
  banheirosMin?: number
  banheirosMax?: number
  suitesMin?: number
  suitesMax?: number
  vagasMin?: number
  vagasMax?: number
  areaMin?: number
  areaMax?: number
  operation?: 'DV' | 'DA' // Tipo de operação: Comprar (DV) ou Alugar (DA)
  page?: number
  limit?: number
}

export interface PublicImovel {
  id: number
  codigo: string
  titulo: string
  descricao: string | null
  preco: number | null
  bairro: string | null
  cidade_fk: string | null
  estado_fk: string | null
  quartos: number | null
  banheiros: number | null
  suites: number | null
  vagas_garagem: number | null
  area_total: number | null
  tipo_nome: string | null
  imagem_principal?: string | null
}

interface QueryResult {
  data: PublicImovel[]
  total: number
}

export async function listPublicImoveis(filters: PublicImovelFilters): Promise<QueryResult> {
  const caps = await getDbCapabilities()
  const tipoCol = caps.imoveis.tipo_fk ? 'tipo_fk' : caps.imoveis.tipo_id ? 'tipo_id' : 'tipo_fk'
  const statusCol = caps.imoveis.status_fk ? 'status_fk' : caps.imoveis.status_id ? 'status_id' : 'status_fk'
  const cidadeCol = caps.imoveis.cidade_fk ? 'cidade_fk' : caps.imoveis.cidade ? 'cidade' : 'cidade_fk'
  const estadoCol = caps.imoveis.estado_fk ? 'estado_fk' : caps.imoveis.estado ? 'estado' : 'estado_fk'
  const hasFinalidade = caps.imoveis.finalidade_fk
  const hasFinalidadeLandingFlags =
    caps.finalidades_imovel.vender_landpaging && caps.finalidades_imovel.alugar_landpaging
  const statusPublicClause = caps.status_imovel.consulta_imovel_internauta
    ? 'AND si.consulta_imovel_internauta = true'
    : ''

  const params: any[] = []
  let paramIndex = 1

  const where: string[] = [
    'i.ativo = true'
  ]

  if (filters.tipoIds && filters.tipoIds.length > 0) {
    console.log('🔍 [listPublicImoveis] Aplicando filtro de tipo:', {
      tipoIds: filters.tipoIds,
      tipoIdsType: typeof filters.tipoIds,
      tipoIdsIsArray: Array.isArray(filters.tipoIds),
      paramIndex,
      query: `i.tipo_fk = ANY($${paramIndex}::int[])`
    })
    // Usar ::int[] para garantir que o PostgreSQL reconheça como array de inteiros
    where.push(`i.${tipoCol} = ANY($${paramIndex}::int[])`)
    params.push(filters.tipoIds)
    paramIndex++
  } else {
    console.log('🔍 [listPublicImoveis] Nenhum filtro de tipo aplicado:', {
      tipoIds: filters.tipoIds,
      tipoIdsLength: filters.tipoIds?.length
    })
  }

  // FILTRO DE ESTADO
  // IMPORTANTE: Se há estado mas NÃO há cidade selecionada, busca TODOS os imóveis do estado
  // independentemente do conteúdo do campo cidade_fk na tabela imoveis
  if (filters.estado) {
    // estado_fk armazena sigla (ex: "RJ", "SP"), então usar comparação exata (case-insensitive)
    const estadoNormalizado = filters.estado.trim().toUpperCase()
    where.push(`UPPER(TRIM(i.${estadoCol})) = $${paramIndex}`)
    params.push(estadoNormalizado)
    paramIndex++
  }

  // FILTRO DE CIDADE (OPCIONAL)
  // IMPORTANTE: Este filtro só é aplicado se uma cidade específica for selecionada
  // Se não houver cidade selecionada (ou "Todas as cidades"), busca todos os imóveis do estado
  if (filters.cidade) {
    // cidade_fk armazena nome completo da cidade, usar ILIKE com % para busca parcial
    const cidadeNormalizada = filters.cidade.trim()
    where.push(`TRIM(i.${cidadeCol}) ILIKE $${paramIndex}`)
    params.push(`%${cidadeNormalizada}%`)
    paramIndex++
  }

  if (filters.bairro) {
    where.push(`i.bairro ILIKE $${paramIndex}`)
    params.push(`%${filters.bairro}%`)
    paramIndex++
  }

  if (filters.precoMin !== undefined) {
    where.push(`i.preco >= $${paramIndex}`)
    params.push(filters.precoMin)
    paramIndex++
  }

  if (filters.precoMax !== undefined) {
    where.push(`i.preco <= $${paramIndex}`)
    params.push(filters.precoMax)
    paramIndex++
  }

  if (filters.quartosMin !== undefined) {
    where.push(`i.quartos >= $${paramIndex}`)
    params.push(filters.quartosMin)
    paramIndex++
  }

  if (filters.quartosMax !== undefined) {
    where.push(`i.quartos <= $${paramIndex}`)
    params.push(filters.quartosMax)
    paramIndex++
  }

  if (filters.banheirosMin !== undefined) {
    where.push(`i.banheiros >= $${paramIndex}`)
    params.push(filters.banheirosMin)
    paramIndex++
  }

  if (filters.banheirosMax !== undefined) {
    where.push(`i.banheiros <= $${paramIndex}`)
    params.push(filters.banheirosMax)
    paramIndex++
  }

  if (filters.suitesMin !== undefined) {
    where.push(`i.suites >= $${paramIndex}`)
    params.push(filters.suitesMin)
    paramIndex++
  }

  if (filters.suitesMax !== undefined) {
    where.push(`i.suites <= $${paramIndex}`)
    params.push(filters.suitesMax)
    paramIndex++
  }

  if (filters.vagasMin !== undefined) {
    where.push(`i.vagas_garagem >= $${paramIndex}`)
    params.push(filters.vagasMin)
    paramIndex++
  }

  if (filters.vagasMax !== undefined) {
    where.push(`i.vagas_garagem <= $${paramIndex}`)
    params.push(filters.vagasMax)
    paramIndex++
  }

  if (filters.areaMin !== undefined) {
    where.push(`i.area_total >= $${paramIndex}`)
    params.push(filters.areaMin)
    paramIndex++
  }

  if (filters.areaMax !== undefined) {
    where.push(`i.area_total <= $${paramIndex}`)
    params.push(filters.areaMax)
    paramIndex++
  }

  const page = Math.max(1, filters.page || 1)
  const limit = Math.min(50, Math.max(1, filters.limit || 20))
  const offset = (page - 1) * limit

  // Adicionar JOIN com finalidades_imovel para filtrar por vender_landpaging ou alugar_landpaging
  // Usar INNER JOIN para garantir que apenas imóveis com finalidade válida sejam retornados
  let joinFinalidades = ''
  if (filters.operation && hasFinalidade && hasFinalidadeLandingFlags) {
    // INNER JOIN garante que apenas imóveis com finalidade válida sejam retornados
    joinFinalidades = 'INNER JOIN finalidades_imovel fi ON fi.id = i.finalidade_fk'
    
    // Adicionar filtro baseado no tipo de operação
    if (filters.operation === 'DV') {
      // Para "Comprar": filtrar por vender_landpaging = true
      where.push('fi.vender_landpaging = true')
    } else if (filters.operation === 'DA') {
      // Para "Alugar": filtrar por alugar_landpaging = true
      where.push('fi.alugar_landpaging = true')
    }
  }
  
  // Log para debug
  console.log('🔍 [listPublicImoveis] Filtros aplicados:', {
    operation: filters.operation,
    estado: filters.estado,
    cidade: filters.cidade,
    hasJoinFinalidades: !!joinFinalidades,
    whereClauses: where
  })

  const baseQuery = `
    FROM imoveis i
    LEFT JOIN tipos_imovel ti ON ti.id = i.${tipoCol}
    INNER JOIN status_imovel si ON i.${statusCol} = si.id
    ${joinFinalidades}
    WHERE ${where.join(' AND ')}
    AND si.ativo = true
    ${statusPublicClause}
  `

  const dataQuery = `
    SELECT
      i.id,
      i.codigo,
      i.titulo,
      i.descricao,
      i.preco,
      i.bairro,
      i.${cidadeCol} as cidade_fk,
      i.${estadoCol} as estado_fk,
      i.quartos,
      i.banheiros,
      i.suites,
      i.vagas_garagem,
      i.area_total,
      ti.nome AS tipo_nome
    ${baseQuery}
    ORDER BY i.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `

  const countQuery = `SELECT COUNT(*) ${baseQuery}`

  // Log da query SQL gerada para debug
  console.log('🔍 [listPublicImoveis] Query SQL gerada:', dataQuery)
  console.log('🔍 [listPublicImoveis] Parâmetros:', [...params, limit, offset])
  console.log('🔍 [listPublicImoveis] Count Query:', countQuery)
  console.log('🔍 [listPublicImoveis] Count Parâmetros:', params)

  const result = await pool.query(dataQuery, [...params, limit, offset])
  const countResult = await pool.query(countQuery, params)
  
  console.log('🔍 [listPublicImoveis] Resultado da query:', {
    total: countResult.rows[0]?.count,
    quantidade: result.rows.length,
    operation: filters.operation
  })

  const ids = result.rows.map(row => row.id)
  const imagens = await fetchImagensPrincipais(ids)

  const data = result.rows.map(row => ({
    ...row,
    imagem_principal: imagens[row.id] || null
  }))

  return {
    data,
    total: parseInt(countResult.rows[0]?.count ?? '0', 10)
  }
}

async function fetchImagensPrincipais(ids: number[]): Promise<Record<number, string>> {
  if (!ids.length) return {}

  const caps = await getDbCapabilities()
  const hasImagemBytea = caps.imovel_imagens.imagem && caps.imovel_imagens.tipo_mime
  const hasUrl = caps.imovel_imagens.url

  if (hasImagemBytea) {
    const query = `
      SELECT DISTINCT ON (imovel_id)
        imovel_id,
        encode(imagem, 'base64') as imagem_base64,
        tipo_mime
      FROM imovel_imagens
      WHERE imovel_id = ANY($1::int[])
        AND principal = true
      ORDER BY imovel_id, created_at DESC
    `
    const result = await pool.query(query, [ids])
    return result.rows.reduce<Record<number, string>>((acc, row) => {
      acc[row.imovel_id] = `data:${row.tipo_mime || 'image/jpeg'};base64,${row.imagem_base64}`
      return acc
    }, {})
  }

  if (hasUrl) {
    const query = `
      SELECT DISTINCT ON (imovel_id)
        imovel_id,
        url
      FROM imovel_imagens
      WHERE imovel_id = ANY($1::int[])
        AND principal = true
      ORDER BY imovel_id, created_at DESC
    `
    const result = await pool.query(query, [ids])
    return result.rows.reduce<Record<number, string>>((acc, row) => {
      acc[row.imovel_id] = row.url
      return acc
    }, {})
  }

  return {}
}

export interface PublicFiltersMetadata {
  tipos: Array<{ id: number; nome: string }>
  priceRange: { min: number; max: number }
  areaRange: { min: number; max: number }
  quartosRange: { min: number; max: number }
  banheirosRange: { min: number; max: number }
  suitesRange: { min: number; max: number }
  vagasRange: { min: number; max: number }
}

export async function getPublicFiltersMetadata(
  tipoDestaque?: 'DV' | 'DA',
  estado?: string,
  cidade?: string,
  tipoId?: number,
  filtrosAplicados?: {
    precoMin?: number
    precoMax?: number
    areaMin?: number
    areaMax?: number
    quartosMin?: number
    quartosMax?: number
    banheirosMin?: number
    banheirosMax?: number
    suitesMin?: number
    suitesMax?: number
    vagasMin?: number
    vagasMax?: number
    bairro?: string
  }
): Promise<PublicFiltersMetadata> {
  const caps = await getDbCapabilities()
  const tipoCol = caps.imoveis.tipo_fk ? 'tipo_fk' : caps.imoveis.tipo_id ? 'tipo_id' : 'tipo_fk'
  const statusCol = caps.imoveis.status_fk ? 'status_fk' : caps.imoveis.status_id ? 'status_id' : 'status_fk'
  const cidadeCol = caps.imoveis.cidade_fk ? 'cidade_fk' : caps.imoveis.cidade ? 'cidade' : 'cidade_fk'
  const estadoCol = caps.imoveis.estado_fk ? 'estado_fk' : caps.imoveis.estado ? 'estado' : 'estado_fk'
  const hasFinalidade = caps.imoveis.finalidade_fk
  const hasFinalidadeLandingFlags =
    caps.finalidades_imovel.vender_landpaging && caps.finalidades_imovel.alugar_landpaging
  const statusPublicClause = caps.status_imovel.consulta_imovel_internauta
    ? 'AND si.consulta_imovel_internauta = true'
    : ''

  // Construir query de stats com filtros opcionais
  let joinClause = ''
  const whereClauses: string[] = ['i.ativo = true']
  const statsParams: any[] = []
  let paramIndex = 1
  
  // Filtrar por tipo_destaque (DV = Comprar, DA = Alugar) usando finalidades_imovel
  if (tipoDestaque && hasFinalidade && hasFinalidadeLandingFlags) {
    joinClause = 'INNER JOIN finalidades_imovel fi ON fi.id = i.finalidade_fk'
    if (tipoDestaque === 'DV') {
      whereClauses.push('fi.vender_landpaging = true')
    } else {
      whereClauses.push('fi.alugar_landpaging = true')
    }
  }
  
  if (tipoId) {
    whereClauses.push(`i.${tipoCol} = $${paramIndex}`)
    statsParams.push(tipoId)
    paramIndex++
  }
  
  if (estado) {
    whereClauses.push(`i.${estadoCol} = $${paramIndex}`)
    statsParams.push(estado)
    paramIndex++
  }
  
  if (cidade) {
    whereClauses.push(`i.${cidadeCol} ILIKE $${paramIndex}`)
    statsParams.push(`%${cidade}%`)
    paramIndex++
  }
  
  // Adicionar filtros aplicados para recalcular metadados baseados nos imóveis filtrados
  if (filtrosAplicados) {
    if (filtrosAplicados.precoMin !== undefined) {
      whereClauses.push(`i.preco >= $${paramIndex}`)
      statsParams.push(filtrosAplicados.precoMin)
      paramIndex++
    }
    if (filtrosAplicados.precoMax !== undefined) {
      whereClauses.push(`i.preco <= $${paramIndex}`)
      statsParams.push(filtrosAplicados.precoMax)
      paramIndex++
    }
    if (filtrosAplicados.areaMin !== undefined) {
      whereClauses.push(`i.area_total >= $${paramIndex}`)
      statsParams.push(filtrosAplicados.areaMin)
      paramIndex++
    }
    if (filtrosAplicados.areaMax !== undefined) {
      whereClauses.push(`i.area_total <= $${paramIndex}`)
      statsParams.push(filtrosAplicados.areaMax)
      paramIndex++
    }
    if (filtrosAplicados.quartosMin !== undefined) {
      whereClauses.push(`i.quartos >= $${paramIndex}`)
      statsParams.push(filtrosAplicados.quartosMin)
      paramIndex++
    }
    if (filtrosAplicados.quartosMax !== undefined) {
      whereClauses.push(`i.quartos <= $${paramIndex}`)
      statsParams.push(filtrosAplicados.quartosMax)
      paramIndex++
    }
    if (filtrosAplicados.banheirosMin !== undefined) {
      whereClauses.push(`i.banheiros >= $${paramIndex}`)
      statsParams.push(filtrosAplicados.banheirosMin)
      paramIndex++
    }
    if (filtrosAplicados.banheirosMax !== undefined) {
      whereClauses.push(`i.banheiros <= $${paramIndex}`)
      statsParams.push(filtrosAplicados.banheirosMax)
      paramIndex++
    }
    if (filtrosAplicados.suitesMin !== undefined) {
      whereClauses.push(`i.suites >= $${paramIndex}`)
      statsParams.push(filtrosAplicados.suitesMin)
      paramIndex++
    }
    if (filtrosAplicados.suitesMax !== undefined) {
      whereClauses.push(`i.suites <= $${paramIndex}`)
      statsParams.push(filtrosAplicados.suitesMax)
      paramIndex++
    }
    if (filtrosAplicados.vagasMin !== undefined) {
      whereClauses.push(`i.vagas_garagem >= $${paramIndex}`)
      statsParams.push(filtrosAplicados.vagasMin)
      paramIndex++
    }
    if (filtrosAplicados.vagasMax !== undefined) {
      whereClauses.push(`i.vagas_garagem <= $${paramIndex}`)
      statsParams.push(filtrosAplicados.vagasMax)
      paramIndex++
    }
    if (filtrosAplicados.bairro) {
      whereClauses.push(`i.bairro ILIKE $${paramIndex}`)
      statsParams.push(`%${filtrosAplicados.bairro}%`)
      paramIndex++
    }
  }
  
  const statsQuery = `
    SELECT
      COALESCE(MIN(i.preco), 0) AS min_preco,
      COALESCE(MAX(i.preco), 0) AS max_preco,
      COALESCE(MIN(i.area_total), 0) AS min_area,
      COALESCE(MAX(i.area_total), 0) AS max_area,
      COALESCE(MIN(i.quartos), 0) AS min_quartos,
      COALESCE(MAX(i.quartos), 0) AS max_quartos,
      COALESCE(MIN(i.banheiros), 0) AS min_banheiros,
      COALESCE(MAX(i.banheiros), 0) AS max_banheiros,
      COALESCE(MIN(i.suites), 0) AS min_suites,
      COALESCE(MAX(i.suites), 0) AS max_suites,
      COALESCE(MIN(i.vagas_garagem), 0) AS min_vagas,
      COALESCE(MAX(i.vagas_garagem), 0) AS max_vagas
    FROM imoveis i
    INNER JOIN status_imovel si ON i.${statusCol} = si.id
    ${joinClause}
    WHERE ${whereClauses.join(' AND ')}
      AND si.ativo = true
      ${statusPublicClause}
  `

  const [
    tiposResult,
    statsResult
  ] = await Promise.all([
    pool.query(`
      SELECT id, nome
      FROM tipos_imovel
      WHERE ativo = true
      ORDER BY nome
    `),
    pool.query(statsQuery, statsParams)
  ])

  const stats = statsResult.rows[0] || {}
  const minPreco = Number(stats.min_preco) || 0
  const maxPrecoRaw = Number(stats.max_preco) || 0
  
  // Quando há apenas 1 imóvel, min e max devem ser iguais
  // Quando há múltiplos imóveis, garantir diferença mínima apenas se necessário
  const maxPreco = minPreco === maxPrecoRaw
    ? maxPrecoRaw // Manter iguais quando há apenas 1 imóvel
    : Math.max(maxPrecoRaw, minPreco + 1000) // Garantir diferença mínima para múltiplos imóveis
  
  const minArea = Number(stats.min_area) || 0
  const maxAreaRaw = Number(stats.max_area) || 0
  
  // Quando há apenas 1 imóvel, min e max devem ser iguais
  const maxArea = minArea === maxAreaRaw
    ? maxAreaRaw // Manter iguais quando há apenas 1 imóvel
    : Math.max(maxAreaRaw, minArea + 10) // Garantir diferença mínima para múltiplos imóveis

  const minQuartos = Number(stats.min_quartos) || 0
  const maxQuartos = Number(stats.max_quartos) || 0
  const minBanheiros = Number(stats.min_banheiros) || 0
  const maxBanheiros = Number(stats.max_banheiros) || 0
  const minSuites = Number(stats.min_suites) || 0
  const maxSuites = Number(stats.max_suites) || 0
  const minVagas = Number(stats.min_vagas) || 0
  const maxVagas = Number(stats.max_vagas) || 0

  // Verificar se há apenas 1 imóvel (quando min = max para preço e área)
  const isSingleImovel = minPreco === maxPrecoRaw && minArea === maxAreaRaw

  return {
    tipos: tiposResult.rows,
    priceRange: {
      min: minPreco,
      max: maxPreco
    },
    areaRange: {
      min: minArea,
      max: maxArea
    },
    quartosRange: {
      min: isSingleImovel ? maxQuartos : minQuartos,
      max: maxQuartos
    },
    banheirosRange: {
      min: isSingleImovel ? maxBanheiros : minBanheiros,
      max: maxBanheiros
    },
    suitesRange: {
      min: isSingleImovel ? maxSuites : minSuites,
      max: maxSuites
    },
    vagasRange: {
      min: isSingleImovel ? maxVagas : minVagas,
      max: maxVagas
    }
  }
}

