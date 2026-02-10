/* eslint-disable */
// @ts-nocheck
import pool from './connection'
import { logAuditEvent } from './audit'

export interface Imovel {
  id?: number
  codigo: string
  titulo: string
  descricao?: string
  tipo_fk: number
  finalidade_fk: number
  status_fk: number
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
  ativo?: boolean
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
  cidade_nome?: string  // Nome da cidade (Recife, SÃ£o Paulo, etc.)
  tipo_fk?: number      // Chave estrangeira para tipo
  finalidade_fk?: number // Chave estrangeira para finalidade
  status_fk?: number    // Chave estrangeira para status

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
    console.error('Erro ao buscar imÃ³vel por ID:', error)
    throw error
  }
}

// Buscar imÃ³vel por cÃ³digo
export async function findImovelByCodigo(codigo: string): Promise<ImovelCompleto | null> {
  try {
    const query = `
      SELECT * FROM imoveis_completos 
      WHERE codigo = $1
    `
    const result = await pool.query(query, [codigo])
    return result.rows[0] || null
  } catch (error) {
    console.error('Erro ao buscar imÃ³vel por cÃ³digo:', error)
    throw error
  }
}

// Buscar todos os imÃ³veis ativos (para listagem simples)
export async function findAllImoveis(): Promise<ImovelCompleto[]> {
  try {
    const query = `
      SELECT * FROM imoveis_completos 
      WHERE ativo = true
      ORDER BY created_at DESC
    `
    const result = await pool.query(query)
    return result.rows
  } catch (error) {
    console.error('âŒ Erro ao buscar todos os imÃ³veis:', error)
    throw new Error('Erro ao buscar imÃ³veis')
  }
}

