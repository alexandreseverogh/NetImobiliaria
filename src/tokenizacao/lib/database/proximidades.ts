/* eslint-disable */
/**
 * FunÃ§Ãµes de banco de dados para Proximidades
 * Net ImobiliÃ¡ria - Sistema de GestÃ£o de Proximidades
 */

import pool from './connection'
import { QueryResult } from 'pg'

// ========================================
// INTERFACES E TIPOS
// ========================================

export interface CategoriaProximidade {
  id: number
  nome: string
  descricao?: string
  icone?: string
  cor: string
  ordem: number
  ativo: boolean
  created_at: string
  updated_at: string
}

export interface Proximidade {
  id: number
  categoria_id?: number
  nome: string
  descricao?: string
  icone?: string
  popular: boolean
  ordem: number
  ativo: boolean
  created_at: string
  updated_at: string
  // Dados da categoria (quando usado em JOIN)
  categoria_nome?: string
  categoria_icone?: string
  categoria_cor?: string
}

export interface ImovelProximidade {
  id: number
  imovel_id: number
  proximidade_id: number
  distancia_metros?: number
  tempo_caminhada?: number
  observacoes?: string
  created_at: string
  // Dados da proximidade (quando usado em JOIN)
  proximidade_nome?: string
  proximidade_icone?: string
  categoria_nome?: string
  categoria_id?: number
  categoria_ordem?: number
  proximidade_ordem?: number
}

// ========================================
// FUNÃ‡Ã•ES PARA CATEGORIAS DE PROXIMIDADES
// ========================================

/**
 * Buscar todas as categorias de proximidades (ativas e inativas para seleÃ§Ã£o)
 */
export async function findAllCategoriasProximidades(): Promise<CategoriaProximidade[]> {
  try {
    const query = `
      SELECT id, nome, descricao, icone, cor, ordem, ativo, created_at, updated_at
      FROM categorias_proximidades
      ORDER BY ordem, nome
    `
    const result: QueryResult<CategoriaProximidade> = await pool.query(query)
    return result.rows
  } catch (error) {
    console.error('âŒ Erro ao buscar categorias de proximidades:', error)
    throw new Error('Erro ao buscar categorias de proximidades')
  }
}

/**
 * Buscar apenas categorias de proximidades ativas (para exibiÃ§Ã£o nas listagens)
 */
export async function findAllCategoriasProximidadesAtivas(): Promise<CategoriaProximidade[]> {
  try {
    const query = `
      SELECT id, nome, descricao, icone, cor, ordem, ativo, created_at, updated_at
      FROM categorias_proximidades
      WHERE ativo = true
      ORDER BY ordem, nome
    `
    const result: QueryResult<CategoriaProximidade> = await pool.query(query)
    return result.rows
  } catch (error) {
    console.error('âŒ Erro ao buscar categorias de proximidades ativas:', error)
    throw new Error('Erro ao buscar categorias de proximidades ativas')
  }
}

/**
 * Buscar categoria de proximidade por ID (todas as categorias)
 */
export async function findCategoriaProximidadeById(id: number): Promise<CategoriaProximidade | null> {
  try {
    const query = `
      SELECT id, nome, descricao, icone, cor, ordem, ativo, created_at, updated_at
      FROM categorias_proximidades
      WHERE id = $1
    `
    const result: QueryResult<CategoriaProximidade> = await pool.query(query, [id])
    return result.rows[0] || null
  } catch (error) {
    console.error('âŒ Erro ao buscar categoria de proximidade:', error)
    throw new Error('Erro ao buscar categoria de proximidade')
  }
}

/**
 * Criar nova categoria de proximidade
 */
export async function createCategoriaProximidade(data: Omit<CategoriaProximidade, 'id' | 'created_at' | 'updated_at'>): Promise<CategoriaProximidade> {
  try {
    const query = `
      INSERT INTO categorias_proximidades (nome, descricao, icone, cor, ordem, ativo, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING id, nome, descricao, icone, cor, ordem, ativo, created_at, updated_at
    `
    const values = [data.nome, data.descricao, data.icone, data.cor, data.ordem, data.ativo]
    const result: QueryResult<CategoriaProximidade> = await pool.query(query, values)
    
    if (!result.rows[0]) {
      throw new Error('Erro ao criar categoria de proximidade')
    }
    
    return result.rows[0]
  } catch (error) {
    console.error('âŒ Erro ao criar categoria de proximidade:', error)
    throw new Error('Erro ao criar categoria de proximidade')
  }
}

