import pool from './connection'
import { QueryResult } from 'pg'

export interface Finalidade {
  id: number
  nome: string
  descricao?: string
  ativo: boolean
  tipo_destaque?: string
  alugar_landpaging?: boolean
  vender_landpaging?: boolean
  exibe_financiadores?: boolean
  tenant_id?: string
  created_at: string
  updated_at: string
}

export interface CreateFinalidadeData {
  nome: string
  descricao?: string
  ativo?: boolean
  tipo_destaque?: string
  alugar_landpaging?: boolean
  vender_landpaging?: boolean
  exibe_financiadores?: boolean
  tenant_id?: string
}

/**
 * Buscar todas as finalidades
 */
export async function findAllFinalidades(tenantId?: string): Promise<Finalidade[]> {
  try {
    let whereClause = ''
    let params: any[] = []
    
    if (tenantId) {
      whereClause = 'WHERE tenant_id = $1'
      params = [tenantId]
    }

    const query = `
      SELECT * FROM finalidades_imovel 
      ${whereClause}
      ORDER BY nome
    `
    const result: QueryResult<Finalidade> = await pool.query(query, params)
    return result.rows
  } catch (error) {
    console.error('❌ Erro ao buscar finalidades:', error)
    throw new Error('Erro ao buscar finalidades')
  }
}

/**
 * Buscar finalidades com paginação
 */