// Listar imÃ³veis com filtros
export async function listImoveis(filtros: FiltroImovel = {}, limit = 50, offset = 0): Promise<ImovelCompleto[]> {
  try {
    console.log('ðŸ” listImoveis - Filtros recebidos:', filtros)

    let query = `
      SELECT * FROM imoveis_completos
      WHERE 1=1
    `
    const params: any[] = []
    let paramIndex = 1

    if (filtros.tipo_id) {
      query += ` AND tipo_id = $${paramIndex}`
      params.push(filtros.tipo_id)
      paramIndex++
    }

    if (filtros.status_id) {
      query += ` AND status_id = $${paramIndex}`
      params.push(filtros.status_id)
      paramIndex++
    }

    if (filtros.preco_min) {
      query += ` AND preco >= $${paramIndex}`
      params.push(filtros.preco_min)
      paramIndex++
    }

    if (filtros.preco_max) {
      query += ` AND preco <= $${paramIndex}`
      params.push(filtros.preco_max)
      paramIndex++
    }

    if (filtros.quartos_min) {
      query += ` AND quartos >= $${paramIndex}`
      params.push(filtros.quartos_min)
      paramIndex++
    }

    if (filtros.area_min) {
      query += ` AND area_total >= $${paramIndex}`
      params.push(filtros.area_min)
      paramIndex++
    }

    if (filtros.cidade) {
      query += ` AND cidade_nome ILIKE $${paramIndex}`
      params.push(`%${filtros.cidade}%`)
      paramIndex++
    }

    if (filtros.bairro) {
      query += ` AND bairro ILIKE $${paramIndex}`
      params.push(`%${filtros.bairro}%`)
      paramIndex++
    }

    // Filtros principais (campos corretos do banco)
    if (filtros.id) {
      query += ` AND id = $${paramIndex}`
      params.push(filtros.id)
      paramIndex++
    }

    if (filtros.estado_fk) {
      query += ` AND estado_fk = $${paramIndex}`
      params.push(filtros.estado_fk)
      paramIndex++
    }

    if (filtros.estado_sigla) {
      query += ` AND estado_fk = $${paramIndex}`
      params.push(filtros.estado_sigla)
      paramIndex++
    }

    if (filtros.cidade_fk) {
      query += ` AND cidade_fk = $${paramIndex}`
      params.push(filtros.cidade_fk)
      paramIndex++
    }

    if (filtros.cidade_nome) {
      query += ` AND cidade_fk = $${paramIndex}`
      params.push(filtros.cidade_nome)
      paramIndex++
    }

    if (filtros.tipo_fk) {
      query += ` AND tipo_fk = $${paramIndex}`
      params.push(filtros.tipo_fk)
      paramIndex++
    }

    if (filtros.finalidade_fk) {
      query += ` AND finalidade_fk = $${paramIndex}`
      params.push(filtros.finalidade_fk)
      paramIndex++
    }

    if (filtros.status_fk) {
      query += ` AND status_fk = $${paramIndex}`
      params.push(filtros.status_fk)
      paramIndex++
    }

    // Filtros legados (manter compatibilidade)
    if (filtros.codigo) {
      query += ` AND codigo ILIKE $${paramIndex}`
      params.push(`%${filtros.codigo}%`)
      paramIndex++
    }

    if (filtros.estado) {
      query += ` AND estado_nome = $${paramIndex}`
      params.push(filtros.estado)
      paramIndex++
    }

    if (filtros.municipio) {
      query += ` AND cidade_nome = $${paramIndex}`
      params.push(filtros.municipio)
      paramIndex++
    }

    if (filtros.tipo) {
      query += ` AND tipo_nome = $${paramIndex}`
      params.push(filtros.tipo)
      paramIndex++
    }

    if (filtros.finalidade) {
      query += ` AND finalidade_nome = $${paramIndex}`
      params.push(filtros.finalidade)
      paramIndex++
    }

    if (filtros.status) {
      query += ` AND status_nome = $${paramIndex}`
      params.push(filtros.status)
      paramIndex++
    }

    if (filtros.tipo_id) {
      query += ` AND tipo_fk = $${paramIndex}`
      params.push(filtros.tipo_id)
      paramIndex++
    }

    if (filtros.finalidade_id) {
      query += ` AND finalidade_fk = $${paramIndex}`
      params.push(filtros.finalidade_id)
      paramIndex++
    }

    if (filtros.status_id) {
      query += ` AND status_fk = $${paramIndex}`
      params.push(filtros.status_id)
      paramIndex++
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    params.push(limit, offset)

    console.log('ðŸ” listImoveis - Query final:', query)
    console.log('ðŸ” listImoveis - ParÃ¢metros:', params)

    const result = await pool.query(query, params)
    console.log('ðŸ” listImoveis - Resultados encontrados:', result.rows.length)
    return result.rows
  } catch (error) {
    console.error('Erro ao listar imÃ³veis:', error)
    throw error
  }
}

// Criar novo imÃ³vel
export async function createImovel(imovel: Imovel, userId: string | null): Promise<Imovel> {
  try {
    console.log('ðŸ” Dados recebidos para criar imÃ³vel:', JSON.stringify(imovel, null, 2))
    console.log('ðŸ” UserId recebido:', userId)

    const query = `
      INSERT INTO imoveis (
        codigo, titulo, descricao, tipo_fk, finalidade_fk, status_fk, preco, preco_condominio, 
        preco_iptu, taxa_extra, area_total, area_construida, quartos, banheiros, suites, 
        vagas_garagem, varanda, endereco, numero, complemento, bairro, cidade_fk, estado_fk, cep, latitude, longitude,
        ano_construcao, andar, total_andares, mobiliado, aceita_permuta, 
        aceita_financiamento, destaque, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 
        $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, 
        $31, $32, $33, $34
      ) RETURNING *
    `

    const values = [
      imovel.codigo, imovel.titulo, imovel.descricao, imovel.tipo_fk, imovel.finalidade_fk, imovel.status_fk,
      imovel.preco, imovel.preco_condominio, imovel.preco_iptu, imovel.taxa_extra, imovel.area_total,
      imovel.area_construida, imovel.quartos, imovel.banheiros, imovel.suites,
      imovel.vagas_garagem, imovel.varanda, imovel.endereco, imovel.numero, imovel.complemento, imovel.bairro, imovel.cidade_fk,
      imovel.estado_fk, imovel.cep, imovel.latitude, imovel.longitude,
      imovel.ano_construcao, imovel.andar, imovel.total_andares, imovel.mobiliado,
      imovel.aceita_permuta, imovel.aceita_financiamento, imovel.destaque, userId
    ]

    console.log('ðŸ” Query SQL:', query)
    console.log('ðŸ” Valores a serem inseridos:', JSON.stringify(values, null, 2))

    const result = await pool.query(query, values)
    const novoImovel = result.rows[0]

    console.log('âœ… ImÃ³vel criado com sucesso:', JSON.stringify(novoImovel, null, 2))

    // Log de auditoria (apenas se userId nÃ£o for null)
    if (userId) {
      try {
        await logAuditEvent({
          userId: userId.toString(),
          action: 'CREATE',
          resourceType: 'imoveis',
          resourceId: novoImovel.id?.toString() || null,
          details: `ImÃ³vel criado: ${novoImovel.codigo} - ${novoImovel.titulo}`,
          ipAddress: '127.0.0.1'
        })
        console.log('âœ… Log de auditoria criado com sucesso')
      } catch (auditError) {
        console.error('âš ï¸ Erro ao criar log de auditoria (nÃ£o crÃ­tico):', auditError)
      }
    } else {
      console.log('âš ï¸ Log de auditoria ignorado - userId Ã© null')
    }

    return novoImovel
  } catch (error) {
    console.error('Erro ao criar imÃ³vel:', error)
    throw error
  }
}

// Atualizar imÃ³vel
export async function updateImovel(id: number, imovel: Partial<Imovel>, userId: string): Promise<Imovel | null> {
  try {
    const fields: string[] = []
    const values: any[] = []
    let paramIndex = 1

    // Construir query dinamicamente
    Object.entries(imovel).forEach(([key, value]) => {
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
    const imovelAtualizado = result.rows[0]

    if (imovelAtualizado) {
      // Log de auditoria
      await logAuditEvent({
        userId: userId.toString(),
        action: 'UPDATE',
        resourceType: 'imoveis',
        resourceId: id.toString(),
        details: `ImÃ³vel atualizado: ${imovelAtualizado.codigo}`,
        ipAddress: '127.0.0.1'
      })
    }

    return imovelAtualizado || null
  } catch (error) {
    console.error('Erro ao atualizar imÃ³vel:', error)
    throw error
  }
}

// Desativar imÃ³vel (soft delete)
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
        details: `ImÃ³vel desativado`,
        ipAddress: '127.0.0.1'
      })
      return true
    }

    return false
  } catch (error) {
    console.error('Erro ao desativar imÃ³vel:', error)
    throw error
  }
}

