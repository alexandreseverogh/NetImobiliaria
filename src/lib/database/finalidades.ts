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
}

/**
 * Buscar todas as finalidades
 */
export async function findAllFinalidades(): Promise<Finalidade[]> {
  try {
    const query = `
      SELECT * FROM finalidades_imovel 
      ORDER BY nome
    `
    const result: QueryResult<Finalidade> = await pool.query(query)
    return result.rows
  } catch (error) {
    console.error('❌ Erro ao buscar finalidades:', error)
    throw new Error('Erro ao buscar finalidades')
  }
}

/**
 * Buscar finalidades com paginação
 */
export async function findFinalidadesPaginated(page: number = 1, limit: number = 10, search: string = ''): Promise<{
  finalidades: Finalidade[]
  total: number
  totalPages: number
  currentPage: number
  hasNext: boolean
  hasPrev: boolean
}> {
  try {
    const offset = (page - 1) * limit
    
    // Query para buscar com filtro de busca
    let whereClause = ''
    let queryParams: any[] = []
    
    if (search.trim()) {
      whereClause = 'WHERE nome ILIKE $1 OR descricao ILIKE $1'
      queryParams.push(`%${search.trim()}%`)
    }
    
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
    const query = `
      INSERT INTO finalidades_imovel (nome, descricao, ativo, tipo_destaque, alugar_landpaging, vender_landpaging)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `
    const result: QueryResult<Finalidade> = await pool.query(query, [
      data.nome,
      data.descricao || '',
      data.ativo !== undefined ? data.ativo : true,
      data.tipo_destaque || '  ', // Default: sem destaque
      data.alugar_landpaging !== undefined ? data.alugar_landpaging : false,
      data.vender_landpaging !== undefined ? data.vender_landpaging : false
    ])
    return result.rows[0]
  } catch (error) {
    console.error('❌ Erro ao criar finalidade:', error)
    throw new Error('Erro ao criar finalidade')
  }
}

/**
 * Buscar finalidade por ID
 */
export async function findFinalidadeById(id: number): Promise<Finalidade | null> {
  try {
    const query = 'SELECT * FROM finalidades_imovel WHERE id = $1'
    const result: QueryResult<Finalidade> = await pool.query(query, [id])
    return result.rows[0] || null
  } catch (error) {
    console.error('❌ Erro ao buscar finalidade por ID:', error)
    throw new Error('Erro ao buscar finalidade por ID')
  }
}

/**
 * Atualizar finalidade
 */
export async function updateFinalidade(id: number, data: Partial<CreateFinalidadeData>): Promise<Finalidade> {
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

    if (fields.length === 0) {
      throw new Error('Nenhum campo para atualizar')
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`)
    values.push(id)

    const query = `
      UPDATE finalidades_imovel 
      SET ${fields.join(', ')}
      WHERE id = $${++paramCount}
      RETURNING *
    `

    const result: QueryResult<Finalidade> = await pool.query(query, values)
    return result.rows[0]
  } catch (error) {
    console.error('❌ Erro ao atualizar finalidade:', error)
    throw new Error('Erro ao atualizar finalidade')
  }
}

/**
 * Excluir finalidade
 */
export async function deleteFinalidade(id: number): Promise<void> {
  try {
    // Verificar se há imóveis usando esta finalidade
    const checkQuery = `SELECT COUNT(*) as count FROM imoveis WHERE finalidade_fk = $1`
    const checkResult = await pool.query(checkQuery, [id])
    const count = parseInt(checkResult.rows[0].count)
    
    if (count > 0) {
      throw new Error(`Existem ${count} imóvel(is) cadastrado(s) associado(s) a esta finalidade. Remova os imóveis primeiro antes de excluir a finalidade.`)
    }
    
    const query = 'DELETE FROM finalidades_imovel WHERE id = $1'
    const deleteResult = await pool.query(query, [id])
    
    if (deleteResult.rowCount === 0) {
      throw new Error('Finalidade não encontrada ou já foi excluída')
    }
    
  } catch (error) {
    console.error('❌ Erro ao excluir finalidade:', error)
    throw error
  }
}

