/* eslint-disable */
/**
 * FunÃ§Ãµes de banco de dados para Amenidades
 * Net ImobiliÃ¡ria - Sistema de GestÃ£o de Amenidades
 */

import pool from './connection'
import { QueryResult } from 'pg'

// ========================================
// INTERFACES E TIPOS
// ========================================

export interface CategoriaAmenidade {
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

export interface Amenidade {
  id: number
  categoria_id?: number
  nome: string
  descricao?: string
  icone?: string
  popular: boolean
  ordem: number
  ativo: boolean
  status?: string // Campo para o frontend (Ativo/Inativo)
  created_at: string
  updated_at: string
  // Dados da categoria (quando usado em JOIN)
  categoria_nome?: string
  categoria_icone?: string
  categoria_cor?: string
}

export interface ImovelAmenidade {
  id: number
  imovel_id: number
  amenidade_id: number
  observacoes?: string
  created_at: string
  // Dados da amenidade (quando usado em JOIN)
  amenidade_nome?: string
  amenidade_icone?: string
  categoria_nome?: string
  categoria_id?: number
  categoria_ordem?: number
  amenidade_ordem?: number
}

// ========================================
// FUNÃ‡Ã•ES PARA CATEGORIAS DE AMENIDADES
// ========================================

/**
 * Buscar todas as categorias de amenidades (ativas e inativas para seleÃ§Ã£o)
 */
export async function findAllCategoriasAmenidades(): Promise<CategoriaAmenidade[]> {
  try {
    console.log('ðŸ”„ DB: Executando query para buscar categorias de amenidades...')
    
    const query = `
      SELECT id, nome, descricao, icone, cor, ordem, ativo, created_at, updated_at
      FROM categorias_amenidades
      ORDER BY ordem, nome
    `
    console.log('ðŸ“ DB: Query:', query)
    
    const result: QueryResult<CategoriaAmenidade> = await pool.query(query)
    console.log(`âœ… DB: ${result.rows.length} categorias retornadas do banco`)
    
    return result.rows
  } catch (error) {
    console.error('âŒ DB: Erro ao buscar categorias de amenidades:', error)
    throw new Error('Erro ao buscar categorias de amenidades')
  }
}

/**
 * Buscar apenas categorias de amenidades ativas (para exibiÃ§Ã£o nas listagens)
 */
export async function findAllCategoriasAmenidadesAtivas(): Promise<CategoriaAmenidade[]> {
  try {
    const query = `
      SELECT id, nome, descricao, icone, cor, ordem, ativo, created_at, updated_at
      FROM categorias_amenidades
      WHERE ativo = true
      ORDER BY ordem, nome
    `
    const result: QueryResult<CategoriaAmenidade> = await pool.query(query)
    return result.rows
  } catch (error) {
    console.error('âŒ Erro ao buscar categorias de amenidades ativas:', error)
    throw new Error('Erro ao buscar categorias de amenidades ativas')
  }
}

/**
 * Buscar categoria de amenidade por ID (todas as categorias)
 */
export async function findCategoriaAmenidadeById(id: number): Promise<CategoriaAmenidade | null> {
  try {
    const query = `
      SELECT id, nome, descricao, icone, cor, ordem, ativo, created_at, updated_at
      FROM categorias_amenidades
      WHERE id = $1
    `
    const result: QueryResult<CategoriaAmenidade> = await pool.query(query, [id])
    return result.rows[0] || null
  } catch (error) {
    console.error('âŒ Erro ao buscar categoria de amenidade:', error)
    throw new Error('Erro ao buscar categoria de amenidade')
  }
}

/**
 * Criar nova categoria de amenidade
 */
export async function createCategoriaAmenidade(data: Omit<CategoriaAmenidade, 'id' | 'created_at' | 'updated_at'>): Promise<CategoriaAmenidade> {
  try {
    const query = `
      INSERT INTO categorias_amenidades (nome, descricao, icone, cor, ordem, ativo, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING id, nome, descricao, icone, cor, ordem, ativo, created_at, updated_at
    `
    const values = [data.nome, data.descricao, data.icone, data.cor, data.ordem, data.ativo]
    const result: QueryResult<CategoriaAmenidade> = await pool.query(query, values)
    
    if (!result.rows[0]) {
      throw new Error('Erro ao criar categoria de amenidade')
    }
    
    return result.rows[0]
  } catch (error) {
    console.error('âŒ Erro ao criar categoria de amenidade:', error)
    throw new Error('Erro ao criar categoria de amenidade')
  }
}

/**
 * Atualizar categoria de amenidade
 */
export async function updateCategoriaAmenidade(id: number, data: Partial<Omit<CategoriaAmenidade, 'id' | 'created_at' | 'updated_at'>>): Promise<CategoriaAmenidade> {
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
      UPDATE categorias_amenidades 
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, nome, descricao, icone, cor, ordem, ativo, created_at, updated_at
    `

    const result: QueryResult<CategoriaAmenidade> = await pool.query(query, values)
    
    if (!result.rows[0]) {
      throw new Error('Categoria nÃ£o encontrada')
    }
    
    return result.rows[0]
  } catch (error) {
    console.error('âŒ Erro ao atualizar categoria de amenidade:', error)
    throw new Error('Erro ao atualizar categoria de amenidade')
  }
}

/**
 * Excluir categoria de amenidade (exclusÃ£o fÃ­sica)
 */
export async function deleteCategoriaAmenidade(id: number): Promise<void> {
  try {
    // Primeiro verificar se existem amenidades usando esta categoria
    const checkQuery = `
      SELECT COUNT(*) FROM amenidades WHERE categoria_id = $1
    `
    const checkResult = await pool.query(checkQuery, [id])
    const amenidadesCount = parseInt(checkResult.rows[0].count)
    
    if (amenidadesCount > 0) {
      throw new Error(`NÃ£o Ã© possÃ­vel excluir esta categoria. Existem ${amenidadesCount} amenidade(s) associada(s).`)
    }
    
    // Fazer exclusÃ£o fÃ­sica
    const query = `
      DELETE FROM categorias_amenidades 
      WHERE id = $1
    `
    
    const result = await pool.query(query, [id])
    
    if (result.rowCount === 0) {
      throw new Error('Categoria nÃ£o encontrada')
    }
    
    console.log(`âœ… Categoria de amenidade com ID ${id} excluÃ­da fisicamente`)
  } catch (error) {
    console.error('âŒ Erro ao excluir categoria de amenidade:', error)
    // Re-lanÃ§ar o erro original para preservar a mensagem especÃ­fica
    throw error
  }
}

// ========================================
// FUNÃ‡Ã•ES PARA AMENIDADES
// ========================================

/**
 * Buscar todas as amenidades com suas categorias (ativas e inativas)
 */
export async function findAllAmenidades(): Promise<Amenidade[]> {
  try {
    // Mostrar apenas amenidades com categorias ATIVAS
    const query = `
      SELECT 
        a.id,
        a.nome,
        a.descricao,
        a.icone,
        a.popular,
        a.ordem,
        a.ativo,
        a.slug,
        a.created_at,
        a.updated_at,
        a.categoria_id,
        ca.nome as categoria_nome,
        ca.icone as categoria_icone,
        ca.cor as categoria_cor
      FROM amenidades a
      INNER JOIN categorias_amenidades ca ON a.categoria_id = ca.id
      WHERE ca.ativo = true
      ORDER BY ca.ordem, a.ordem, a.nome
    `
    const result: QueryResult<Amenidade> = await pool.query(query)
    
    // Mapear dinamicamente ativo para status em todas as amenidades
    return result.rows.map(amenidade => ({
      ...amenidade,
      status: amenidade.ativo ? 'Ativo' : 'Inativo'
    }))
  } catch (error) {
    console.error('âŒ Erro ao buscar amenidades:', error)
    throw new Error('Erro ao buscar amenidades')
  }
}

/**
 * Buscar amenidades com paginaÃ§Ã£o
 */
export async function findAmenidadesPaginated(page: number = 1, limit: number = 10, categoria: string = '', search: string = ''): Promise<{
  amenidades: Amenidade[]
  total: number
  totalPages: number
  currentPage: number
  hasNext: boolean
  hasPrev: boolean
}> {
  try {
    const offset = (page - 1) * limit
    
    // Query para buscar com filtro de categoria e busca
    let whereClause = 'WHERE ca.ativo = true'
    let queryParams: any[] = []
    
    if (categoria.trim()) {
      whereClause += ' AND ca.nome = $1'
      queryParams.push(categoria.trim())
    }
    
    if (search.trim()) {
      const searchParam = queryParams.length + 1
      whereClause += ` AND (a.nome ILIKE $${searchParam} OR a.descricao ILIKE $${searchParam})`
      queryParams.push(`%${search.trim()}%`)
    }
    
    // Query para contar total de amenidades
    const countQuery = `
      SELECT COUNT(*) as total
      FROM amenidades a
      INNER JOIN categorias_amenidades ca ON a.categoria_id = ca.id
      ${whereClause}
    `
    
    // Query para buscar amenidades com paginaÃ§Ã£o
    const dataQuery = `
      SELECT 
        a.id,
        a.nome,
        a.descricao,
        a.icone,
        a.popular,
        a.ordem,
        a.ativo,
        a.slug,
        a.created_at,
        a.updated_at,
        a.categoria_id,
        ca.nome as categoria_nome,
        ca.icone as categoria_icone,
        ca.cor as categoria_cor
      FROM amenidades a
      INNER JOIN categorias_amenidades ca ON a.categoria_id = ca.id
      ${whereClause}
      ORDER BY ca.ordem, a.ordem, a.nome
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
    
    // Mapear dinamicamente ativo para status em todas as amenidades
    const amenidades = dataResult.rows.map(amenidade => ({
      ...amenidade,
      status: amenidade.ativo ? 'Ativo' : 'Inativo'
    }))
    
    return {
      amenidades,
      total,
      totalPages,
      currentPage: page,
      hasNext,
      hasPrev
    }
  } catch (error) {
    console.error('âŒ Erro ao buscar amenidades com paginaÃ§Ã£o:', error)
    throw new Error('Erro ao buscar amenidades com paginaÃ§Ã£o')
  }
}

