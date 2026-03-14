import pool from './connection'
import { logAuditEvent } from './audit'
import { findProprietarioByUuid } from './proprietarios'

export interface Imovel {
  id?: number
  codigo: string
  titulo: string
  descricao?: string
  tipo_fk: number
  finalidade_fk: number
  status_fk: number
  proprietario_uuid?: string | null
  corretor_fk?: string | null
  preco?: number
  preco_condominio?: number
  preco_iptu?: number
  taxa_extra?: number
  area_total?: number
  area_construida?: number
  quartos?: number
  banheiros?: number
  suites?: number
  vagas_garagem?: number
  varanda?: number
  endereco?: string
  numero?: string
  complemento?: string
  bairro?: string
  cidade_fk?: string
  estado_fk?: string
  cep?: string
  latitude?: number
  longitude?: number
  ano_construcao?: number
  andar?: number
  total_andares?: number
  mobiliado?: boolean
  aceita_permuta?: boolean
  aceita_financiamento?: boolean
  destaque?: boolean
  destaque_nacional?: boolean
  lancamento?: boolean
  ativo?: boolean
  origem_cadastro?: 'Publico' | 'Admin' | null
  created_by?: string | null
  updated_by?: string | null
  created_at?: Date
  updated_at?: Date
}

export interface ImovelCompleto extends Imovel {
  tipo_nome: string
  status_nome: string
  status_cor: string
  corretor_nome: string
  total_imagens: number
  tem_imagem_principal: number
}

export interface FiltroImovel {
  // Filtros principais (campos corretos do banco)
  id?: number           // Filtro por ID (campo codigo na tela)
  bairro?: string
  estado_fk?: number    // Chave estrangeira para estado
  estado_sigla?: string // Sigla do estado (AL, PE, PB, etc.)
  cidade_fk?: number    // Chave estrangeira para cidade
  cidade_nome?: string  // Nome da cidade (Recife, São Paulo, etc.)
  tipo_fk?: number      // Chave estrangeira para tipo
  finalidade_fk?: number // Chave estrangeira para finalidade
  status_fk?: number    // Chave estrangeira para status
  corretor_fk?: number  // Chave estrangeira para corretor
  proprietario_uuid?: string // UUID do proprietário

  // Filtros legados (manter compatibilidade)
  codigo?: string
  estado?: string
  municipio?: string
  tipo?: string
  finalidade?: string
  status?: string
  tipo_id?: number
  finalidade_id?: number
  status_id?: number
  corretor_id?: string
  preco_min?: number
  preco_max?: number
  quartos_min?: number
  area_min?: number
  area_max?: number
  quartos_max?: number
  banheiros_min?: number
  banheiros_max?: number
  suites_min?: number
  suites_max?: number
  vagas_min?: number
  vagas_max?: number
  endereco?: string
  cidade?: string
  destaque?: boolean
  ativo?: boolean
}

// Buscar imóvel por ID
export async function findImovelById(id: number): Promise<ImovelCompleto | null> {
  try {
    const query = `
      SELECT 
        i.*,
        ti.nome as tipo_nome,
        fi.nome as finalidade_nome,
        si.nome as status_nome,
        si.cor as status_cor,
        u.nome as corretor_nome
      FROM imoveis i
      LEFT JOIN tipos_imovel ti ON i.tipo_fk = ti.id
      LEFT JOIN finalidades_imovel fi ON i.finalidade_fk = fi.id
      LEFT JOIN status_imovel si ON i.status_fk = si.id
      LEFT JOIN users u ON i.created_by = u.id
      WHERE i.id = $1
    `
    const result = await pool.query(query, [id])
    return result.rows[0] || null
  } catch (error) {
    console.error('Erro ao buscar imóvel por ID:', error)
    throw error
  }
}

