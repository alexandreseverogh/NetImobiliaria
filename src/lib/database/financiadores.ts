import pool from './connection'
import type { QueryResult } from 'pg'

export interface FinanciadorPatrocinador {
  id: number
  nome: string
  headline: string
  valor_mensal: number
  ativo: boolean
  logo_base64?: string | null
  logo_tipo_mime?: string | null
  created_at: string
  updated_at: string
}

export interface CreateFinanciadorData {
  nome: string
  headline: string
  valor_mensal: number
  ativo?: boolean
  logo_base64: string
  logo_tipo_mime: string
}

export interface UpdateFinanciadorData {
  nome?: string
  headline?: string
  valor_mensal?: number
  ativo?: boolean
  logo_base64?: string
  logo_tipo_mime?: string
}

function bufferToBase64(value: any): string | null {
  if (!value) return null
  try {
    if (Buffer.isBuffer(value)) return value.toString('base64')
    if (value instanceof Uint8Array) return Buffer.from(value).toString('base64')
    if (typeof value === 'string') {
      const s = value.trim()
      if (s.startsWith('\\x')) return Buffer.from(s.slice(2), 'hex').toString('base64')
      // fallback
      return Buffer.from(s, 'latin1').toString('base64')
    }
    return null
  } catch {
    return null
  }
}

export async function findFinanciadoresPaginated(
  page: number = 1,
  limit: number = 10,
  search: string = ''
): Promise<{
  financiadores: FinanciadorPatrocinador[]
  total: number
  totalPages: number
  currentPage: number
  hasNext: boolean
  hasPrev: boolean
}> {
  const safePage = Math.max(1, page)
  const safeLimit = Math.min(50, Math.max(1, limit))
  const offset = (safePage - 1) * safeLimit

  const term = search.trim()
  const whereClause = term ? 'WHERE nome ILIKE $1 OR headline ILIKE $1' : ''
  const queryParams: any[] = term ? [`%${term}%`] : []

  const countQuery = `
    SELECT COUNT(*) as total
    FROM public.financiamento_patrocinadores
    ${whereClause}
  `

  // Inclui logo para pré-visualização no admin (sem evasão; uso interno)
  const dataQuery = `
    SELECT
      id,
      nome,
      headline,
      valor_mensal,
      ativo,
      logo,
      logo_tipo_mime,
      created_at,
      updated_at
    FROM public.financiamento_patrocinadores
    ${whereClause}
    ORDER BY valor_mensal DESC, id DESC
    LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
  `

  const [countResult, dataResult] = await Promise.all([
    pool.query(countQuery, queryParams),
    pool.query(dataQuery, [...queryParams, safeLimit, offset])
  ])

  const total = parseInt(countResult.rows[0]?.total || '0', 10)
  const totalPages = Math.ceil(total / safeLimit) || 1

  const rows = (dataResult as QueryResult<any>).rows || []
  const financiadores: FinanciadorPatrocinador[] = rows.map((row: any) => ({
    id: Number(row.id),
    nome: row.nome,
    headline: row.headline,
    valor_mensal: Number(row.valor_mensal),
    ativo: !!row.ativo,
    logo_base64: bufferToBase64(row.logo),
    logo_tipo_mime: row.logo_tipo_mime || null,
    created_at: row.created_at,
    updated_at: row.updated_at
  }))

  return {
    financiadores,
    total,
    totalPages,
    currentPage: safePage,
    hasNext: safePage < totalPages,
    hasPrev: safePage > 1
  }
}

export async function createFinanciador(data: CreateFinanciadorData): Promise<FinanciadorPatrocinador> {
  const logoBuffer = Buffer.from(data.logo_base64, 'base64')

  const query = `
    INSERT INTO public.financiamento_patrocinadores
      (nome, logo, logo_tipo_mime, headline, valor_mensal, ativo)
    VALUES
      ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `

  const result = await pool.query(query, [
    data.nome,
    logoBuffer,
    data.logo_tipo_mime,
    data.headline,
    data.valor_mensal,
    data.ativo !== undefined ? data.ativo : true
  ])

  const row = result.rows[0]
  return {
    id: Number(row.id),
    nome: row.nome,
    headline: row.headline,
    valor_mensal: Number(row.valor_mensal),
    ativo: !!row.ativo,
    logo_base64: bufferToBase64(row.logo),
    logo_tipo_mime: row.logo_tipo_mime || null,
    created_at: row.created_at,
    updated_at: row.updated_at
  }
}

export async function findFinanciadorById(id: number): Promise<FinanciadorPatrocinador | null> {
  const result = await pool.query(
    `SELECT * FROM public.financiamento_patrocinadores WHERE id = $1 LIMIT 1`,
    [id]
  )
  const row = result.rows[0]
  if (!row) return null
  return {
    id: Number(row.id),
    nome: row.nome,
    headline: row.headline,
    valor_mensal: Number(row.valor_mensal),
    ativo: !!row.ativo,
    logo_base64: bufferToBase64(row.logo),
    logo_tipo_mime: row.logo_tipo_mime || null,
    created_at: row.created_at,
    updated_at: row.updated_at
  }
}

export async function updateFinanciador(id: number, data: UpdateFinanciadorData): Promise<FinanciadorPatrocinador> {
  const fields: string[] = []
  const values: any[] = []
  let param = 0

  if (data.nome !== undefined) {
    fields.push(`nome = $${++param}`)
    values.push(data.nome)
  }
  if (data.headline !== undefined) {
    fields.push(`headline = $${++param}`)
    values.push(data.headline)
  }
  if (data.valor_mensal !== undefined) {
    fields.push(`valor_mensal = $${++param}`)
    values.push(data.valor_mensal)
  }
  if (data.ativo !== undefined) {
    fields.push(`ativo = $${++param}`)
    values.push(data.ativo)
  }
  if (data.logo_base64 !== undefined) {
    fields.push(`logo = $${++param}`)
    values.push(Buffer.from(data.logo_base64, 'base64'))
  }
  if (data.logo_tipo_mime !== undefined) {
    fields.push(`logo_tipo_mime = $${++param}`)
    values.push(data.logo_tipo_mime)
  }

  if (fields.length === 0) {
    const existing = await findFinanciadorById(id)
    if (!existing) throw new Error('Financiador não encontrado')
    return existing
  }

  values.push(id)
  const query = `
    UPDATE public.financiamento_patrocinadores
    SET ${fields.join(', ')}
    WHERE id = $${++param}
    RETURNING *
  `

  const result = await pool.query(query, values)
  const row = result.rows[0]
  if (!row) throw new Error('Financiador não encontrado')
  return {
    id: Number(row.id),
    nome: row.nome,
    headline: row.headline,
    valor_mensal: Number(row.valor_mensal),
    ativo: !!row.ativo,
    logo_base64: bufferToBase64(row.logo),
    logo_tipo_mime: row.logo_tipo_mime || null,
    created_at: row.created_at,
    updated_at: row.updated_at
  }
}

export async function deleteFinanciador(id: number): Promise<void> {
  const result = await pool.query(`DELETE FROM public.financiamento_patrocinadores WHERE id = $1`, [id])
  if ((result.rowCount || 0) === 0) throw new Error('Financiador não encontrado')
}