/**
 * Buscar todas as amenidades (para ediÃ§Ã£o - inclui categorias inativas)
 */
export async function findAllAmenidadesForEdit(): Promise<Amenidade[]> {
  try {
    // Mostrar TODAS as amenidades (ativas e inativas), incluindo de categorias inativas
    const query = `
      SELECT 
        a.id,
        a.nome,
        a.descricao,
        a.icone,
        a.popular,
        a.ordem,
        a.ativo,
        a.slug,
        a.created_at,
        a.updated_at,
        a.categoria_id,
        ca.nome as categoria_nome,
        ca.icone as categoria_icone,
        ca.cor as categoria_cor
      FROM amenidades a
      LEFT JOIN categorias_amenidades ca ON a.categoria_id = ca.id
      ORDER BY COALESCE(ca.ordem, 999), a.ordem, a.nome
    `
    const result: QueryResult<Amenidade> = await pool.query(query)
    
    // Mapear dinamicamente ativo para status em todas as amenidades
    return result.rows.map(amenidade => ({
      ...amenidade,
      status: amenidade.ativo ? 'Ativo' : 'Inativo'
    }))
  } catch (error) {
    console.error('âŒ Erro ao buscar amenidades para ediÃ§Ã£o:', error)
    throw new Error('Erro ao buscar amenidades para ediÃ§Ã£o')
  }
}