export async function findFinalidadesPaginated(
  page: number = 1, 
  limit: number = 10, 
  search: string = '',
  tenantId?: string
): Promise<{
  finalidades: Finalidade[]
  total: number
  totalPages: number
  currentPage: number
  hasNext: boolean
  hasPrev: boolean
}> {
  try {
    const offset = (page - 1) * limit
    
    // Query para buscar com filtro de busca e tenant
    let whereConditions = []
    let queryParams: any[] = []
    let paramCount = 1

    if (tenantId) {
      whereConditions.push(`tenant_id = $${paramCount++}`)
      queryParams.push(tenantId)
    }

    if (search.trim()) {
      whereConditions.push(`(nome ILIKE $${paramCount} OR descricao ILIKE $${paramCount})`)
      queryParams.push(`%${search.trim()}%`)
      paramCount++
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''
    
    // Query para contar total de finalidades
    const countQuery = `
      SELECT COUNT(*) as total
      FROM finalidades_imovel
      ${whereClause}
    `
    
    // Query para buscar finalidades com paginação
    const dataQuery = `
      SELECT * FROM finalidades_imovel 
      ${whereClause}
      ORDER BY nome
      LIMIT $${paramCount++} OFFSET $${paramCount}
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
    
    return {
      finalidades: dataResult.rows,
      total,
      totalPages,
      currentPage: page,
      hasNext,
      hasPrev
    }
  } catch (error) {
    console.error('❌ Erro ao buscar finalidades com paginação:', error)
    throw new Error('Erro ao buscar finalidades com paginação')
  }
}

/**
 * Criar nova finalidade
 */
export async function createFinalidade(data: CreateFinalidadeData): Promise<Finalidade> {
  try {
    if (!data.tenant_id) {
      throw new Error('Tenant ID é obrigatório para criar finalidade')
    }
    const query = `
      INSERT INTO finalidades_imovel (nome, descricao, ativo, tipo_destaque, alugar_landpaging, vender_landpaging, exibe_financiadores, tenant_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `
    const result: QueryResult<Finalidade> = await pool.query(query, [
      data.nome,
      data.descricao || '',
      data.ativo !== undefined ? data.ativo : true,
      data.tipo_destaque || '  ', // Default: sem destaque
      data.alugar_landpaging !== undefined ? data.alugar_landpaging : false,
      data.vender_landpaging !== undefined ? data.vender_landpaging : false,
      data.exibe_financiadores !== undefined ? data.exibe_financiadores : false,
      data.tenant_id
    ])
    return result.rows[0]
  } catch (error) {
    console.error('❌ Erro ao criar finalidade:', error)
    throw error
  }
}

/**
 * Buscar finalidade por ID
 */
export async function findFinalidadeById(id: number, tenantId?: string): Promise<Finalidade | null> {
  try {
    const query = tenantId 
      ? 'SELECT * FROM finalidades_imovel WHERE id = $1 AND tenant_id = $2'
      : 'SELECT * FROM finalidades_imovel WHERE id = $1'
    
    const params = tenantId ? [id, tenantId] : [id]
    const result: QueryResult<Finalidade> = await pool.query(query, params)
    return result.rows[0] || null
  } catch (error) {
    console.error('❌ Erro ao buscar finalidade por ID:', error)
    throw new Error('Erro ao buscar finalidade por ID')
  }
}

/**
 * Atualizar finalidade
 */
export async function updateFinalidade(id: number, tenantId: string | undefined, data: Partial<CreateFinalidadeData>): Promise<Finalidade> {
  try {
    const fields = []
    const values = []
    let paramCount = 0

    if (data.nome !== undefined) {
      fields.push(`nome = $${++paramCount}`)
      values.push(data.nome)
    }

    if (data.descricao !== undefined) {
      fields.push(`descricao = $${++paramCount}`)
      values.push(data.descricao)
    }

    if (data.ativo !== undefined) {
      fields.push(`ativo = $${++paramCount}`)
      values.push(data.ativo)
    }

    if (data.tipo_destaque !== undefined) {
      fields.push(`tipo_destaque = $${++paramCount}`)
      values.push(data.tipo_destaque)
    }

    if (data.alugar_landpaging !== undefined) {
      fields.push(`alugar_landpaging = $${++paramCount}`)
      values.push(data.alugar_landpaging)
    }

    if (data.vender_landpaging !== undefined) {
      fields.push(`vender_landpaging = $${++paramCount}`)
      values.push(data.vender_landpaging)
    }

    if (data.exibe_financiadores !== undefined) {
      fields.push(`exibe_financiadores = $${++paramCount}`)
      values.push(data.exibe_financiadores)
    }

    if (fields.length === 0) {
      throw new Error('Nenhum campo para atualizar')
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`)
    values.push(id)
    paramCount++
    
    let whereClause = `WHERE id = $${paramCount}`
    if (tenantId) {
      values.push(tenantId)
      whereClause += ` AND tenant_id = $${++paramCount}`
    }

    const query = `
      UPDATE finalidades_imovel 
      SET ${fields.join(', ')}
      ${whereClause}
      RETURNING *
    `

    const result: QueryResult<Finalidade> = await pool.query(query, values)
    
    if (result.rows.length === 0) {
      throw new Error('Finalidade não encontrada ou acesso negado')
    }
    
    return result.rows[0]
  } catch (error) {
    console.error('❌ Erro ao atualizar finalidade:', error)
    throw new Error('Erro ao atualizar finalidade')
  }
}

/**
 * Excluir finalidade
 */
export async function deleteFinalidade(id: number, tenantId?: string): Promise<void> {
  try {
    // Verificar se há imóveis usando esta finalidade
    const checkQuery = tenantId
      ? `SELECT COUNT(*) as count FROM imoveis WHERE finalidade_fk = $1 AND tenant_id = $2`
      : `SELECT COUNT(*) as count FROM imoveis WHERE finalidade_fk = $1`
    
    const checkParams = tenantId ? [id, tenantId] : [id]
    const checkResult = await pool.query(checkQuery, checkParams)
    const count = parseInt(checkResult.rows[0].count)
    
    if (count > 0) {
      throw new Error(`Existem ${count} imóvel(is) cadastrado(s) associado(s) a esta finalidade. Remova os imóveis primeiro antes de excluir a finalidade.`)
    }
    
    const query = tenantId
      ? 'DELETE FROM finalidades_imovel WHERE id = $1 AND tenant_id = $2'
      : 'DELETE FROM finalidades_imovel WHERE id = $1'
      
    const deleteResult = await pool.query(query, checkParams)
    
    if (deleteResult.rowCount === 0) {
      throw new Error('Finalidade não encontrada ou já foi excluída')
    }
    
  } catch (error) {
    console.error('❌ Erro ao excluir finalidade:', error)
    throw error
  }
}

