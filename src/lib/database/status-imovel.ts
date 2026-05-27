import pool from '@/lib/database/connection'
import { QueryResult } from 'pg'

export interface StatusImovel {
  id: number
  nome: string
  cor: string
  descricao?: string
  ativo: boolean
  consulta_imovel_internauta: boolean
  tenant_id: string
  created_at: string
  updated_at: string
}

export interface CreateStatusImovelData {
  nome: string
  cor?: string
  descricao?: string
  ativo?: boolean
  consulta_imovel_internauta?: boolean
  tenant_id: string
}

export interface UpdateStatusImovelData {
  nome?: string
  cor?: string
  descricao?: string
  ativo?: boolean
  consulta_imovel_internauta?: boolean
}

export async function findAllStatusImovel(tenantId?: string): Promise<StatusImovel[]> {
  let whereClause = ''
  let params: any[] = []
  
  if (tenantId) {
    whereClause = 'WHERE tenant_id = $1'
    params = [tenantId]
  }

  const result: QueryResult<StatusImovel> = await pool.query(`
    SELECT 
      id,
      nome,
      cor,
      descricao,
      ativo,
      consulta_imovel_internauta,
      tenant_id,
      created_at,
      updated_at
    FROM status_imovel 
    ${whereClause}
    ORDER BY nome ASC
  `, params)
  return result.rows
}

export async function findStatusImovelPaginated(
  page: number = 1, 
  limit: number = 10, 
  search: string = '',
  tenantId?: string
): Promise<{
  statusImovel: StatusImovel[]
  total: number
  totalPages: number
  currentPage: number
  hasNext: boolean
  hasPrev: boolean
}> {
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

  // Query para contar total
  const countQuery = `
    SELECT COUNT(*) as total
    FROM status_imovel
    ${whereClause}
  `

  // Query principal com paginação
  const dataQuery = `
    SELECT 
      id,
      nome,
      cor,
      descricao,
      ativo,
      consulta_imovel_internauta,
      tenant_id,
      created_at,
      updated_at
    FROM status_imovel 
    ${whereClause}
    ORDER BY nome ASC
    LIMIT $${paramCount++} OFFSET $${paramCount}
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

export async function findStatusImovelById(id: number, tenantId?: string): Promise<StatusImovel | null> {
  let whereClause = 'WHERE id = $1'
  let params = [id]
  
  if (tenantId) {
    whereClause += ' AND tenant_id = $2'
    params.push(tenantId as any)
  }

  const result: QueryResult<StatusImovel> = await pool.query(`
    SELECT 
      id,
      nome,
      cor,
      descricao,
      ativo,
      consulta_imovel_internauta,
      tenant_id,
      created_at,
      updated_at
    FROM status_imovel 
    ${whereClause}
  `, params)
  return result.rows[0] || null
}

export async function createStatusImovel(data: CreateStatusImovelData): Promise<StatusImovel> {
  const result: QueryResult<StatusImovel> = await pool.query(`
    INSERT INTO status_imovel (nome, cor, descricao, ativo, consulta_imovel_internauta, tenant_id)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `, [
    data.nome,
    data.cor || '#3B82F6',
    data.descricao || '',
    data.ativo !== undefined ? data.ativo : true,
    data.consulta_imovel_internauta !== undefined ? data.consulta_imovel_internauta : true,
    data.tenant_id
  ])
  return result.rows[0]
}

export async function updateStatusImovel(id: number, tenantId: string | undefined, data: UpdateStatusImovelData): Promise<StatusImovel> {
  const fields = []
  const values = []
  let paramCount = 1

  // Campos que podem ser atualizados
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
  
  // Adicionar ID aos parâmetros
  const idIdx = paramCount
  values.push(id)
  paramCount++
  
  let whereClause = `WHERE id = $${idIdx}`
  if (tenantId) {
    const tenantIdx = paramCount
    values.push(tenantId)
    whereClause += ` AND tenant_id = $${tenantIdx}`
  }

  const result: QueryResult<StatusImovel> = await pool.query(`
    UPDATE status_imovel 
    SET ${fields.join(', ')}
    ${whereClause}
    RETURNING *
  `, values)

  if (result.rows.length === 0) {
    throw new Error('Status de imóvel não encontrado ou acesso negado')
  }

  return result.rows[0]
}

export async function deleteStatusImovel(id: number, tenantId?: string): Promise<void> {
  let whereClause = 'WHERE id = $1'
  let params = [id]
  
  if (tenantId) {
    whereClause += ' AND tenant_id = $2'
    params.push(tenantId as any)
  }

  const result = await pool.query(`DELETE FROM status_imovel ${whereClause}`, params)
  if (result.rowCount === 0) {
    throw new Error('Status de imóvel não encontrado ou acesso negado')
  }
}