/**
 * Buscar amenidades com cache (para alta performance)
 * Esta funÃ§Ã£o pode ser usada quando precisar de mÃ¡xima performance
 */
export async function findAllAmenidadesCached(): Promise<Amenidade[]> {
  try {
    // Query mais simples para cache
    const query = `
      SELECT 
        a.id, a.nome, a.descricao, a.icone, a.popular, a.ordem, a.ativo, a.slug,
        a.created_at, a.updated_at, a.categoria_id,
        ca.nome as categoria_nome, ca.icone as categoria_icone, ca.cor as categoria_cor
      FROM amenidades a
      INNER JOIN categorias_amenidades ca ON a.categoria_id = ca.id
      WHERE a.ativo = true AND ca.ativo = true
      ORDER BY ca.ordem, a.ordem, a.nome
    `
    const result: QueryResult<Amenidade> = await pool.query(query)
    
    return result.rows.map(amenidade => ({
      ...amenidade,
      status: amenidade.ativo ? 'Ativo' : 'Inativo'
    }))
  } catch (error) {
    console.error('âŒ Erro ao buscar amenidades (cached):', error)
    throw new Error('Erro ao buscar amenidades')
  }
}

/**
 * Buscar amenidades por categoria
 */
export async function findAmenidadesByCategoria(categoriaId: number): Promise<Amenidade[]> {
  try {
    const query = `
      SELECT
        a.*,
        ca.nome as categoria_nome,
        ca.icone as categoria_icone,
        ca.cor as categoria_cor
      FROM amenidades a
      LEFT JOIN categorias_amenidades ca ON a.categoria_id = ca.id
      WHERE a.categoria_id = $1
      ORDER BY a.ordem, a.nome
    `
    const result: QueryResult<Amenidade> = await pool.query(query, [categoriaId])

    // Mapear dinamicamente ativo para status
    return result.rows.map(amenidade => ({
      ...amenidade,
      status: amenidade.ativo ? 'Ativo' : 'Inativo'
    }))
  } catch (error) {
    console.error('âŒ Erro ao buscar amenidades por categoria:', error)
    throw new Error('Erro ao buscar amenidades por categoria')
  }
}

