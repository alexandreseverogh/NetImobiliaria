import pool from './connection'

export interface DocumentoImovel {
  id: number
  id_tipo_documento: number
  id_imovel: number
  documento: Buffer
  nome_arquivo: string
  tipo_mime: string
  tamanho_bytes: number
  created_at: string
  updated_at: string
}

export interface DocumentoImovelCompleto extends DocumentoImovel {
  tipo_documento_descricao: string
}

export interface CreateDocumentoImovelData {
  id_tipo_documento: number
  id_imovel: number
  documento: Buffer
  nome_arquivo: string
  tipo_mime: string
  tamanho_bytes: number
}

// Buscar documentos de um imóvel
export async function findDocumentosByImovel(imovelId: number): Promise<DocumentoImovelCompleto[]> {
  try {
    console.log('🔍 findDocumentosByImovel - Buscando documentos para imóvel:', imovelId)
    
    // Primeiro, vamos verificar se existem documentos para este imóvel
    const checkQuery = `
      SELECT COUNT(*) as count
      FROM imovel_documentos 
      WHERE id_imovel = $1
    `
    const checkResult = await pool.query(checkQuery, [imovelId])
    console.log('🔍 findDocumentosByImovel - Documentos encontrados (sem JOIN):', checkResult.rows[0].count)
    
    // Verificar se existem tipos de documentos
    const tiposQuery = `
      SELECT COUNT(*) as count
      FROM tipo_documento_imovel
    `
    const tiposResult = await pool.query(tiposQuery)
    console.log('🔍 findDocumentosByImovel - Tipos de documentos disponíveis:', tiposResult.rows[0].count)
    
    // Verificar se há problemas no JOIN
    const joinCheckQuery = `
      SELECT 
        di.id,
        di.id_tipo_documento,
        tdi.id as tipo_id,
        tdi.descricao as tipo_descricao,
        CASE 
          WHEN tdi.id IS NULL THEN 'JOIN_FALHOU'
          ELSE 'JOIN_OK'
        END as join_status
      FROM imovel_documentos di
      LEFT JOIN tipo_documento_imovel tdi ON di.id_tipo_documento = tdi.id
      WHERE di.id_imovel = $1
    `
    const joinResult = await pool.query(joinCheckQuery, [imovelId])
    console.log('🔍 findDocumentosByImovel - Verificação do JOIN:', joinResult.rows)
    
    const query = `
      SELECT 
        di.id,
        di.id_tipo_documento,
        di.id_imovel,
        di.documento,
        di.nome_arquivo,
        di.tipo_mime,
        di.tamanho_bytes,
        di.created_at,
        di.updated_at,
        COALESCE(tdi.descricao, 'Tipo não encontrado') as tipo_documento_descricao
      FROM imovel_documentos di
      LEFT JOIN tipo_documento_imovel tdi ON di.id_tipo_documento = tdi.id
      WHERE di.id_imovel = $1
      ORDER BY COALESCE(tdi.descricao, 'Tipo não encontrado'), di.created_at DESC
    `
    
    console.log('🔍 findDocumentosByImovel - Query:', query)
    console.log('🔍 findDocumentosByImovel - Parâmetros:', [imovelId])
    
    const result = await pool.query(query, [imovelId])
    
    console.log('🔍 findDocumentosByImovel - Resultado:', {
      rowCount: result.rowCount,
      rows: result.rows.length,
      data: result.rows
    })
    
    // Log detalhado de cada documento
    if (result.rows.length > 0) {
      result.rows.forEach((row, index) => {
        console.log(`🔍 findDocumentosByImovel - Documento ${index + 1}:`, {
          id: row.id,
          id_tipo_documento: row.id_tipo_documento,
          tipo_documento_descricao: row.tipo_documento_descricao,
          nome_arquivo: row.nome_arquivo,
          tipo_mime: row.tipo_mime
        })
      })
    }
    
    if (result.rows.length === 0) {
      console.log('⚠️ findDocumentosByImovel - Nenhum documento encontrado para imóvel:', imovelId)
    }
    
    return result.rows
  } catch (error) {
    console.error('Erro ao buscar documentos do imóvel:', error)
    throw new Error('Erro ao buscar documentos do imóvel')
  }
}

