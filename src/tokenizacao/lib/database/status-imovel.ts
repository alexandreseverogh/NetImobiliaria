/* eslint-disable */
import pool from '@/lib/database/connection'
import { QueryResult } from 'pg'

export interface StatusImovel {
  id: number
  nome: string
  cor: string
  descricao?: string
  ativo: boolean
  consulta_imovel_internauta: boolean
  created_at: string
  updated_at: string
}

export interface CreateStatusImovelData {
  nome: string
  cor?: string
  descricao?: string
  ativo?: boolean
  consulta_imovel_internauta?: boolean
}

export interface UpdateStatusImovelData {
  nome?: string
  cor?: string
  descricao?: string
  ativo?: boolean
  consulta_imovel_internauta?: boolean
}

export async function findAllStatusImovel(): Promise<StatusImovel[]> {
  const result: QueryResult<StatusImovel> = await pool.query(`
    SELECT 
      id,
      nome,
      cor,
      descricao,
      ativo,
      consulta_imovel_internauta,
      created_at,
      updated_at
    FROM status_imovel 
    ORDER BY nome ASC
  `)
  return result.rows
}

export async function findStatusImovelPaginated(page: number = 1, limit: number = 10, search: string = ''): Promise<{
  statusImovel: StatusImovel[]
  total: number
  totalPages: number
  currentPage: number
  hasNext: boolean
  hasPrev: boolean
}> {
  const offset = (page - 1) * limit

  // Query para buscar com filtro de busca
  let whereClause = ''
  let queryParams: any[] = []
  
  if (search.trim()) {
    whereClause = 'WHERE nome ILIKE $1 OR descricao ILIKE $1'
    queryParams.push(`%${search.trim()}%`)
  }

  // Query para contar total
  const countQuery = `
    SELECT COUNT(*) as total
    FROM status_imovel
    ${whereClause}
  `

  // Query principal com paginaÃ§Ã£o
  const dataQuery = `
    SELECT 
      id,
      nome,
      cor,
      descricao,
      ativo,
      consulta_imovel_internauta,
      created_at,
      updated_at
    FROM status_imovel 
    ${whereClause}
    ORDER BY nome ASC
    LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
  `

  // Executar ambas as queries em paralelo
  const [countResult, result] = await Promise.all([
    pool.query(countQuery, queryParams),
    pool.query(dataQuery, [...queryParams, limit, offset])
  ])

  const total = parseInt(countResult.rows[0].total)

  const totalPages = Math.ceil(total / limit)
  const hasNext = page < totalPages
  const hasPrev = page > 1

  return {
    statusImovel: result.rows,
    total,
    totalPages,
    currentPage: page,
    hasNext,
    hasPrev
  }
}

export async function findStatusImovelById(id: number): Promise<StatusImovel | null> {
  const result: QueryResult<StatusImovel> = await pool.query(`
    SELECT 
      id,
      nome,
      cor,
      descricao,
      ativo,
      consulta_imovel_internauta,
      created_at,
      updated_at
    FROM status_imovel 
    WHERE id = $1
  `, [id])
  return result.rows[0] || null
}

export async function createStatusImovel(data: CreateStatusImovelData): Promise<StatusImovel> {
  const result: QueryResult<StatusImovel> = await pool.query(`
    INSERT INTO status_imovel (nome, cor, descricao, ativo, consulta_imovel_internauta)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `, [
    data.nome,
    data.cor || '#3B82F6',
    data.descricao || '',
    data.ativo !== undefined ? data.ativo : true,
    data.consulta_imovel_internauta !== undefined ? data.consulta_imovel_internauta : true
  ])
  return result.rows[0]
}

export async function updateStatusImovel(id: number, data: UpdateStatusImovelData): Promise<StatusImovel> {
  const fields = []
  const values = []
  let paramCount = 1

  if (data.nome !== undefined) {
    fields.push(`nome = $${paramCount}`)
    values.push(data.nome)
    paramCount++
  }
  if (data.cor !== undefined) {
    fields.push(`cor = $${paramCount}`)
    values.push(data.cor)
    paramCount++
  }
  if (data.descricao !== undefined) {
    fields.push(`descricao = $${paramCount}`)
    values.push(data.descricao)
    paramCount++
  }
  if (data.ativo !== undefined) {
    fields.push(`ativo = $${paramCount}`)
    values.push(data.ativo)
    paramCount++
  }
  if (data.consulta_imovel_internauta !== undefined) {
    fields.push(`consulta_imovel_internauta = $${paramCount}`)
    values.push(data.consulta_imovel_internauta)
    paramCount++
  }

  if (fields.length === 0) {
    throw new Error('Nenhum campo para atualizar')
  }

  fields.push(`updated_at = CURRENT_TIMESTAMP`)
  values.push(id)

  const result: QueryResult<StatusImovel> = await pool.query(`
    UPDATE status_imovel 
    SET ${fields.join(', ')}
    WHERE id = $${paramCount}
    RETURNING *
  `, values)

  if (result.rows.length === 0) {
    throw new Error('Status de imÃ³vel nÃ£o encontrado')
  }

  return result.rows[0]
}

export async function deleteStatusImovel(id: number): Promise<void> {
  const result = await pool.query('DELETE FROM status_imovel WHERE id = $1', [id])
  if (result.rowCount === 0) {
    throw new Error('Status de imÃ³vel nÃ£o encontrado')
  }
}