/**
 * Buscar amenidades populares
 */
export async function findAmenidadesPopulares(): Promise<Amenidade[]> {
  try {
    const query = `
      SELECT
        a.*,
        ca.nome as categoria_nome,
        ca.icone as categoria_icone,
        ca.cor as categoria_cor
      FROM amenidades a
      LEFT JOIN categorias_amenidades ca ON a.categoria_id = ca.id
      WHERE a.popular = true
      ORDER BY a.categoria_id, a.ordem, a.nome
    `
    const result: QueryResult<Amenidade> = await pool.query(query)

    // Mapear dinamicamente ativo para status
    return result.rows.map(amenidade => ({
      ...amenidade,
      status: amenidade.ativo ? 'Ativo' : 'Inativo'
    }))
  } catch (error) {
    console.error('âŒ Erro ao buscar amenidades populares:', error)
    throw new Error('Erro ao buscar amenidades populares')
  }
}

/**
 * Buscar amenidade por ID
 */
export async function findAmenidadeById(id: number): Promise<Amenidade | null> {
  try {
    const query = `
      SELECT
        a.*,
        ca.nome as categoria_nome,
        ca.icone as categoria_icone,
        ca.cor as categoria_cor
      FROM amenidades a
      LEFT JOIN categorias_amenidades ca ON a.categoria_id = ca.id
      WHERE a.id = $1
      LIMIT 1
    `
    const result: QueryResult<Amenidade> = await pool.query(query, [id])
    
    if (result.rows[0]) {
      // Mapear dinamicamente ativo para status
      const amenidade = result.rows[0]
      amenidade.status = amenidade.ativo ? 'Ativo' : 'Inativo'
      return amenidade
    }
    
    return null
  } catch (error) {
    console.error('âŒ Erro ao buscar amenidade por ID:', error)
    throw new Error('Erro ao buscar amenidade por ID')
  }
}

/**
 * Buscar amenidade por slug (para ediÃ§Ã£o - retorna todas)
 */
export async function findAmenidadeBySlug(slug: string): Promise<Amenidade | null> {
  try {
    const query = `
      SELECT 
        a.*,
        ca.nome as categoria_nome,
        ca.icone as categoria_icone,
        ca.cor as categoria_cor
      FROM amenidades a
      LEFT JOIN categorias_amenidades ca ON a.categoria_id = ca.id
      WHERE a.slug = $1
      LIMIT 1
    `
    const result = await pool.query(query, [slug])
    
    if (result.rows[0]) {
      // Mapear dinamicamente ativo para status
      const amenidade = result.rows[0]
      amenidade.status = amenidade.ativo ? 'Ativo' : 'Inativo'
      return amenidade
    }
    
    return null
  } catch (error) {
    console.error('âŒ Erro ao buscar amenidade por slug:', error)
    throw new Error('Erro ao buscar amenidade por slug')
  }
}

/**
 * Buscar amenidade ativa por slug (para listagem - apenas ativas)
 */