/**
 * Atualizar categoria de proximidade
 */
export async function updateCategoriaProximidade(id: number, data: Partial<Omit<CategoriaProximidade, 'id' | 'created_at' | 'updated_at'>>): Promise<CategoriaProximidade> {
  try {
    const fields = []
    const values = []
    let paramIndex = 1

    if (data.nome !== undefined) {
      fields.push(`nome = $${paramIndex++}`)
      values.push(data.nome)
    }
    if (data.descricao !== undefined) {
      fields.push(`descricao = $${paramIndex++}`)
      values.push(data.descricao)
    }
    if (data.icone !== undefined) {
      fields.push(`icone = $${paramIndex++}`)
      values.push(data.icone)
    }
    if (data.cor !== undefined) {
      fields.push(`cor = $${paramIndex++}`)
      values.push(data.cor)
    }
    if (data.ordem !== undefined) {
      fields.push(`ordem = $${paramIndex++}`)
      values.push(data.ordem)
    }
    if (data.ativo !== undefined) {
      fields.push(`ativo = $${paramIndex++}`)
      values.push(data.ativo)
    }

    if (fields.length === 0) {
      throw new Error('Nenhum campo para atualizar')
    }

    fields.push(`updated_at = NOW()`)
    values.push(id)

    const query = `
      UPDATE categorias_proximidades 
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, nome, descricao, icone, cor, ordem, ativo, created_at, updated_at
    `

    const result: QueryResult<CategoriaProximidade> = await pool.query(query, values)
    
    if (!result.rows[0]) {
      throw new Error('Categoria nÃ£o encontrada')
    }
    
    return result.rows[0]
  } catch (error) {
    console.error('âŒ Erro ao atualizar categoria de proximidade:', error)
    throw new Error('Erro ao atualizar categoria de proximidade')
  }
}

/**
 * Excluir categoria de proximidade (exclusÃ£o fÃ­sica)
 */
export async function deleteCategoriaProximidade(id: number): Promise<void> {
  try {
    // Primeiro verificar se existem proximidades usando esta categoria
    const checkQuery = `
      SELECT COUNT(*) FROM proximidades WHERE categoria_id = $1
    `
    const checkResult = await pool.query(checkQuery, [id])
    const proximidadesCount = parseInt(checkResult.rows[0].count)
    
    if (proximidadesCount > 0) {
      throw new Error(`NÃ£o Ã© possÃ­vel excluir esta categoria. Existem ${proximidadesCount} proximidade(s) associada(s).`)
    }
    
    // Fazer exclusÃ£o fÃ­sica
    const query = `
      DELETE FROM categorias_proximidades 
      WHERE id = $1
    `
    
    const result = await pool.query(query, [id])
    
    if (result.rowCount === 0) {
      throw new Error('Categoria nÃ£o encontrada')
    }
    
    console.log(`âœ… Categoria de proximidade com ID ${id} excluÃ­da fisicamente`)
  } catch (error) {
    console.error('âŒ Erro ao excluir categoria de proximidade:', error)
    // Re-lanÃ§ar o erro original para preservar a mensagem especÃ­fica
    throw error
  }
}

// ========================================
// FUNÃ‡Ã•ES PARA PROXIMIDADES
// ========================================

/**
 * Buscar todas as proximidades com suas categorias (ativas e inativas)
 */
export async function findAllProximidades(): Promise<Proximidade[]> {
  try {
    // Mostrar apenas proximidades com categorias ATIVAS
    const query = `
      SELECT 
        p.id,
        p.nome,
        p.descricao,
        p.icone,
        p.popular,
        p.ordem,
        p.ativo,
        p.slug,
        p.created_at,
        p.updated_at,
        p.categoria_id,
        cp.nome as categoria_nome,
        cp.icone as categoria_icone,
        cp.cor as categoria_cor
      FROM proximidades p
      INNER JOIN categorias_proximidades cp ON p.categoria_id = cp.id
      WHERE cp.ativo = true
      ORDER BY cp.ordem, p.ordem, p.nome
    `
    const result: QueryResult<Proximidade> = await pool.query(query)
    
    // Mapear dinamicamente ativo para status em todas as proximidades
    return result.rows.map(proximidade => ({
      ...proximidade,
      status: proximidade.ativo ? 'Ativo' : 'Inativo'
    }))
  } catch (error) {
    console.error('âŒ Erro ao buscar proximidades:', error)
    throw new Error('Erro ao buscar proximidades')
  }
}

