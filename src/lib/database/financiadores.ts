import { Pool } from 'pg'

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME!,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
})

export interface Financiador {
  id: number
  nome: string
  headline: string
  valor_mensal: number
  logo_base64?: string | null
  logo_tipo_mime?: string | null
  ativo: boolean
  created_at: Date
  updated_at: Date
}

export interface CreateFinanciadorInput {
  nome: string
  headline: string
  valor_mensal: number
  logo_base64: string
  logo_tipo_mime: string
  ativo?: boolean
}

export async function findFinanciadoresPaginated(
  page: number = 1,
  limit: number = 10,
  search: string = ''
) {
  const offset = (page - 1) * limit

  let whereClause = 'WHERE 1=1'
  const params: any[] = []

  if (search) {
    whereClause += ` AND nome ILIKE $${params.length + 1}`
    params.push(`%${search}%`)
  }

  const countQuery = `SELECT COUNT(*) FROM financiadores ${whereClause}`
  const dataQuery = `
    SELECT * FROM financiadores 
    ${whereClause}
    ORDER BY nome ASC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `

  const [countResult, dataResult] = await Promise.all([
    pool.query(countQuery, params),
    pool.query(dataQuery, [...params, limit, offset])
  ])

  const total = parseInt(countResult.rows[0].count)
  const totalPages = Math.ceil(total / limit)

  return {
    financiadores: dataResult.rows,
    total,
    totalPages,
    currentPage: page,
    hasNext: page < totalPages,
    hasPrev: page > 1
  }
}

export async function createFinanciador(input: CreateFinanciadorInput): Promise<Financiador> {
  const result = await pool.query(
    `INSERT INTO financiadores (nome, headline, valor_mensal, logo_base64, logo_tipo_mime, ativo)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      input.nome,
      input.headline,
      input.valor_mensal,
      input.logo_base64,
      input.logo_tipo_mime,
      input.ativo !== undefined ? input.ativo : true
    ]
  )

  return result.rows[0]
}

export async function findFinanciadorById(id: number): Promise<Financiador | null> {
  const result = await pool.query(
    'SELECT * FROM financiadores WHERE id = $1',
    [id]
  )
  return result.rows[0] || null
}

export async function updateFinanciador(id: number, input: Partial<CreateFinanciadorInput>): Promise<Financiador> {
  const fields: string[] = []
  const values: any[] = []
  let paramIndex = 1

  if (input.nome !== undefined) {
    fields.push(`nome = $${paramIndex++}`)
    values.push(input.nome)
  }
  if (input.headline !== undefined) {
    fields.push(`headline = $${paramIndex++}`)
    values.push(input.headline)
  }
  if (input.valor_mensal !== undefined) {
    fields.push(`valor_mensal = $${paramIndex++}`)
    values.push(input.valor_mensal)
  }
  if (input.logo_base64 !== undefined) {
    fields.push(`logo_base64 = $${paramIndex++}`)
    values.push(input.logo_base64)
  }
  if (input.logo_tipo_mime !== undefined) {
    fields.push(`logo_tipo_mime = $${paramIndex++}`)
    values.push(input.logo_tipo_mime)
  }
  if (input.ativo !== undefined) {
    fields.push(`ativo = $${paramIndex++}`)
    values.push(input.ativo)
  }

  fields.push(`updated_at = CURRENT_TIMESTAMP`)
  values.push(id)

  const result = await pool.query(
    `UPDATE financiadores SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  )

  return result.rows[0]
}

export async function deleteFinanciador(id: number): Promise<void> {
  await pool.query('DELETE FROM financiadores WHERE id = $1', [id])
}