export async function findAmenidadeAtivaBySlug(slug: string): Promise<Amenidade | null> {
  try {
    const query = `
      SELECT 
        a.*,
        ca.nome as categoria_nome,
        ca.icone as categoria_icone,
        ca.cor as categoria_cor
      FROM amenidades a
      LEFT JOIN categorias_amenidades ca ON a.categoria_id = ca.id
      WHERE a.slug = $1 AND a.ativo = true
      LIMIT 1
    `
    const result = await pool.query(query, [slug])
    return result.rows[0] || null
  } catch (error) {
    console.error('âŒ Erro ao buscar amenidade ativa por slug:', error)
    throw new Error('Erro ao buscar amenidade ativa por slug')
  }
}

/**
 * Atualizar amenidade por slug
 */
export async function updateAmenidadeBySlug(slug: string, data: Partial<Omit<Amenidade, 'id' | 'created_at' | 'updated_at'>>): Promise<Amenidade> {
  const client = await pool.connect()
  
  try {
    // Primeiro, buscar a amenidade pelo slug para obter o ID
    const amenidade = await findAmenidadeBySlug(slug)
    if (!amenidade) {
      throw new Error('Amenidade nÃ£o encontrada')
    }

    // Gerar novo slug se o nome foi alterado
    let newSlug = slug
    if (data.nome && data.nome !== amenidade.nome) {
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
        + '-' + amenidade.id
    }

    const query = `
      UPDATE amenidades 
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
      amenidade.id
    ])
    
    if (result.rows.length === 0) {
      throw new Error('Erro ao atualizar amenidade')
    }
    
    // Retornar a amenidade atualizada com dados completos
    return await findAmenidadeBySlug(newSlug) as Amenidade
  } catch (error) {
    console.error('âŒ Erro ao atualizar amenidade por slug:', error)
    throw new Error('Erro ao atualizar amenidade por slug')
  } finally {
    client.release()
  }
}

/**
 * Excluir amenidade por slug (exclusÃ£o fÃ­sica)
 */
export async function deleteAmenidadeBySlug(slug: string): Promise<void> {
  const client = await pool.connect()
  
  try {
    console.log('ðŸ—‘ï¸ DB: Iniciando exclusÃ£o da amenidade com slug:', slug)
    
    // Verificar se o slug Ã© um ID numÃ©rico
    let amenidade = null
    if (/^\d+$/.test(slug)) {
      console.log('ðŸ” DB: Slug Ã© um ID numÃ©rico, buscando por ID')
      amenidade = await findAmenidadeById(parseInt(slug))
    } else {
      console.log('ðŸ” DB: Slug Ã© string, buscando por slug')
      amenidade = await findAmenidadeBySlug(slug)
    }
    
    if (!amenidade) {
      console.log('âŒ DB: Amenidade nÃ£o encontrada com slug:', slug)
      throw new Error('Amenidade nÃ£o encontrada')
    }
    
    console.log('ðŸ” DB: Amenidade encontrada:', amenidade.id, amenidade.nome)

    // Verificar se existem imÃ³veis usando esta amenidade
    const checkQuery = `
      SELECT COUNT(*) FROM imovel_amenidades WHERE amenidade_id = $1
    `
    const checkResult = await client.query(checkQuery, [amenidade.id])
    const imoveisCount = parseInt(checkResult.rows[0].count)
    
    console.log('ðŸ” DB: VerificaÃ§Ã£o de dependÃªncias - imÃ³veis associados:', imoveisCount)
    
    if (imoveisCount > 0) {
      console.log('âŒ DB: NÃ£o Ã© possÃ­vel excluir - existem imÃ³veis associados')
      throw new Error(`NÃ£o Ã© possÃ­vel excluir esta amenidade. Existem ${imoveisCount} imÃ³vel(is) associado(s).`)
    }

    // Fazer exclusÃ£o fÃ­sica
    console.log('ðŸ—‘ï¸ DB: Executando DELETE da amenidade ID:', amenidade.id)
    const query = `
      DELETE FROM amenidades 
      WHERE id = $1
    `
    
    const result = await client.query(query, [amenidade.id])
    
    if (result.rowCount === 0) {
      console.log('âŒ DB: DELETE nÃ£o afetou nenhuma linha')
      throw new Error('Amenidade nÃ£o encontrada')
    }
    
    console.log(`âœ… DB: Amenidade com slug "${slug}" excluÃ­da fisicamente. Linhas afetadas:`, result.rowCount)
  } catch (error) {
    console.error('âŒ DB: Erro ao excluir amenidade por slug:', error)
    throw new Error('Erro ao excluir amenidade por slug')
  } finally {
    client.release()
  }
}

/**
 * Criar nova amenidade
 */
export async function createAmenidade(data: Omit<Amenidade, 'id' | 'created_at' | 'updated_at' | 'slug'>): Promise<Amenidade> {
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
      INSERT INTO amenidades (nome, descricao, categoria_id, ativo, popular, ordem, slug, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING id, nome, descricao, categoria_id, ativo, popular, ordem, slug, created_at, updated_at
    `
    
    const values = [data.nome, data.descricao, data.categoria_id, data.ativo, data.popular, data.ordem, slug]
    const result: QueryResult<Amenidade> = await pool.query(query, values)
    
    if (!result.rows[0]) {
      throw new Error('Erro ao criar amenidade')
    }
    
    // Retornar a amenidade criada com dados completos
    return await findAmenidadeBySlug(slug) as Amenidade
  } catch (error) {
    console.error('âŒ Erro ao criar amenidade:', error)
    throw new Error('Erro ao criar amenidade')
  }
}