/**
 * Buscar proximidades com paginaÃ§Ã£o
 */
export async function findProximidadesPaginated(page: number = 1, limit: number = 10, categoria: string = '', search: string = ''): Promise<{
  proximidades: Proximidade[]
  total: number
  totalPages: number
  currentPage: number
  hasNext: boolean
  hasPrev: boolean
}> {
  try {
    const offset = (page - 1) * limit
    
    // Query para buscar com filtro de categoria e busca
    let whereClause = 'WHERE cp.ativo = true'
    let queryParams: any[] = []
    
    if (categoria.trim()) {
      whereClause += ' AND cp.nome = $1'
      queryParams.push(categoria.trim())
    }
    
    if (search.trim()) {
      const searchParam = queryParams.length + 1
      whereClause += ` AND (p.nome ILIKE $${searchParam} OR p.descricao ILIKE $${searchParam})`
      queryParams.push(`%${search.trim()}%`)
    }
    
    // Query para contar total de proximidades
    const countQuery = `
      SELECT COUNT(*) as total
      FROM proximidades p
      INNER JOIN categorias_proximidades cp ON p.categoria_id = cp.id
      ${whereClause}
    `
    
    // Query para buscar proximidades com paginaÃ§Ã£o
    const dataQuery = `
      SELECT 
        p.id,
        p.nome,
        p.descricao,
        p.icone,
        p.popular,
        p.ordem,
        p.ativo,
        p.slug,
        p.created_at,
        p.updated_at,
        p.categoria_id,
        cp.nome as categoria_nome,
        cp.icone as categoria_icone,
        cp.cor as categoria_cor
      FROM proximidades p
      INNER JOIN categorias_proximidades cp ON p.categoria_id = cp.id
      ${whereClause}
      ORDER BY cp.ordem, p.ordem, p.nome
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `
    
    // Executar ambas as queries em paralelo
    const [countResult, dataResult] = await Promise.all([
      pool.query(countQuery, queryParams),
      pool.query(dataQuery, [...queryParams, limit, offset])
    ])
    
    const total = parseInt(countResult.rows[0].total)
    const totalPages = Math.ceil(total / limit)
    const hasNext = page < totalPages
    const hasPrev = page > 1
    
    // Mapear dinamicamente ativo para status em todas as proximidades
    const proximidades = dataResult.rows.map(proximidade => ({
      ...proximidade,
      status: proximidade.ativo ? 'Ativo' : 'Inativo'
    }))
    
    return {
      proximidades,
      total,
      totalPages,
      currentPage: page,
      hasNext,
      hasPrev
    }
  } catch (error) {
    console.error('âŒ Erro ao buscar proximidades com paginaÃ§Ã£o:', error)
    throw new Error('Erro ao buscar proximidades com paginaÃ§Ã£o')
  }
}

/**
 * Buscar proximidades por categoria
 */
export async function findProximidadesByCategoria(categoriaId: number): Promise<Proximidade[]> {
  try {
    const query = `
      SELECT 
        p.*,
        cp.nome as categoria_nome,
        cp.icone as categoria_icone,
        cp.cor as categoria_cor
      FROM proximidades p
      LEFT JOIN categorias_proximidades cp ON p.categoria_id = cp.id
      WHERE p.categoria_id = $1
      ORDER BY p.ordem, p.nome
    `
    const result: QueryResult<Proximidade> = await pool.query(query, [categoriaId])
    
    // Mapear dinamicamente ativo para status
    return result.rows.map(proximidade => ({
      ...proximidade,
      status: proximidade.ativo ? 'Ativo' : 'Inativo'
    }))
  } catch (error) {
    console.error('âŒ Erro ao buscar proximidades por categoria:', error)
    throw new Error('Erro ao buscar proximidades por categoria')
  }
}