// Buscar imóvel por código ou ID
export async function findImovelByCodigo(codigo: string): Promise<ImovelCompleto | null> {
  try {
    // Verificar se o valor é numérico (ID) ou texto (código)
    const isNumeric = /^\d+$/.test(codigo)

    let query: string
    let params: any[]

    // Query customizada para incluir tipo_destaque da finalidade
    if (isNumeric) {
      // Buscar por ID
      query = `
        SELECT 
          ic.*,
          i.corretor_fk,
          fi.tipo_destaque as finalidade_tipo_destaque
        FROM imoveis_completos ic
        LEFT JOIN imoveis i ON ic.id = i.id
        LEFT JOIN finalidades_imovel fi ON ic.finalidade_fk = fi.id
        WHERE ic.id = $1
      `
      params = [parseInt(codigo)]
    } else {
      // Buscar por código
      query = `
        SELECT 
          ic.*,
          i.corretor_fk,
          fi.tipo_destaque as finalidade_tipo_destaque
        FROM imoveis_completos ic
        LEFT JOIN imoveis i ON ic.id = i.id
        LEFT JOIN finalidades_imovel fi ON ic.finalidade_fk = fi.id
        WHERE ic.codigo = $1
      `
      params = [codigo]
    }

    const result = await pool.query(query, params)
    return result.rows[0] || null
  } catch (error) {
    console.error('Erro ao buscar imóvel por código:', error)
    throw error
  }
}

export async function findImovelByIdentifier(identifier: number | string): Promise<ImovelCompleto | null> {
  if (typeof identifier === 'number') {
    return findImovelById(identifier)
  }

  const valor = identifier.trim()
  if (/^\d+$/.test(valor)) {
    return findImovelById(parseInt(valor, 10))
  }

  return findImovelByCodigo(valor)
}

// Buscar todos os imóveis ativos (para listagem simples)
export async function findAllImoveis(): Promise<ImovelCompleto[]> {
  try {
    const query = `
      SELECT 
        ic.*,
        p.nome as proprietario_nome
      FROM imoveis_completos ic
      LEFT JOIN imoveis i ON ic.id = i.id
      LEFT JOIN proprietarios p ON i.proprietario_uuid = p.uuid
      WHERE ic.ativo = true
      ORDER BY ic.created_at DESC
    `
    const result = await pool.query(query)
    return result.rows
  } catch (error) {
    console.error('❌ Erro ao buscar todos os imóveis:', error)
    throw new Error('Erro ao buscar imóveis')
  }
}