// ========================================
// FUNÃ‡Ã•ES PARA RELACIONAMENTO IMÃ“VEL-AMENIDADES
// ========================================

/**
 * Buscar amenidades de um imÃ³vel
 */
export async function findAmenidadesByImovel(imovelId: number): Promise<ImovelAmenidade[]> {
  try {
    console.log('ðŸ” findAmenidadesByImovel - Buscando amenidades para imÃ³vel:', imovelId)
    
    // Query corrigida: usar LEFT JOIN e remover filtro de ativo para buscar todas as amenidades associadas
    const query = `
      SELECT 
        ia.id,
        ia.imovel_id,
        ia.amenidade_id,
        ia.observacoes,
        ia.created_at,
        a.nome as amenidade_nome,
        a.icone as amenidade_icone,
        a.id as id,
        a.categoria_id,
        COALESCE(ca.nome, 'Sem Categoria') as categoria_nome,
        COALESCE(ca.ordem, 999) as categoria_ordem,
        a.ordem as amenidade_ordem
      FROM imovel_amenidades ia
      LEFT JOIN amenidades a ON ia.amenidade_id = a.id
      LEFT JOIN categorias_amenidades ca ON a.categoria_id = ca.id
      WHERE ia.imovel_id = $1
      ORDER BY COALESCE(ca.ordem, 999), COALESCE(a.ordem, 999), a.nome
    `
    
    console.log('ðŸ” findAmenidadesByImovel - Query:', query)
    console.log('ðŸ” findAmenidadesByImovel - ParÃ¢metros:', [imovelId])
    
    const result: QueryResult<ImovelAmenidade> = await pool.query(query, [imovelId])
    
    console.log('ðŸ” findAmenidadesByImovel - Resultado:', {
      rowCount: result.rowCount,
      rows: result.rows.length,
      data: result.rows
    })
    
    return result.rows
  } catch (error) {
    console.error('âŒ Erro ao buscar amenidades do imÃ³vel:', error)
    throw new Error('Erro ao buscar amenidades do imÃ³vel')
  }
}

/**
 * Adicionar amenidade a um imÃ³vel
 */
export async function addAmenidadeToImovel(
  imovelId: number, 
  amenidadeId: number, 
  observacoes?: string
): Promise<number> {
  try {
    const query = `
      INSERT INTO imovel_amenidades (imovel_id, amenidade_id, observacoes)
      VALUES ($1, $2, $3)
      ON CONFLICT (imovel_id, amenidade_id) DO NOTHING
      RETURNING id
    `
    const values = [imovelId, amenidadeId, observacoes || null]
    const result: QueryResult<{id: number}> = await pool.query(query, values)
    
    if (result.rows.length === 0) {
      throw new Error('Amenidade jÃ¡ estÃ¡ associada ao imÃ³vel')
    }
    
    return result.rows[0].id
  } catch (error) {
    console.error('âŒ Erro ao adicionar amenidade ao imÃ³vel:', error)
    throw new Error('Erro ao adicionar amenidade ao imÃ³vel')
  }
}