/**
 * Buscar proximidades populares
 */
export async function findProximidadesPopulares(): Promise<Proximidade[]> {
  try {
    const query = `
      SELECT 
        p.*,
        cp.nome as categoria_nome,
        cp.icone as categoria_icone,
        cp.cor as categoria_cor
      FROM proximidades p
      LEFT JOIN categorias_proximidades cp ON p.categoria_id = cp.id
      WHERE p.popular = true
      ORDER BY p.categoria_id, p.ordem, p.nome
    `
    const result: QueryResult<Proximidade> = await pool.query(query)
    
    // Mapear dinamicamente ativo para status
    return result.rows.map(proximidade => ({
      ...proximidade,
      status: proximidade.ativo ? 'Ativo' : 'Inativo'
    }))
  } catch (error) {
    console.error('âŒ Erro ao buscar proximidades populares:', error)
    throw new Error('Erro ao buscar proximidades populares')
  }
}

/**
 * Buscar proximidade por ID
 */
export async function findProximidadeById(id: number): Promise<Proximidade | null> {
  try {
    const query = `
      SELECT 
        p.*,
        cp.nome as categoria_nome,
        cp.icone as categoria_icone,
        cp.cor as categoria_cor
      FROM proximidades p
      LEFT JOIN categorias_proximidades cp ON p.categoria_id = cp.id
      WHERE p.id = $1
      LIMIT 1
    `
    const result = await pool.query(query, [id])
    
    if (result.rows[0]) {
      // Mapear dinamicamente ativo para status
      const proximidade = result.rows[0]
      proximidade.status = proximidade.ativo ? 'Ativo' : 'Inativo'
      return proximidade
    }
    
    return null
  } catch (error) {
    console.error('âŒ Erro ao buscar proximidade:', error)
    throw new Error('Erro ao buscar proximidade')
  }
}

/**
 * Buscar proximidade por slug (para ediÃ§Ã£o - retorna todas)
 */
export async function findProximidadeBySlug(slug: string): Promise<Proximidade | null> {
  try {
    const query = `
      SELECT 
        p.*,
        cp.nome as categoria_nome,
        cp.icone as categoria_icone,
        cp.cor as categoria_cor
      FROM proximidades p
      LEFT JOIN categorias_proximidades cp ON p.categoria_id = cp.id
      WHERE p.slug = $1
      LIMIT 1
    `
    const result = await pool.query(query, [slug])
    
    if (result.rows[0]) {
      // Mapear dinamicamente ativo para status
      const proximidade = result.rows[0]
      proximidade.status = proximidade.ativo ? 'Ativo' : 'Inativo'
      return proximidade
    }
    
    return null
  } catch (error) {
    console.error('âŒ Erro ao buscar proximidade por slug:', error)
    throw new Error('Erro ao buscar proximidade por slug')
  }
}

/**
 * Buscar proximidade ativa por slug (para listagem - apenas ativas)
 */
export async function findProximidadeAtivaBySlug(slug: string): Promise<Proximidade | null> {
  try {
    const query = `
      SELECT 
        p.*,
        cp.nome as categoria_nome,
        cp.icone as categoria_icone,
        cp.cor as categoria_cor
      FROM proximidades p
      LEFT JOIN categorias_proximidades cp ON p.categoria_id = cp.id
      WHERE p.slug = $1 AND p.ativo = true
      LIMIT 1
    `
    const result = await pool.query(query, [slug])
    return result.rows[0] || null
  } catch (error) {
    console.error('âŒ Erro ao buscar proximidade ativa por slug:', error)
    throw new Error('Erro ao buscar proximidade ativa por slug')
  }
}

/**
 * Atualizar proximidade por slug
 */
