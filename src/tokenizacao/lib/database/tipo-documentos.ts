import pool from './connection'

export interface TipoDocumento {
  id: number
  descricao: string
  consulta_imovel_internauta: boolean
  ativo: boolean
  created_at: string
  updated_at: string
}

export interface CreateTipoDocumentoData {
  descricao: string
  consulta_imovel_internauta: boolean
}

export interface UpdateTipoDocumentoData {
  descricao?: string
  consulta_imovel_internauta?: boolean
  ativo?: boolean
}

// Buscar todos os tipos de documentos
export async function findTiposDocumentos(): Promise<TipoDocumento[]> {
  try {
    const query = `
      SELECT 
        id,
        descricao,
        consulta_imovel_internauta,
        ativo,
        created_at,
        updated_at
      FROM tipo_documento_imovel
      ORDER BY descricao ASC
    `
    
    const result = await pool.query(query)
    return result.rows
  } catch (error) {
    console.error('Erro ao buscar tipos de documentos:', error)
    throw new Error('Erro ao buscar tipos de documentos')
  }
}

// Buscar tipos de documentos com paginação
export async function findTiposDocumentosPaginated(
  page: number = 1, 
  limit: number = 10, 
  search: string = ''
): Promise<{
  tiposDocumentos: TipoDocumento[]
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
      whereClause = 'WHERE descricao ILIKE $1'
      queryParams.push(`%${search.trim()}%`)
    }
    
    // Query principal com paginação
    const query = `
      SELECT 
        id,
        descricao,
        consulta_imovel_internauta,
        ativo,
        created_at,
        updated_at
      FROM tipo_documento_imovel
      ${whereClause}
      ORDER BY descricao ASC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `
    
    // Query para contar total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM tipo_documento_imovel
      ${whereClause}
    `
    
    const [result, countResult] = await Promise.all([
      pool.query(query, [...queryParams, limit, offset]),
      pool.query(countQuery, queryParams)
    ])
    
    const total = parseInt(countResult.rows[0].total)
    const totalPages = Math.ceil(total / limit)
    
    return {
      tiposDocumentos: result.rows,
      total,
      totalPages,
      currentPage: page,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  } catch (error) {
    console.error('Erro ao buscar tipos de documentos com paginação:', error)
    throw new Error('Erro ao buscar tipos de documentos')
  }
}

// Buscar tipo de documento por ID
export async function findTipoDocumentoById(id: number): Promise<TipoDocumento | null> {
  try {
    const query = `
      SELECT 
        id,
        descricao,
        consulta_imovel_internauta,
        ativo,
        created_at,
        updated_at
      FROM tipo_documento_imovel
      WHERE id = $1
    `
    
    const result = await pool.query(query, [id])
    return result.rows[0] || null
  } catch (error) {
    console.error('Erro ao buscar tipo de documento por ID:', error)
    throw new Error('Erro ao buscar tipo de documento')
  }
}

// Criar novo tipo de documento
export async function createTipoDocumento(data: CreateTipoDocumentoData): Promise<TipoDocumento> {
  try {
    const query = `
      INSERT INTO tipo_documento_imovel (descricao, consulta_imovel_internauta)
      VALUES ($1, $2)
      RETURNING *
    `
    
    const result = await pool.query(query, [data.descricao, data.consulta_imovel_internauta])
    return result.rows[0]
  } catch (error) {
    console.error('Erro ao criar tipo de documento:', error)
    
    if (error instanceof Error && error.message.includes('duplicate key')) {
      throw new Error('Já existe um tipo de documento com esta descrição')
    }
    
    throw new Error('Erro ao criar tipo de documento')
  }
}

// Atualizar tipo de documento
export async function updateTipoDocumento(id: number, data: UpdateTipoDocumentoData): Promise<TipoDocumento> {
  try {
    const fields = []
    const values = []
    let paramCount = 1

    if (data.descricao !== undefined) {
      fields.push(`descricao = $${paramCount}`)
      values.push(data.descricao)
      paramCount++
    }

    if (data.consulta_imovel_internauta !== undefined) {
      fields.push(`consulta_imovel_internauta = $${paramCount}`)
      values.push(data.consulta_imovel_internauta)
      paramCount++
    }

    if (data.ativo !== undefined) {
      fields.push(`ativo = $${paramCount}`)
      values.push(data.ativo)
      paramCount++
    }

    if (fields.length === 0) {
      throw new Error('Nenhum campo para atualizar')
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`)
    values.push(id)

    const query = `
      UPDATE tipo_documento_imovel
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `

    const result = await pool.query(query, values)
    
    if (result.rows.length === 0) {
      throw new Error('Tipo de documento não encontrado')
    }

    return result.rows[0]
  } catch (error) {
    console.error('Erro ao atualizar tipo de documento:', error)
    
    if (error instanceof Error && error.message.includes('duplicate key')) {
      throw new Error('Já existe um tipo de documento com esta descrição')
    }
    
    throw new Error('Erro ao atualizar tipo de documento')
  }
}

// Excluir tipo de documento
export async function deleteTipoDocumento(id: number): Promise<boolean> {
  try {
    const query = `
      DELETE FROM tipo_documento_imovel
      WHERE id = $1
    `
    
    const result = await pool.query(query, [id])
    return result.rowCount > 0
  } catch (error) {
    console.error('Erro ao excluir tipo de documento:', error)
    
    if (error instanceof Error && error.message.includes('foreign key')) {
      throw new Error('Não é possível excluir este tipo de documento pois existem documentos associados')
    }
    
    throw new Error('Erro ao excluir tipo de documento')
  }
}

// Verificar se existe documento associado
export async function hasDocumentosAssociados(id: number): Promise<boolean> {
  try {
    const query = `
      SELECT COUNT(*) as count
      FROM imovel_documentos
      WHERE id_tipo_documento = $1
    `
    
    const result = await pool.query(query, [id])
    return parseInt(result.rows[0].count) > 0
  } catch (error) {
    console.error('Erro ao verificar documentos associados:', error)
    return false
  }
}