// Buscar estatÃ­sticas de imÃ³veis
export async function getImoveisStats(): Promise<any> {
  try {
    const query = `SELECT * FROM estatisticas_imoveis`
    const result = await pool.query(query)
    return result.rows[0] || {}
  } catch (error) {
    console.error('Erro ao buscar estatÃ­sticas de imÃ³veis:', error)
    throw error
  }
}

// Listar tipos de imÃ³vel
export async function listTiposImovel(): Promise<any[]> {
  try {
    const query = `SELECT * FROM tipos_imovel WHERE ativo = true ORDER BY nome`
    const result = await pool.query(query)
    return result.rows
  } catch (error) {
    console.error('Erro ao listar tipos de imÃ³vel:', error)
    throw error
  }
}

// Listar status de imÃ³vel
export async function listStatusImovel(): Promise<any[]> {
  try {
    const query = `SELECT * FROM status_imovel WHERE ativo = true ORDER BY nome`
    const result = await pool.query(query)
    return result.rows
  } catch (error) {
    console.error('Erro ao listar status de imÃ³vel:', error)
    throw error
  }
}

// Buscar status de imÃ³vel por ID
export async function findStatusImovelById(id: number): Promise<any | null> {
  try {
    const query = `SELECT * FROM status_imovel WHERE id = $1`
    const result = await pool.query(query, [id])
    return result.rows[0] || null
  } catch (error) {
    console.error('Erro ao buscar status de imÃ³vel:', error)
    throw error
  }
}

// Atualizar status de imÃ³vel
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
    console.error('Erro ao atualizar status de imÃ³vel:', error)
    throw error
  }
}