export async function updateProximidadeBySlug(slug: string, data: Partial<Omit<Proximidade, 'id' | 'created_at' | 'updated_at'>>): Promise<Proximidade> {
  const client = await pool.connect()
  
  try {
    // Primeiro, buscar a proximidade pelo slug para obter o ID
    const proximidade = await findProximidadeBySlug(slug)
    if (!proximidade) {
      throw new Error('Proximidade nÃ£o encontrada')
    }

    // Gerar novo slug se o nome foi alterado
    let newSlug = slug
    if (data.nome && data.nome !== proximidade.nome) {
      newSlug = data.nome.toLowerCase()
        .replace(/[Ã¡Ã Ã¢Ã£Ã¤]/g, 'a')
        .replace(/[Ã©Ã¨ÃªÃ«]/g, 'e')
        .replace(/[Ã­Ã¬Ã®Ã¯]/g, 'i')
        .replace(/[Ã³Ã²Ã´ÃµÃ¶]/g, 'o')
        .replace(/[ÃºÃ¹Ã»Ã¼]/g, 'u')
        .replace(/[Ã§]/g, 'c')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()
        + '-' + proximidade.id
    }

    const query = `
      UPDATE proximidades 
      SET 
        nome = COALESCE($1, nome),
        categoria_id = COALESCE($2, categoria_id),
        descricao = COALESCE($3, descricao),
        ativo = COALESCE($4, ativo),
        slug = $5,
        updated_at = NOW()
      WHERE id = $6
      RETURNING *
    `
    
    const result = await client.query(query, [
      data.nome,
      data.categoria_id,
      data.descricao,
      data.ativo,
      newSlug,
      proximidade.id
    ])
    
    if (result.rows.length === 0) {
      throw new Error('Erro ao atualizar proximidade')
    }
    
    // Retornar a proximidade atualizada com dados completos
    return await findProximidadeBySlug(newSlug) as Proximidade
  } catch (error) {
    console.error('âŒ Erro ao atualizar proximidade por slug:', error)
    throw new Error('Erro ao atualizar proximidade por slug')
  } finally {
    client.release()
  }
}

/**
 * Criar nova proximidade
 */
export async function createProximidade(data: Omit<Proximidade, 'id' | 'created_at' | 'updated_at' | 'slug'>): Promise<Proximidade> {
  try {
    // Gerar slug baseado no nome
    const slug = data.nome.toLowerCase()
      .replace(/[Ã¡Ã Ã¢Ã£Ã¤]/g, 'a')
      .replace(/[Ã©Ã¨ÃªÃ«]/g, 'e')
      .replace(/[Ã­Ã¬Ã®Ã¯]/g, 'i')
      .replace(/[Ã³Ã²Ã´ÃµÃ¶]/g, 'o')
      .replace(/[ÃºÃ¹Ã»Ã¼]/g, 'u')
      .replace(/[Ã§]/g, 'c')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()

    const query = `
      INSERT INTO proximidades (nome, descricao, categoria_id, ativo, slug, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING id, nome, descricao, categoria_id, ativo, slug, created_at, updated_at
    `
    
    const values = [data.nome, data.descricao, data.categoria_id, data.ativo, slug]
    const result: QueryResult<Proximidade> = await pool.query(query, values)
    
    if (!result.rows[0]) {
      throw new Error('Erro ao criar proximidade')
    }
    
    // Retornar a proximidade criada com dados completos
    return await findProximidadeBySlug(slug) as Proximidade
  } catch (error) {
    console.error('âŒ Erro ao criar proximidade:', error)
    throw new Error('Erro ao criar proximidade')
  }
}

/**
 * Excluir proximidade por slug (exclusÃ£o fÃ­sica)
 */