// Buscar documento por ID
export async function findDocumentoById(id: number): Promise<DocumentoImovelCompleto | null> {
  try {
    const query = `
      SELECT 
        di.id,
        di.id_tipo_documento,
        di.id_imovel,
        di.documento,
        di.nome_arquivo,
        di.tipo_mime,
        di.tamanho_bytes,
        di.created_at,
        di.updated_at,
        COALESCE(tdi.descricao, 'Tipo não encontrado') as tipo_documento_descricao
      FROM imovel_documentos di
      LEFT JOIN tipo_documento_imovel tdi ON di.id_tipo_documento = tdi.id
      WHERE di.id = $1
    `
    
    const result = await pool.query(query, [id])
    return result.rows[0] || null
  } catch (error) {
    console.error('Erro ao buscar documento por ID:', error)
    throw new Error('Erro ao buscar documento')
  }
}

// Criar novo documento
export async function createDocumentoImovel(data: CreateDocumentoImovelData): Promise<number> {
  try {
    console.log('🔍 createDocumentoImovel - Dados recebidos:', {
      id_tipo_documento: data.id_tipo_documento,
      id_imovel: data.id_imovel,
      nome_arquivo: data.nome_arquivo,
      tipo_mime: data.tipo_mime,
      tamanho_bytes: data.tamanho_bytes,
      documento_size: data.documento.length
    })
    
    // Buscar tenant_id do imóvel para manter o isolamento
    const imovelResult = await pool.query('SELECT tenant_id FROM imoveis WHERE id = $1', [data.id_imovel])
    const tenantId = imovelResult.rows[0]?.tenant_id

    const query = `
      INSERT INTO imovel_documentos (
        id_tipo_documento,
        id_imovel,
        documento,
        nome_arquivo,
        tipo_mime,
        tamanho_bytes,
        tenant_id,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id
    `
    
    console.log('🔍 createDocumentoImovel - Executando query:', query)
    console.log('🔍 createDocumentoImovel - Parâmetros:', [
      data.id_tipo_documento,
      data.id_imovel,
      'Buffer(' + data.documento.length + ' bytes)',
      data.nome_arquivo,
      data.tipo_mime,
      data.tamanho_bytes
    ])
    
    const result = await pool.query(query, [
      data.id_tipo_documento,
      data.id_imovel,
      data.documento,
      data.nome_arquivo,
      data.tipo_mime,
      data.tamanho_bytes,
      tenantId
    ])
    
    console.log('🔍 createDocumentoImovel - Resultado:', result.rows[0])
    return result.rows[0].id
  } catch (error) {
    console.error('❌ createDocumentoImovel - Erro ao criar documento:', error)
    throw new Error('Erro ao criar documento')
  }
}