// Listar imóveis com filtros
export async function listImoveis(filtros: FiltroImovel = {}, limit = 50, offset = 0): Promise<ImovelCompleto[]> {
  try {
    console.log('🔍 listImoveis - Filtros recebidos:', filtros)

    let query = `
      SELECT 
        ic.*,
        p.nome as proprietario_nome
      FROM imoveis_completos ic
      LEFT JOIN imoveis i ON ic.id = i.id
      LEFT JOIN proprietarios p ON i.proprietario_uuid = p.uuid
      WHERE 1=1
    `
    const params: any[] = []
    let paramIndex = 1

    if (filtros.tipo_id) {
      query += ` AND ic.tipo_id = $${paramIndex}`
      params.push(filtros.tipo_id)
      paramIndex++
    }

    if (filtros.status_id) {
      query += ` AND ic.status_id = $${paramIndex}`
      params.push(filtros.status_id)
      paramIndex++
    }

    if (filtros.preco_min) {
      query += ` AND i.preco >= $${paramIndex}`
      params.push(filtros.preco_min)
      paramIndex++
    }

    if (filtros.preco_max) {
      query += ` AND i.preco <= $${paramIndex}`
      params.push(filtros.preco_max)
      paramIndex++
    }

    if (filtros.quartos_min) {
      query += ` AND i.quartos >= $${paramIndex}`
      params.push(filtros.quartos_min)
      paramIndex++
    }

    if (filtros.quartos_max) {
      query += ` AND i.quartos <= $${paramIndex}`
      params.push(filtros.quartos_max)
      paramIndex++
    }

    if (filtros.banheiros_min) {
      query += ` AND i.banheiros >= $${paramIndex}`
      params.push(filtros.banheiros_min)
      paramIndex++
    }

    if (filtros.banheiros_max) {
      query += ` AND i.banheiros <= $${paramIndex}`
      params.push(filtros.banheiros_max)
      paramIndex++
    }

    if (filtros.suites_min) {
      query += ` AND i.suites >= $${paramIndex}`
      params.push(filtros.suites_min)
      paramIndex++
    }

    if (filtros.suites_max) {
      query += ` AND i.suites <= $${paramIndex}`
      params.push(filtros.suites_max)
      paramIndex++
    }

    if (filtros.vagas_min) {
      query += ` AND i.vagas_garagem >= $${paramIndex}`
      params.push(filtros.vagas_min)
      paramIndex++
    }

    if (filtros.vagas_max) {
      query += ` AND i.vagas_garagem <= $${paramIndex}`
      params.push(filtros.vagas_max)
      paramIndex++
    }

    if (filtros.area_min) {
      query += ` AND i.area_total >= $${paramIndex}`
      params.push(filtros.area_min)
      paramIndex++
    }

    if (filtros.area_max) {
      query += ` AND i.area_total <= $${paramIndex}`
      params.push(filtros.area_max)
      paramIndex++
    }

    if (filtros.endereco) {
      // busca isolada em endereco e complemento usando ILIKE
      query += ` AND (i.endereco ILIKE $${paramIndex} OR i.complemento ILIKE $${paramIndex})`
      params.push(`%${filtros.endereco}%`)
      paramIndex++
    }

    if (filtros.cidade) {
      query += ` AND cidade_nome ILIKE $${paramIndex}`
      params.push(`%${filtros.cidade}%`)
      paramIndex++
    }

    if (filtros.bairro) {
      query += ` AND ic.bairro ILIKE $${paramIndex}`
      params.push(`%${filtros.bairro}%`)
      paramIndex++
    }

    // Filtros principais (campos corretos do banco)
    if (filtros.id) {
      query += ` AND ic.id = $${paramIndex}`
      params.push(filtros.id)
      paramIndex++
    }

    if (filtros.estado_fk) {
      query += ` AND i.estado_fk = $${paramIndex}`
      params.push(filtros.estado_fk)
      paramIndex++
    }

    if (filtros.estado_sigla) {
      query += ` AND i.estado_fk = $${paramIndex}`
      params.push(filtros.estado_sigla)
      paramIndex++
    }

    if (filtros.corretor_id) {
      query += ` AND i.corretor_fk = $${paramIndex}`
      params.push(filtros.corretor_id)
      paramIndex++
    }

    if (filtros.cidade_fk) {
      query += ` AND i.cidade_fk = $${paramIndex}`
      params.push(filtros.cidade_fk)
      paramIndex++
    }

    if (filtros.cidade_nome) {
      query += ` AND i.cidade_fk ILIKE $${paramIndex}`
      params.push(`%${filtros.cidade_nome}%`)
      paramIndex++
    }

    if (filtros.tipo_fk) {
      query += ` AND i.tipo_fk = $${paramIndex}`
      params.push(filtros.tipo_fk)
      paramIndex++
    }

    if (filtros.finalidade_fk) {
      query += ` AND i.finalidade_fk = $${paramIndex}`
      params.push(filtros.finalidade_fk)
      paramIndex++
    }

    if (filtros.status_fk) {
      query += ` AND i.status_fk = $${paramIndex}`
      params.push(filtros.status_fk)
      paramIndex++
    }

    if (filtros.corretor_fk) {
      query += ` AND i.corretor_fk = $${paramIndex}`
      params.push(filtros.corretor_fk)
      paramIndex++
    }

    if (filtros.proprietario_uuid) {
      query += ` AND i.proprietario_uuid = $${paramIndex}`
      params.push(filtros.proprietario_uuid)
      paramIndex++
    }

    // Filtros legados (manter compatibilidade)
    if (filtros.codigo) {
      query += ` AND i.codigo ILIKE $${paramIndex}`
      params.push(`%${filtros.codigo}%`)
      paramIndex++
    }

    if (filtros.estado) {
      query += ` AND ic.estado_nome = $${paramIndex}`
      params.push(filtros.estado)
      paramIndex++
    }

    if (filtros.municipio) {
      query += ` AND ic.cidade_nome = $${paramIndex}`
      params.push(filtros.municipio)
      paramIndex++
    }

    if (filtros.tipo) {
      query += ` AND ic.tipo_nome = $${paramIndex}`
      params.push(filtros.tipo)
      paramIndex++
    }

    if (filtros.finalidade) {
      query += ` AND ic.finalidade_nome = $${paramIndex}`
      params.push(filtros.finalidade)
      paramIndex++
    }

    if (filtros.status) {
      query += ` AND ic.status_nome = $${paramIndex}`
      params.push(filtros.status)
      paramIndex++
    }

    if (filtros.tipo_id) {
      query += ` AND i.tipo_fk = $${paramIndex}`
      params.push(filtros.tipo_id)
      paramIndex++
    }

    if (filtros.finalidade_id) {
      query += ` AND i.finalidade_fk = $${paramIndex}`
      params.push(filtros.finalidade_id)
      paramIndex++
    }

    if (filtros.status_id) {
      query += ` AND i.status_fk = $${paramIndex}`
      params.push(filtros.status_id)
      paramIndex++
    }

    query += ` ORDER BY ic.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    params.push(limit, offset)

    try {
      const fs = require('fs')
      const path = require('path')
      const debugLog = `
[${new Date().toISOString()}] listImoveis execution:
Filtros: ${JSON.stringify(filtros)}
Query: ${query}
Params: ${JSON.stringify(params)}
----------------------------------------
`
      fs.appendFileSync('C:/Users/Cliente/.gemini/antigravity/brain/50bc094b-2ad0-4f97-a117-3a5494d74325/debug_filter.txt', debugLog)
    } catch (e) {
      console.error('Error writing debug log', e)
    }

    try {
      const result = await pool.query(query, params)
      return result.rows
    } catch (queryError) {
      console.error('❌ Erro na execução da query SQL:', queryError)
      throw queryError
    }
  } catch (error) {
    console.error('❌ Erro ao listar imóveis:', error)
    console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'N/A')
    throw error
  }
}

// Criar novo imóvel
export async function createImovel(imovel: Imovel, userId: string | null): Promise<Imovel> {
  try {
    console.log('🔍 Dados recebidos para criar imóvel:', JSON.stringify(imovel, null, 2))
    console.log('🔍 UserId recebido:', userId)

    let proprietarioUuid: string | null = null

    const proprietarioIdentificador = imovel.proprietario_uuid
    if (
      proprietarioIdentificador !== undefined &&
      proprietarioIdentificador !== null &&
      `${proprietarioIdentificador}`.toString().trim() !== ''
    ) {
      const proprietario = await findProprietarioByUuid(`${proprietarioIdentificador}`)
      if (!proprietario) {
        throw new Error('Proprietário não encontrado para o imóvel')
      }
      proprietarioUuid = proprietario.uuid
      imovel.proprietario_uuid = proprietarioUuid
    }

    // Validar se status_fk existe e está ativo
    if (imovel.status_fk) {
      const statusCheck = await pool.query(
        'SELECT id, nome, ativo FROM status_imovel WHERE id = $1',
        [imovel.status_fk]
      )

      if (statusCheck.rows.length === 0) {
        throw new Error(`Status ${imovel.status_fk} não encontrado na tabela status_imovel`)
      }

      if (!statusCheck.rows[0].ativo) {
        throw new Error(`Status ${imovel.status_fk} (${statusCheck.rows[0].nome}) está inativo`)
      }

      console.log('✅ Status validado:', {
        id: statusCheck.rows[0].id,
        nome: statusCheck.rows[0].nome,
        ativo: statusCheck.rows[0].ativo
      })
    }

    const query = `
      INSERT INTO imoveis (
        codigo, titulo, descricao, tipo_fk, finalidade_fk, status_fk, proprietario_uuid, preco, preco_condominio, 
        preco_iptu, taxa_extra, area_total, area_construida, quartos, banheiros, suites, 
        vagas_garagem, varanda, endereco, numero, complemento, bairro, cidade_fk, estado_fk, cep, latitude, longitude,
        ano_construcao, andar, total_andares, mobiliado, aceita_permuta, 
        aceita_financiamento, destaque, lancamento, origem_cadastro, created_by, corretor_fk
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 
        $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, 
        $31, $32, $33, $34, $35, $36, $37, $38
      ) RETURNING *
    `

    const values = [
      imovel.codigo, imovel.titulo, imovel.descricao, imovel.tipo_fk, imovel.finalidade_fk, imovel.status_fk,
      proprietarioUuid,
      imovel.preco ?? 0, imovel.preco_condominio ?? 0, imovel.preco_iptu ?? 0, imovel.taxa_extra, imovel.area_total ?? 0,
      imovel.area_construida ?? 0, imovel.quartos ?? 0, imovel.banheiros ?? 0, imovel.suites ?? 0,
      imovel.vagas_garagem ?? 0, imovel.varanda, imovel.endereco, imovel.numero, imovel.complemento, imovel.bairro, imovel.cidade_fk,
      imovel.estado_fk, imovel.cep, imovel.latitude, imovel.longitude,
      imovel.ano_construcao, imovel.andar, imovel.total_andares, imovel.mobiliado,
      imovel.aceita_permuta, imovel.aceita_financiamento, imovel.destaque, imovel.lancamento || false,
      imovel.origem_cadastro || 'Admin', userId, imovel.corretor_fk ?? null
    ]

    console.log('🔍 Query SQL:', query)
    console.log('🔍 Valores a serem inseridos:', JSON.stringify(values, null, 2))

    const result = await pool.query(query, values)
    const novoImovel = result.rows[0]

    console.log('✅ Imóvel criado com sucesso:', JSON.stringify(novoImovel, null, 2))

    // Log de auditoria (apenas se userId não for null)
    if (userId) {
      try {
        await logAuditEvent({
          userId: userId.toString(),
          action: 'CREATE',
          resourceType: 'imoveis',
          resourceId: novoImovel.id?.toString() || null,
          details: `Imóvel criado: ${novoImovel.codigo} - ${novoImovel.titulo}`,
          ipAddress: '127.0.0.1'
        })
        console.log('✅ Log de auditoria criado com sucesso')
      } catch (auditError) {
        console.error('⚠️ Erro ao criar log de auditoria (não crítico):', auditError)
      }
    } else {
      console.log('⚠️ Log de auditoria ignorado - userId é null')
    }

    return novoImovel
  } catch (error) {
    console.error('Erro ao criar imóvel:', error)
    throw error
  }
}

// Atualizar imóvel
export async function updateImovel(id: number, imovel: Partial<Imovel>, userId: string): Promise<Imovel | null> {
  try {
    const imovelAtualizado: Partial<Imovel> = { ...imovel }

    if ('proprietario_uuid' in imovelAtualizado) {
      const identificador = imovelAtualizado.proprietario_uuid
      if (
        identificador === undefined ||
        identificador === null ||
        `${identificador}`.toString().trim() === ''
      ) {
        imovelAtualizado.proprietario_uuid = null
      } else {
        const proprietario = await findProprietarioByUuid(`${identificador}`)
        if (!proprietario) {
          throw new Error('Proprietário não encontrado para atualização do imóvel')
        }
        imovelAtualizado.proprietario_uuid = proprietario.uuid
      }
    }

    // Remover qualquer resquício de campo legado para evitar updates indevidos
    delete (imovelAtualizado as any).proprietario_fk

    // Garantir que campos numéricos nunca sejam null se fornecido
    const numericFields = ['suites', 'preco', 'preco_condominio', 'preco_iptu', 'area_total', 'area_construida', 'quartos', 'banheiros', 'vagas_garagem']
    numericFields.forEach(field => {
      if (field in imovelAtualizado && (imovelAtualizado[field as keyof Imovel] === null || imovelAtualizado[field as keyof Imovel] === undefined)) {
        ; (imovelAtualizado as any)[field] = 0
      }
    })

    const fields: string[] = []
    const values: any[] = []
    let paramIndex = 1

    // Construir query dinamicamente
    Object.entries(imovelAtualizado).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id' && key !== 'created_at' && key !== 'created_by') {
        fields.push(`${key} = $${paramIndex}`)
        values.push(value)
        paramIndex++
      }
    })

    if (fields.length === 0) {
      throw new Error('Nenhum campo para atualizar')
    }

    // Adicionar updated_by e updated_at
    fields.push(`updated_by = $${paramIndex}`)
    values.push(userId)
    paramIndex++

    // Adicionar WHERE e RETURNING
    fields.push(`updated_at = CURRENT_TIMESTAMP`)
    const query = `UPDATE imoveis SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`
    values.push(id)

    const result = await pool.query(query, values)
    const imovelAtualizadoResult = result.rows[0]

    if (imovelAtualizadoResult) {
      // Log de auditoria
      await logAuditEvent({
        userId: userId.toString(),
        action: 'UPDATE',
        resourceType: 'imoveis',
        resourceId: id.toString(),
        details: `Imóvel atualizado: ${imovelAtualizadoResult.codigo}`,
        ipAddress: '127.0.0.1'
      })
    }

    return imovelAtualizadoResult || null
  } catch (error) {
    console.error('Erro ao atualizar imóvel:', error)
    throw error
  }
}

// Desativar imóvel (soft delete)
export async function deactivateImovel(id: number, userId: string): Promise<boolean> {
  try {
    const query = `
      UPDATE imoveis 
      SET ativo = false, updated_by = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2
    `

    const result = await pool.query(query, [userId, id])

    if (result.rowCount && result.rowCount > 0) {
      // Log de auditoria
      await logAuditEvent({
        userId: userId.toString(),
        action: 'DELETE',
        resourceType: 'imoveis',
        resourceId: id.toString(),
        details: `Imóvel desativado`,
        ipAddress: '127.0.0.1'
      })
      return true
    }

    return false
  } catch (error) {
    console.error('Erro ao desativar imóvel:', error)
    throw error
  }
}

export async function restoreImovel(id: number, userId: string): Promise<boolean> {
  try {
    const query = `
      UPDATE imoveis
      SET ativo = true, updated_by = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `

    const result = await pool.query(query, [userId, id])

    if (result.rowCount && result.rowCount > 0) {
      await logAuditEvent({
        userId: userId.toString(),
        action: 'RESTORE',
        resourceType: 'imoveis',
        resourceId: id.toString(),
        details: 'Imóvel restaurado',
        ipAddress: '127.0.0.1'
      })
      return true
    }

    return false
  } catch (error) {
    console.error('Erro ao restaurar imóvel:', error)
    throw error
  }
}

// Buscar estatísticas de imóveis
export async function getImoveisStats(): Promise<any> {
  try {
    // Fallback: view estatisticas_imoveis seems missing, using direct counts
    const query = `
      SELECT 
        (SELECT COUNT(*) FROM imoveis WHERE ativo = true) as total_imoveis,
        (SELECT COUNT(*) FROM imoveis WHERE ativo = true AND destaque = true) as total_destaque,
        (SELECT COUNT(*) FROM imoveis WHERE ativo = true AND lancamento = true) as total_lancamento
    `
    const result = await pool.query(query)
    const row = result.rows[0] || {}

    return {
      total_imoveis: parseInt(row.total_imoveis || '0'),
      total_destaque: parseInt(row.total_destaque || '0'),
      total_lancamento: parseInt(row.total_lancamento || '0')
    }
  } catch (error) {
    console.error('Erro ao buscar estatísticas de imóveis:', error)
    // Return safe default to prevent crash
    return { total_imoveis: 0, total_destaque: 0, total_lancamento: 0 }
  }
}

// Listar tipos de imóvel
export async function listTiposImovel(): Promise<any[]> {
  try {
    const query = `SELECT * FROM tipos_imovel WHERE ativo = true ORDER BY nome`
    const result = await pool.query(query)
    return result.rows
  } catch (error) {
    console.error('Erro ao listar tipos de imóvel:', error)
    throw error
  }
}

// Listar status de imóvel
export async function listStatusImovel(): Promise<any[]> {
  try {
    const query = `SELECT * FROM status_imovel WHERE ativo = true ORDER BY nome`
    const result = await pool.query(query)
    return result.rows
  } catch (error) {
    console.error('Erro ao listar status de imóvel:', error)
    throw error
  }
}

// Buscar status de imóvel por ID
export async function findStatusImovelById(id: number): Promise<any | null> {
  try {
    const query = `SELECT * FROM status_imovel WHERE id = $1`
    const result = await pool.query(query, [id])
    return result.rows[0] || null
  } catch (error) {
    console.error('Erro ao buscar status de imóvel:', error)
    throw error
  }
}

// Atualizar status de imóvel
export async function updateStatusImovel(id: number, data: { nome: string; descricao?: string | null; ativo: boolean }): Promise<any> {
  try {
    const query = `
      UPDATE status_imovel 
      SET nome = $1, descricao = $2, ativo = $3, updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `
    const result = await pool.query(query, [data.nome, data.descricao, data.ativo, id])
    return result.rows[0]
  } catch (error) {
    console.error('Erro ao atualizar status de imóvel:', error)
    throw error
  }
}

// Excluir status de imóvel
export async function deleteStatusImovel(id: number): Promise<void> {
  try {
    const query = `DELETE FROM status_imovel WHERE id = $1`
    await pool.query(query, [id])
  } catch (error) {
    console.error('Erro ao excluir status de imóvel:', error)
    throw error
  }
}

// Buscar imóveis em destaque
export async function getImoveisDestaque(limit = 6): Promise<ImovelCompleto[]> {
  try {
    const query = `
      SELECT * FROM imoveis_completos 
      WHERE destaque = true AND ativo = true 
      ORDER BY created_at DESC 
      LIMIT $1
    `
    const result = await pool.query(query, [limit])
    return result.rows
  } catch (error) {
    console.error('Erro ao buscar imóveis em destaque:', error)
    throw error
  }
}

// ========================================
// FUNÇÕES PARA IMAGENS DOS IMÓVEIS
// ========================================

// Buscar todas as imagens de um imóvel
export async function findImovelImagens(imovelId: number) {
  try {
    const query = `
      SELECT 
        id,
        ordem,
        principal,
        tipo_mime,
        tamanho_bytes,
        hash_arquivo,
        NULL::text AS nome_arquivo,
        created_at
      FROM imovel_imagens 
      WHERE imovel_id = $1
      ORDER BY COALESCE(ordem, 999) ASC, id ASC
    `

    const result = await pool.query(query, [imovelId])

    // Converter para formato com URL e is_principal
    const imagens = result.rows.map(row => ({
      id: row.id,
      ordem: row.ordem,
      is_principal: row.principal, // Mapear 'principal' para 'is_principal'
      tipo_mime: row.tipo_mime,
      tamanho_bytes: row.tamanho_bytes,
      hash_arquivo: row.hash_arquivo, // Hash SHA-256 para deduplicação
      // URL apontando para a nova API de streaming
      url: `/api/public/imagens/${row.id}`,
      descricao: null,
      nome_arquivo: row.nome_arquivo ?? null,
      created_at: row.created_at
    }))

    return imagens
  } catch (error) {
    console.error('Erro ao buscar imagens do imóvel:', error)
    throw error
  }
}

// Buscar nomes das imagens de um imóvel (sem extensão)
export async function getImagesByImovelId(imovelId: number): Promise<string[]> {
  try {
    console.log('🔍 getImagesByImovelId - Buscando nomes das imagens para imóvel:', imovelId)

    const imagens = await findImovelImagens(imovelId)

    // Retorna array com todos os nomes dos arquivos sem extensão
    const nomesImagens = imagens.map(img => {
      // Se não houver nome_arquivo, usar o ID como nome
      const nomeArquivo = img.nome_arquivo || `imagem_${img.id}`
      // Remove a extensão do arquivo
      return nomeArquivo.split('.')[0]
    })

    console.log('🔍 getImagesByImovelId - Nomes das imagens encontrados:', nomesImagens)

    return nomesImagens
  } catch (error) {
    console.error('Erro ao buscar nomes das imagens do imóvel:', error)
    throw error
  }
}

// Buscar uma imagem específica
export async function findImovelImagem(imagemId: number) {
  try {
    console.log('🔍 findImovelImagem - Buscando imagem com ID:', imagemId)

    const query = `
      SELECT 
        id,
        imovel_id,
        ordem,
        principal,
        tipo_mime,
        tamanho_bytes,
        imagem,
        created_at
      FROM imovel_imagens 
      WHERE id = $1
    `

    const result = await pool.query(query, [imagemId])
    console.log('🔍 findImovelImagem - Query executada. Rows encontradas:', result.rows.length)
    console.log('🔍 findImovelImagem - Imagem encontrada:', result.rows[0] || 'null')

    return result.rows[0] || null
  } catch (error) {
    console.error('❌ findImovelImagem - Erro ao buscar imagem:', error)
    throw error
  }
}

// Inserir nova imagem
export async function insertImovelImagem(imagemData: {
  imovelId: number
  ordem: number
  principal: boolean
  tipoMime?: string
  tamanhoBytes?: number
  imagem: Buffer
  hashArquivo?: string // Hash SHA-256 para deduplicação
}) {
  try {
    const query = `
      INSERT INTO imovel_imagens (
        imovel_id, ordem, principal, tipo_mime, tamanho_bytes, imagem, hash_arquivo
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `

    const values = [
      imagemData.imovelId,
      imagemData.ordem,
      imagemData.principal,
      imagemData.tipoMime || null,
      imagemData.tamanhoBytes || null,
      imagemData.imagem,
      imagemData.hashArquivo || null
    ]

    const result = await pool.query(query, values)
    return result.rows[0].id
  } catch (error) {
    console.error('Erro ao inserir imagem:', error)
    throw error
  }
}

// Atualizar ordem das imagens
export async function updateImovelImagensOrdem(imovelId: number, imagens: Array<{ id: number, ordem: number }>) {
  try {
    // Usar transação para garantir consistência
    await pool.query('BEGIN')

    for (const imagem of imagens) {
      await pool.query(
        'UPDATE imovel_imagens SET ordem = $1 WHERE id = $2 AND imovel_id = $3',
        [imagem.ordem, imagem.id, imovelId]
      )
    }

    await pool.query('COMMIT')
    return true
  } catch (error) {
    await pool.query('ROLLBACK')
    console.error('Erro ao atualizar ordem das imagens:', error)
    throw error
  }
}

// Definir imagem como principal
export async function setImovelImagemPrincipal(imovelId: number, imagemId: number) {
  try {
    // Desmarcar todas as imagens como principais
    await pool.query(
      'UPDATE imovel_imagens SET principal = false WHERE imovel_id = $1',
      [imovelId]
    )

    // Marcar a imagem selecionada como principal
    const result = await pool.query(
      'UPDATE imovel_imagens SET principal = true WHERE id = $1 AND imovel_id = $2 RETURNING id',
      [imagemId, imovelId]
    )

    return result.rows[0] ? true : false
  } catch (error) {
    console.error('Erro ao definir imagem principal:', error)
    throw error
  }
}

// Excluir imagem (soft delete)
export async function deleteImovelImagem(imagemId: number) {
  try {
    const result = await pool.query(
      'UPDATE imovel_imagens SET principal = false WHERE id = $1 RETURNING id',
      [imagemId]
    )

    return result.rows[0] ? true : false
  } catch (error) {
    console.error('Erro ao excluir imagem:', error)
    throw error
  }
}

// Excluir imagem permanentemente
export async function deleteImovelImagemPermanente(imagemId: number) {
  try {
    console.log('🔍 deleteImovelImagemPermanente - Deletando imagem ID:', imagemId)

    const result = await pool.query(
      'DELETE FROM imovel_imagens WHERE id = $1 RETURNING id',
      [imagemId]
    )

    console.log('🔍 deleteImovelImagemPermanente - Query executada. Rows affected:', result.rowCount, 'Rows returned:', result.rows.length)
    console.log('🔍 deleteImovelImagemPermanente - Rows:', result.rows)

    const success = result.rows[0] ? true : false
    console.log('🔍 deleteImovelImagemPermanente - Resultado final:', success)

    return success
  } catch (error) {
    console.error('❌ deleteImovelImagemPermanente - Erro ao excluir imagem permanentemente:', error)
    throw error
  }
}

// Contar imagens de um imóvel
export async function countImovelImagens(imovelId: number) {
  try {
    const result = await pool.query(
      'SELECT COUNT(*) as total FROM imovel_imagens WHERE imovel_id = $1',
      [imovelId]
    )

    return parseInt(result.rows[0].total)
  } catch (error) {
    console.error('Erro ao contar imagens do imóvel:', error)
    throw error
  }
}