/**
 * Remover amenidade de um imÃ³vel
 */
export async function removeAmenidadeFromImovel(imovelId: number, amenidadeId: number): Promise<boolean> {
  try {
    const query = `
      DELETE FROM imovel_amenidades
      WHERE imovel_id = $1 AND amenidade_id = $2
    `
    const result = await pool.query(query, [imovelId, amenidadeId])
    return (result.rowCount ?? 0) > 0
  } catch (error) {
    console.error('âŒ Erro ao remover amenidade do imÃ³vel:', error)
    throw new Error('Erro ao remover amenidade do imÃ³vel')
  }
}

/**
 * Atualizar amenidades de um imÃ³vel (substitui todas)
 */
export async function updateImovelAmenidades(
  imovelId: number, 
  amenidadeIds: number[]
): Promise<boolean> {
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    
    // Remover todas as amenidades atuais
    await client.query('DELETE FROM imovel_amenidades WHERE imovel_id = $1', [imovelId])
    
    // Adicionar as novas amenidades
    if (amenidadeIds.length > 0) {
      const values = amenidadeIds.map((amenidadeId, index) => 
        `($1, $${index + 2})`
      ).join(', ')
      
      const query = `
        INSERT INTO imovel_amenidades (imovel_id, amenidade_id)
        VALUES ${values}
      `
      
      await client.query(query, [imovelId, ...amenidadeIds])
    }
    
    await client.query('COMMIT')
    return true
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('âŒ Erro ao atualizar amenidades do imÃ³vel:', error)
    throw new Error('Erro ao atualizar amenidades do imÃ³vel')
  } finally {
    client.release()
  }
}

/**
 * Contar imÃ³veis por amenidade
 */
export async function countImoveisByAmenidade(): Promise<Array<{amenidade_id: number, amenidade_nome: string, total_imoveis: number}>> {
  try {
    const query = `
      SELECT 
        a.id as amenidade_id,
        a.nome as amenidade_nome,
        COUNT(ia.imovel_id) as total_imoveis
      FROM amenidades a
      LEFT JOIN imovel_amenidades ia ON a.id = ia.amenidade_id
      WHERE a.ativo = true
      GROUP BY a.id, a.nome
      ORDER BY total_imoveis DESC, a.nome
    `
    const result = await pool.query(query)
    return result.rows
  } catch (error) {
    console.error('âŒ Erro ao contar imÃ³veis por amenidade:', error)
    throw new Error('Erro ao contar imÃ³veis por amenidade')
  }
}

// ========================================
// FUNÃ‡Ã•ES UTILITÃRIAS
// ========================================

/**
 * Verificar se uma amenidade existe
 */
export async function amenidadeExists(id: number): Promise<boolean> {
  try {
    const query = 'SELECT 1 FROM amenidades WHERE id = $1 AND ativo = true'
    const result = await pool.query(query, [id])
    return result.rows.length > 0
  } catch (error) {
    console.error('âŒ Erro ao verificar existÃªncia da amenidade:', error)
    return false
  }
}

/**
 * Buscar amenidades por texto (busca)
 */
export async function searchAmenidades(searchTerm: string): Promise<Amenidade[]> {
  try {
    const query = `
      SELECT
        a.*,
        ca.nome as categoria_nome,
        ca.icone as categoria_icone,
        ca.cor as categoria_cor
      FROM amenidades a
      LEFT JOIN categorias_amenidades ca ON a.categoria_id = ca.id
      WHERE a.nome ILIKE $1 OR a.descricao ILIKE $1 OR ca.nome ILIKE $1
      ORDER BY a.categoria_id, a.ordem, a.nome
      LIMIT 50
    `
    const result: QueryResult<Amenidade> = await pool.query(query, [`%${searchTerm}%`])

    // Mapear dinamicamente ativo para status
    return result.rows.map(amenidade => ({
      ...amenidade,
      status: amenidade.ativo ? 'Ativo' : 'Inativo'
    }))
  } catch (error) {
    console.error('âŒ Erro ao buscar amenidades:', error)
    throw new Error('Erro ao buscar amenidades')
  }
}



