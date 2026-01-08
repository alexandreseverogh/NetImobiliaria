/* eslint-disable */
import pool from './connection'
import { QueryResult } from 'pg'

export interface Finalidade {
  id: number
  nome: string
  descricao?: string
  ativo: boolean
  created_at: string
  updated_at: string
}

export interface CreateFinalidadeData {
  nome: string
  descricao?: string
  ativo?: boolean
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
    console.error('âŒ Erro ao buscar finalidades:', error)
    throw new Error('Erro ao buscar finalidades')
  }
}

/**
 * Buscar finalidades com paginaÃ§Ã£o
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
    
    // Query para buscar finalidades com paginaÃ§Ã£o
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
    console.error('âŒ Erro ao buscar finalidades com paginaÃ§Ã£o:', error)
    throw new Error('Erro ao buscar finalidades com paginaÃ§Ã£o')
  }
}

/**
 * Criar nova finalidade
 */
export async function createFinalidade(data: CreateFinalidadeData): Promise<Finalidade> {
  try {
    const query = `
      INSERT INTO finalidades_imovel (nome, descricao, ativo)
      VALUES ($1, $2, $3)
      RETURNING *
    `
    const result: QueryResult<Finalidade> = await pool.query(query, [
      data.nome,
      data.descricao || '',
      data.ativo !== undefined ? data.ativo : true
    ])
    return result.rows[0]
  } catch (error) {
    console.error('âŒ Erro ao criar finalidade:', error)
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
    console.error('âŒ Erro ao buscar finalidade por ID:', error)
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
    console.error('âŒ Erro ao atualizar finalidade:', error)
    throw new Error('Erro ao atualizar finalidade')
  }
}

/**
 * Excluir finalidade
 */
export async function deleteFinalidade(id: number): Promise<void> {
  try {
    const query = 'DELETE FROM finalidades_imovel WHERE id = $1'
    await pool.query(query, [id])
  } catch (error) {
    console.error('âŒ Erro ao excluir finalidade:', error)
    throw new Error('Erro ao excluir finalidade')
  }
}