export async function deleteProximidadeBySlug(slug: string): Promise<void> {
  console.log(`ðŸš¨ INICIANDO deleteProximidadeBySlug com slug: "${slug}"`)
  
  const client = await pool.connect()
  
  try {
    console.log(`ðŸ” Tentando excluir proximidade com slug: "${slug}"`)
    
    // Verificar se o slug Ã© apenas um nÃºmero (ID)
    let proximidade
    if (/^\d+$/.test(slug)) {
      console.log(`ðŸ” Slug Ã© um ID numÃ©rico: "${slug}"`)
      // Buscar por ID
      proximidade = await findProximidadeById(parseInt(slug))
    } else {
      console.log(`ðŸ” Slug Ã© um texto: "${slug}"`)
      // Buscar por slug
      proximidade = await findProximidadeBySlug(slug)
    }
    
    console.log(`ðŸ” Proximidade encontrada:`, proximidade ? `ID ${proximidade.id}` : 'NÃƒO ENCONTRADA')
    
    if (!proximidade) {
      console.log(`âŒ Proximidade com slug "${slug}" nÃ£o encontrada`)
      
      // Listar todas as proximidades disponÃ­veis para debug
      try {
        const todasProximidades = await listAllProximidadesWithSlugs()
        console.log(`ðŸ” Proximidades disponÃ­veis:`, todasProximidades.map(p => `"${p.slug}" (${p.nome})`))
      } catch (listError) {
        console.log('Erro ao listar proximidades para debug:', listError)
      }
      
      console.log(`ðŸš¨ LANÃ‡ANDO ERRO: Proximidade nÃ£o encontrada`)
      throw new Error('Proximidade nÃ£o encontrada')
    }

    // Verificar se existem imÃ³veis usando esta proximidade
    const checkQuery = `
      SELECT COUNT(*) FROM imovel_proximidades WHERE proximidade_id = $1
    `
    const checkResult = await client.query(checkQuery, [proximidade.id])
    const imoveisCount = parseInt(checkResult.rows[0].count)
    
    if (imoveisCount > 0) {
      throw new Error(`NÃ£o Ã© possÃ­vel excluir esta proximidade. Existem ${imoveisCount} imÃ³vel(is) associado(s).`)
    }

    // Fazer exclusÃ£o fÃ­sica
    const query = `
      DELETE FROM proximidades 
      WHERE id = $1
    `
    
    const result = await client.query(query, [proximidade.id])
    
    if (result.rowCount === 0) {
      throw new Error('Proximidade nÃ£o encontrada')
    }
    
    console.log(`âœ… Proximidade com slug "${slug}" excluÃ­da fisicamente`)
  } catch (error) {
    console.error('âŒ Erro ao excluir proximidade por slug:', error)
    throw new Error('Erro ao excluir proximidade por slug')
  } finally {
    client.release()
  }
}

/**
 * Buscar todas as proximidades (para ediÃ§Ã£o - inclui categorias inativas)
 */
export async function findAllProximidadesForEdit(): Promise<Proximidade[]> {
  try {
    // Mostrar TODAS as proximidades (ativas e inativas), incluindo de categorias inativas
    const query = `
      SELECT 
        p.id,
        p.nome,
        p.descricao,
        p.icone,
        p.popular,
        p.ordem,
        p.ativo,
        p.slug,
        p.created_at,
        p.updated_at,
        p.categoria_id,
        cp.nome as categoria_nome,
        cp.icone as categoria_icone,
        cp.cor as categoria_cor
      FROM proximidades p
      LEFT JOIN categorias_proximidades cp ON p.categoria_id = cp.id
      ORDER BY COALESCE(cp.ordem, 999), p.ordem, p.nome
    `
    const result: QueryResult<Proximidade> = await pool.query(query)
    
    // Mapear dinamicamente ativo para status em todas as proximidades
    return result.rows.map(proximidade => ({
      ...proximidade,
      status: proximidade.ativo ? 'Ativo' : 'Inativo'
    }))
  } catch (error) {
    console.error('âŒ Erro ao buscar proximidades para ediÃ§Ã£o:', error)
    throw new Error('Erro ao buscar proximidades para ediÃ§Ã£o')
  }
}

// ========================================
// FUNÃ‡Ã•ES PARA RELACIONAMENTO IMÃ“VEL-PROXIMIDADES
// ========================================

/**
 * Buscar proximidades de um imÃ³vel
 */
export async function findProximidadesByImovel(imovelId: number): Promise<ImovelProximidade[]> {
  try {
    console.log('ðŸ” findProximidadesByImovel - Buscando proximidades para imÃ³vel:', imovelId)
    
    // Query corrigida: usar LEFT JOIN e remover filtro de ativo para buscar todas as proximidades associadas
    const query = `
      SELECT 
        ip.id,
        ip.imovel_id,
        ip.proximidade_id,
        ip.distancia_metros,
        ip.tempo_caminhada,
        ip.observacoes,
        ip.created_at,
        p.nome as proximidade_nome,
        p.icone as proximidade_icone,
        p.id as id,
        p.categoria_id,
        COALESCE(cp.nome, 'Sem Categoria') as categoria_nome,
        COALESCE(cp.ordem, 999) as categoria_ordem,
        p.ordem as proximidade_ordem
      FROM imovel_proximidades ip
      LEFT JOIN proximidades p ON ip.proximidade_id = p.id
      LEFT JOIN categorias_proximidades cp ON p.categoria_id = cp.id
      WHERE ip.imovel_id = $1
      ORDER BY COALESCE(cp.ordem, 999), COALESCE(p.ordem, 999), p.nome
    `
    
    console.log('ðŸ” findProximidadesByImovel - Query:', query)
    console.log('ðŸ” findProximidadesByImovel - ParÃ¢metros:', [imovelId])
    
    const result: QueryResult<ImovelProximidade> = await pool.query(query, [imovelId])
    
    console.log('ðŸ” findProximidadesByImovel - Resultado:', {
      rowCount: result.rowCount,
      rows: result.rows.length,
      data: result.rows
    })
    
    return result.rows
  } catch (error) {
    console.error('âŒ Erro ao buscar proximidades do imÃ³vel:', error)
    throw new Error('Erro ao buscar proximidades do imÃ³vel')
  }
}