// Atualizar documento
export async function updateDocumentoImovel(id: number, data: Partial<CreateDocumentoImovelData>): Promise<boolean> {
  try {
    const fields = []
    const values = []
    let paramCount = 1

    if (data.documento !== undefined) {
      fields.push(`documento = $${paramCount++}`)
      values.push(data.documento)
    }
    
    if (data.tipo_mime !== undefined) {
      fields.push(`tipo_mime = $${paramCount++}`)
      values.push(data.tipo_mime)
    }
    
    if (data.tamanho_bytes !== undefined) {
      fields.push(`tamanho_bytes = $${paramCount++}`)
      values.push(data.tamanho_bytes)
    }

    if (fields.length === 0) {
      return true // Nada para atualizar
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`)
    values.push(id)

    const query = `
      UPDATE imovel_documentos 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
    `
    
    const result = await pool.query(query, values)
    return (result.rowCount || 0) > 0
  } catch (error) {
    console.error('Erro ao atualizar documento:', error)
    throw new Error('Erro ao atualizar documento')
  }
}

// Excluir documento
export async function deleteDocumentoImovel(id: number): Promise<boolean> {
  try {
    const query = 'DELETE FROM imovel_documentos WHERE id = $1'
    const result = await pool.query(query, [id])
    return (result.rowCount || 0) > 0
  } catch (error) {
    console.error('Erro ao excluir documento:', error)
    throw new Error('Erro ao excluir documento')
  }
}

// Verificar se já existe documento do mesmo tipo para o imóvel
export async function hasDocumentoTipo(imovelId: number, tipoDocumentoId: number): Promise<boolean> {
  try {
    const query = `
      SELECT COUNT(*) as count
      FROM imovel_documentos
      WHERE id_imovel = $1 AND id_tipo_documento = $2
    `
    
    const result = await pool.query(query, [imovelId, tipoDocumentoId])
    return parseInt(result.rows[0].count) > 0
  } catch (error) {
    console.error('Erro ao verificar documento do tipo:', error)
    return false
  }
}

// Buscar tipos de documentos disponíveis para upload
export async function findTiposDocumentosDisponiveis(): Promise<Array<{id: number, descricao: string}>> {
  try {
    const query = `
      SELECT id, descricao
      FROM tipo_documento_imovel
      WHERE ativo = true
      ORDER BY descricao
    `
    
    const result = await pool.query(query)
    return result.rows
  } catch (error) {
    console.error('Erro ao buscar tipos de documentos disponíveis:', error)
    throw new Error('Erro ao buscar tipos de documentos')
  }
}

// Salvar múltiplos documentos de um imóvel (para uso no wizard)
export async function saveImovelDocumentos(
  imovelId: number, 
  documentos: Array<{
    tipo_documento_id: number
    arquivo: Buffer
    nome_arquivo: string
    tipo_mime: string
    tamanho_bytes: number
  }>
): Promise<boolean> {
  console.log('🔍 saveImovelDocumentos - Iniciando:', {
    imovelId,
    documentosCount: documentos.length
  })
  
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    console.log('🔍 saveImovelDocumentos - Transação iniciada')
    
    // Primeiro, remover documentos existentes do imóvel
    const deleteResult = await client.query('DELETE FROM imovel_documentos WHERE id_imovel = $1', [imovelId])
    console.log('🔍 saveImovelDocumentos - Documentos existentes removidos:', deleteResult.rowCount)
    
    // Inserir novos documentos
    // Buscar tenant_id do imóvel
    const imovelResult = await client.query('SELECT tenant_id FROM imoveis WHERE id = $1', [imovelId])
    const tenantId = imovelResult.rows[0]?.tenant_id

    let documentosInseridos = 0
    for (let i = 0; i < documentos.length; i++) {
      const doc = documentos[i]
      console.log(`🔍 saveImovelDocumentos - Inserindo documento ${i + 1}:`, {
        tipo_documento_id: doc.tipo_documento_id,
        id_imovel: imovelId,
        nome_arquivo: doc.nome_arquivo,
        tipo_mime: doc.tipo_mime,
        tamanho_bytes: doc.tamanho_bytes,
        arquivo_size: doc.arquivo.length
      })
      
      try {
        const insertResult = await client.query(`
          INSERT INTO imovel_documentos (
            id_tipo_documento,
            id_imovel,
            documento,
            nome_arquivo,
            tipo_mime,
            tamanho_bytes,
            tenant_id,
            created_at,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, [doc.tipo_documento_id, imovelId, doc.arquivo, doc.nome_arquivo, doc.tipo_mime, doc.tamanho_bytes, tenantId])
        
        console.log(`🔍 saveImovelDocumentos - Documento ${i + 1} inserido com sucesso:`, insertResult.rowCount)
        documentosInseridos++
      } catch (insertError) {
        console.error(`❌ saveImovelDocumentos - Erro ao inserir documento ${i + 1}:`, insertError)
        // Continuar com os próximos documentos mesmo se um falhar
      }
    }
    
    console.log(`🔍 saveImovelDocumentos - Total de documentos inseridos: ${documentosInseridos} de ${documentos.length}`)
    
    await client.query('COMMIT')
    console.log('🔍 saveImovelDocumentos - Transação commitada com sucesso')
    return true
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('🔍 saveImovelDocumentos - Erro na transação, fazendo rollback:', error)
    throw new Error('Erro ao salvar documentos do imóvel')
  } finally {
    client.release()
  }
}