// Excluir status de imÃ³vel
export async function deleteStatusImovel(id: number): Promise<void> {
  try {
    const query = `DELETE FROM status_imovel WHERE id = $1`
    await pool.query(query, [id])
  } catch (error) {
    console.error('Erro ao excluir status de imÃ³vel:', error)
    throw error
  }
}

// Buscar imÃ³veis em destaque
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
    console.error('Erro ao buscar imÃ³veis em destaque:', error)
    throw error
  }
}

// ========================================
// FUNÃ‡Ã•ES PARA IMAGENS DOS IMÃ“VEIS
/**
 * FunÃ§Ãµes de banco de dados para ImÃ³veis
 */

// Buscar todas as imagens de um imÃ³vel
export async function findImovelImagens(imovelId: number) {
  try {
    console.log('ðŸ” findImovelImagens - Buscando imagens para imÃ³vel:', imovelId)

    const query = `
      SELECT 
        id,
        ordem,
        principal,
        tipo_mime,
        tamanho_bytes,
        imagem,
        created_at
      FROM imovel_imagens 
      WHERE imovel_id = $1
      ORDER BY COALESCE(ordem, 999) ASC, id ASC
    `

    console.log('ðŸ” findImovelImagens - Query:', query)
    console.log('ðŸ” findImovelImagens - ParÃ¢metros:', [imovelId])

    const result = await pool.query(query, [imovelId])

    console.log('ðŸ” findImovelImagens - Resultado:', {
      rowCount: result.rowCount,
      rows: result.rows.length,
      data: result.rows
    })

    return result.rows
  } catch (error) {
    console.error('Erro ao buscar imagens do imÃ³vel:', error)
    throw error
  }
}

// Buscar uma imagem especÃ­fica
export async function findImovelImagem(imagemId: number) {
  try {
    console.log('ðŸ” findImovelImagem - Buscando imagem com ID:', imagemId)

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
    console.log('ðŸ” findImovelImagem - Query executada. Rows encontradas:', result.rows.length)
    console.log('ðŸ” findImovelImagem - Imagem encontrada:', result.rows[0] || 'null')

    return result.rows[0] || null
  } catch (error) {
    console.error('âŒ findImovelImagem - Erro ao buscar imagem:', error)
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
}) {
  try {
    // Se esta imagem serÃ¡ principal, desmarcar outras como principais
    if (imagemData.principal) {
      await pool.query(
        'UPDATE imovel_imagens SET principal = false WHERE imovel_id = $1',
        [imagemData.imovelId]
      )
    }

    const query = `
      INSERT INTO imovel_imagens (
        imovel_id, ordem, principal, tipo_mime, tamanho_bytes, imagem
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `

    const values = [
      imagemData.imovelId,
      imagemData.ordem,
      imagemData.principal,
      imagemData.tipoMime || null,
      imagemData.tamanhoBytes || null,
      imagemData.imagem
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
    // Usar transaÃ§Ã£o para garantir consistÃªncia
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
    console.log('ðŸ” deleteImovelImagemPermanente - Deletando imagem ID:', imagemId)

    const result = await pool.query(
      'DELETE FROM imovel_imagens WHERE id = $1 RETURNING id',
      [imagemId]
    )

    console.log('ðŸ” deleteImovelImagemPermanente - Query executada. Rows affected:', result.rowCount, 'Rows returned:', result.rows.length)
    console.log('ðŸ” deleteImovelImagemPermanente - Rows:', result.rows)

    const success = result.rows[0] ? true : false
    console.log('ðŸ” deleteImovelImagemPermanente - Resultado final:', success)

    return success
  } catch (error) {
    console.error('âŒ deleteImovelImagemPermanente - Erro ao excluir imagem permanentemente:', error)
    throw error
  }
}

// Contar imagens de um imÃ³vel
export async function countImovelImagens(imovelId: number) {
  try {
    const result = await pool.query(
      'SELECT COUNT(*) as total FROM imovel_imagens WHERE imovel_id = $1',
      [imovelId]
    )

    return parseInt(result.rows[0].total)
  } catch (error) {
    console.error('Erro ao contar imagens do imÃ³vel:', error)
    throw error
  }
}