/**
 * Adicionar proximidade a um imÃ³vel
 */
export async function addProximidadeToImovel(
  imovelId: number, 
  proximidadeId: number, 
  distanciaMetros?: number,
  tempoCaminhada?: number,
  observacoes?: string
): Promise<number> {
  try {
    const query = `
      INSERT INTO imovel_proximidades (imovel_id, proximidade_id, distancia_metros, tempo_caminhada, observacoes)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (imovel_id, proximidade_id) DO UPDATE SET
        distancia_metros = EXCLUDED.distancia_metros,
        tempo_caminhada = EXCLUDED.tempo_caminhada,
        observacoes = EXCLUDED.observacoes
      RETURNING id
    `
    const values = [imovelId, proximidadeId, distanciaMetros || null, tempoCaminhada || null, observacoes || null]
    const result: QueryResult<{id: number}> = await pool.query(query, values)
    
    return result.rows[0].id
  } catch (error) {
    console.error('âŒ Erro ao adicionar proximidade ao imÃ³vel:', error)
    throw new Error('Erro ao adicionar proximidade ao imÃ³vel')
  }
}

/**
 * Remover proximidade de um imÃ³vel
 */
export async function removeProximidadeFromImovel(imovelId: number, proximidadeId: number): Promise<boolean> {
  try {
    const query = `
      DELETE FROM imovel_proximidades
      WHERE imovel_id = $1 AND proximidade_id = $2
    `
    const result = await pool.query(query, [imovelId, proximidadeId])
    return (result.rowCount ?? 0) > 0
  } catch (error) {
    console.error('âŒ Erro ao remover proximidade do imÃ³vel:', error)
    throw new Error('Erro ao remover proximidade do imÃ³vel')
  }
}

/**
 * Atualizar proximidades de um imÃ³vel (substitui todas)
 */
export async function updateImovelProximidades(
  imovelId: number, 
  proximidades: Array<{
    proximidade_id: number
    distancia_metros?: number
    tempo_caminhada?: number
    observacoes?: string
  }>
): Promise<boolean> {
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    
    // Remover todas as proximidades atuais
    await client.query('DELETE FROM imovel_proximidades WHERE imovel_id = $1', [imovelId])
    
    // Adicionar as novas proximidades em lote
    if (proximidades.length > 0) {
      const values = proximidades.map((proximidade, index) => 
        `($1, $${index * 4 + 2}, $${index * 4 + 3}, $${index * 4 + 4}, $${index * 4 + 5})`
      ).join(', ')
      
      const params = [imovelId]
      proximidades.forEach(proximidade => {
        params.push(
          proximidade.proximidade_id,
          proximidade.distancia_metros || null,
          proximidade.tempo_caminhada || null,
          proximidade.observacoes || null
        )
      })
      
      const query = `
        INSERT INTO imovel_proximidades (imovel_id, proximidade_id, distancia_metros, tempo_caminhada, observacoes)
        VALUES ${values}
      `
      
      await client.query(query, params)
    }
    
    await client.query('COMMIT')
    return true
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('âŒ Erro ao atualizar proximidades do imÃ³vel:', error)
    throw new Error('Erro ao atualizar proximidades do imÃ³vel')
  } finally {
    client.release()
  }
}

/**
 * Contar imÃ³veis por proximidade
 */
export async function countImoveisByProximidade(): Promise<Array<{proximidade_id: number, proximidade_nome: string, total_imoveis: number}>> {
  try {
    const query = `
      SELECT 
        p.id as proximidade_id,
        p.nome as proximidade_nome,
        COUNT(ip.imovel_id) as total_imoveis
      FROM proximidades p
      LEFT JOIN imovel_proximidades ip ON p.id = ip.proximidade_id
      WHERE p.ativo = true
      GROUP BY p.id, p.nome
      ORDER BY total_imoveis DESC, p.nome
    `
    const result = await pool.query(query)
    return result.rows
  } catch (error) {
    console.error('âŒ Erro ao contar imÃ³veis por proximidade:', error)
    throw new Error('Erro ao contar imÃ³veis por proximidade')
  }
}

// ========================================
// FUNÃ‡Ã•ES UTILITÃRIAS
// ========================================

/**
 * Verificar se uma proximidade existe
 */
export async function proximidadeExists(id: number): Promise<boolean> {
  try {
    const query = 'SELECT 1 FROM proximidades WHERE id = $1 AND ativo = true'
    const result = await pool.query(query, [id])
    return result.rows.length > 0
  } catch (error) {
    console.error('âŒ Erro ao verificar existÃªncia da proximidade:', error)
    return false
  }
}

/**
 * Buscar proximidades por texto (busca)
 */
export async function searchProximidades(searchTerm: string): Promise<Proximidade[]> {
  try {
    const query = `
      SELECT 
        p.*,
        cp.nome as categoria_nome,
        cp.icone as categoria_icone,
        cp.cor as categoria_cor
      FROM proximidades p
      LEFT JOIN categorias_proximidades cp ON p.categoria_id = cp.id
      WHERE p.nome ILIKE $1 OR p.descricao ILIKE $1 OR cp.nome ILIKE $1
      ORDER BY p.categoria_id, p.ordem, p.nome
      LIMIT 50
    `
    const result: QueryResult<Proximidade> = await pool.query(query, [`%${searchTerm}%`])
    
    // Mapear dinamicamente ativo para status
    return result.rows.map(proximidade => ({
      ...proximidade,
      status: proximidade.ativo ? 'Ativo' : 'Inativo'
    }))
  } catch (error) {
    console.error('âŒ Erro ao buscar proximidades:', error)
    throw new Error('Erro ao buscar proximidades')
  }
}

/**
 * Listar todas as proximidades com seus slugs (para debug)
 */
export async function listAllProximidadesWithSlugs(): Promise<Array<{id: number, nome: string, slug: string}>> {
  try {
    const query = `
      SELECT id, nome, slug
      FROM proximidades
      ORDER BY nome
    `
    const result = await pool.query(query)
    return result.rows
  } catch (error) {
    console.error('âŒ Erro ao listar proximidades:', error)
    throw new Error('Erro ao listar proximidades')
  }
}

/**
 * Buscar proximidades por distÃ¢ncia mÃ¡xima
 */
export async function findProximidadesByDistancia(
  imovelId: number, 
  distanciaMaxima: number
): Promise<ImovelProximidade[]> {
  try {
    const query = `
      SELECT 
        ip.id,
        ip.imovel_id,
        ip.proximidade_id,
        ip.distancia_metros,
        ip.tempo_caminhada,
        ip.observacoes,
        ip.created_at,
        p.nome as proximidade_nome,
        p.icone as proximidade_icone,
        cp.nome as categoria_nome
      FROM imovel_proximidades ip
      INNER JOIN proximidades p ON ip.proximidade_id = p.id
      INNER JOIN categorias_proximidades cp ON p.categoria_id = cp.id
      WHERE ip.imovel_id = $1 
        AND ip.distancia_metros IS NOT NULL 
        AND ip.distancia_metros <= $2
        AND p.ativo = true
      ORDER BY ip.distancia_metros, cp.ordem, p.ordem, p.nome
    `
    const result: QueryResult<ImovelProximidade> = await pool.query(query, [imovelId, distanciaMaxima])
    return result.rows
  } catch (error) {
    console.error('âŒ Erro ao buscar proximidades por distÃ¢ncia:', error)
    throw new Error('Erro ao buscar proximidades por distÃ¢ncia')
  }
}



