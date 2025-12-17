// Funções para gerenciar vídeos dos imóveis
// Conforme especificado no PLANEJAMENTO_VIDEOS_STEP5.md

import pool from './connection'
import { ImovelVideo, VideoMetadata } from '@/lib/types/video'

// Buscar vídeo de um imóvel (APENAS METADADOS - SEM BUFFER)
export async function findImovelVideo(imovelId: number): Promise<ImovelVideo | null> {
  try {
    console.log('🔍 findImovelVideo - Buscando METADADOS do vídeo para imóvel:', imovelId)
    
    // OTIMIZADO: Não carregar o campo 'video' (Buffer pesado)
    const query = `
      SELECT 
        id,
        imovel_id,
        nome_arquivo,
        tipo_mime,
        tamanho_bytes,
        duracao_segundos,
        resolucao,
        formato,
        ativo,
        created_at,
        updated_at
      FROM imovel_video 
      WHERE imovel_id = $1 AND ativo = true
    `
    
    const result = await pool.query(query, [imovelId])
    
    if (result.rows.length === 0) {
      console.log('🔍 findImovelVideo - Nenhum vídeo encontrado para imóvel:', imovelId)
      return null
    }
    
    console.log('✅ findImovelVideo - Metadados carregados (SEM buffer):', {
      id: result.rows[0].id,
      nome_arquivo: result.rows[0].nome_arquivo,
      tamanho_bytes: result.rows[0].tamanho_bytes,
      duracao_segundos: result.rows[0].duracao_segundos
    })
    
    return result.rows[0]
  } catch (error) {
    console.error('❌ Erro ao buscar vídeo do imóvel:', error)
    throw new Error('Erro ao buscar vídeo do imóvel')
  }
}

// Buscar vídeo COM BUFFER (para página pública de reprodução)
export async function findImovelVideoWithBuffer(imovelId: number): Promise<ImovelVideo | null> {
  try {
    console.log('🔍 findImovelVideoWithBuffer - Buscando vídeo COMPLETO para imóvel:', imovelId)
    
    const query = `
      SELECT 
        id,
        imovel_id,
        video,
        nome_arquivo,
        tipo_mime,
        tamanho_bytes,
        duracao_segundos,
        resolucao,
        formato,
        ativo,
        created_at,
        updated_at
      FROM imovel_video 
      WHERE imovel_id = $1 AND ativo = true
    `
    
    const result = await pool.query(query, [imovelId])
    
    if (result.rows.length === 0) {
      console.log('🔍 findImovelVideoWithBuffer - Nenhum vídeo encontrado')
      return null
    }
    
    console.log('✅ findImovelVideoWithBuffer - Vídeo encontrado com buffer:', {
      id: result.rows[0].id,
      tamanho_bytes: result.rows[0].tamanho_bytes,
      tem_buffer: !!result.rows[0].video
    })
    
    return result.rows[0]
  } catch (error) {
    console.error('❌ Erro ao buscar vídeo completo:', error)
    throw error
  }
}

// Buscar metadados do vídeo (sem o conteúdo binário)
export async function findImovelVideoMetadata(imovelId: number): Promise<VideoMetadata | null> {
  try {
    console.log('🔍 findImovelVideoMetadata - Buscando metadados para imóvel:', imovelId)
    
    const query = `
      SELECT 
        id,
        imovel_id,
        nome_arquivo,
        tipo_mime,
        tamanho_bytes,
        duracao_segundos,
        resolucao,
        formato,
        created_at,
        updated_at
      FROM imovel_video 
      WHERE imovel_id = $1 AND ativo = true
    `
    
    const result = await pool.query(query, [imovelId])
    
    console.log('🔍 findImovelVideoMetadata - Resultado da query:', {
      imovelId,
      rowCount: result.rowCount,
      rows: result.rows
    })
    
    if (result.rows.length === 0) {
      console.log('🔍 findImovelVideoMetadata - Nenhum vídeo encontrado para imóvel:', imovelId)
      return null
    }
    
    console.log('🔍 findImovelVideoMetadata - Vídeo encontrado:', result.rows[0])
    return result.rows[0]
  } catch (error) {
    console.error('❌ Erro ao buscar metadados do vídeo:', error)
    throw new Error('Erro ao buscar metadados do vídeo')
  }
}

// Criar novo vídeo para imóvel
export async function createImovelVideo(data: {
  imovel_id: number
  video: Buffer
  nome_arquivo: string
  tipo_mime: string
  tamanho_bytes: number
  duracao_segundos: number
  resolucao?: string
  formato: string
}): Promise<number> {
  try {
    console.log('🔍 createImovelVideo - Criando vídeo para imóvel:', data.imovel_id)
    
    const query = `
      INSERT INTO imovel_video (
        imovel_id,
        video,
        nome_arquivo,
        tipo_mime,
        tamanho_bytes,
        duracao_segundos,
        resolucao,
        formato,
        ativo,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id
    `
    
    const result = await pool.query(query, [
      data.imovel_id,
      data.video,
      data.nome_arquivo,
      data.tipo_mime,
      data.tamanho_bytes,
      data.duracao_segundos,
      data.resolucao,
      data.formato
    ])
    
    const videoId = result.rows[0].id
    console.log('🔍 createImovelVideo - Vídeo criado com ID:', videoId)
    
    return videoId
  } catch (error) {
    console.error('❌ Erro ao criar vídeo do imóvel:', error)
    throw new Error('Erro ao criar vídeo do imóvel')
  }
}

// Atualizar vídeo existente
export async function updateImovelVideo(videoId: number, data: Partial<{
  video: Buffer
  nome_arquivo: string
  tipo_mime: string
  tamanho_bytes: number
  duracao_segundos: number
  resolucao?: string
  formato: string
}>): Promise<boolean> {
  try {
    console.log('🔍 updateImovelVideo - Atualizando vídeo:', videoId)
    
    const fields = []
    const values = []
    let paramCount = 1
    
    if (data.video !== undefined) {
      fields.push(`video = $${paramCount++}`)
      values.push(data.video)
    }
    if (data.nome_arquivo !== undefined) {
      fields.push(`nome_arquivo = $${paramCount++}`)
      values.push(data.nome_arquivo)
    }
    if (data.tipo_mime !== undefined) {
      fields.push(`tipo_mime = $${paramCount++}`)
      values.push(data.tipo_mime)
    }
    if (data.tamanho_bytes !== undefined) {
      fields.push(`tamanho_bytes = $${paramCount++}`)
      values.push(data.tamanho_bytes)
    }
    if (data.duracao_segundos !== undefined) {
      fields.push(`duracao_segundos = $${paramCount++}`)
      values.push(data.duracao_segundos)
    }
    if (data.resolucao !== undefined) {
      fields.push(`resolucao = $${paramCount++}`)
      values.push(data.resolucao)
    }
    if (data.formato !== undefined) {
      fields.push(`formato = $${paramCount++}`)
      values.push(data.formato)
    }
    
    fields.push(`updated_at = CURRENT_TIMESTAMP`)
    values.push(videoId)
    
    const query = `
      UPDATE imovel_video 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount} AND ativo = true
    `
    
    const result = await pool.query(query, values)
    
    console.log('🔍 updateImovelVideo - Vídeo atualizado:', (result.rowCount || 0) > 0)
    return (result.rowCount || 0) > 0
  } catch (error) {
    console.error('❌ Erro ao atualizar vídeo do imóvel:', error)
    throw new Error('Erro ao atualizar vídeo do imóvel')
  }
}

// Remover vídeo (soft delete)
export async function deleteImovelVideo(videoId: number): Promise<boolean> {
  try {
    console.log('🔍 deleteImovelVideo - Removendo vídeo:', videoId)
    
    const query = `
      UPDATE imovel_video 
      SET ativo = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND ativo = true
    `
    
    const result = await pool.query(query, [videoId])
    
    console.log('🔍 deleteImovelVideo - Vídeo removido:', (result.rowCount || 0) > 0)
    return (result.rowCount || 0) > 0
  } catch (error) {
    console.error('❌ Erro ao remover vídeo do imóvel:', error)
    throw new Error('Erro ao remover vídeo do imóvel')
  }
}

// Remover vídeo por imóvel (hard delete)
export async function deleteImovelVideoByImovel(imovelId: number): Promise<boolean> {
  try {
    console.log('🔍 deleteImovelVideoByImovel - Removendo vídeo do imóvel:', imovelId)
    
    const query = `
      DELETE FROM imovel_video 
      WHERE imovel_id = $1 AND ativo = true
    `
    
    const result = await pool.query(query, [imovelId])
    
    console.log('🔍 deleteImovelVideoByImovel - Vídeo deletado:', (result.rowCount || 0) > 0)
    return (result.rowCount || 0) > 0
  } catch (error) {
    console.error('❌ Erro ao remover vídeo do imóvel:', error)
    throw new Error('Erro ao remover vídeo do imóvel')
  }
}

// Salvar/atualizar vídeo de um imóvel (substitui vídeo existente)
export async function saveImovelVideo(
  imovelId: number, 
  videoData: {
    video: Buffer
    nome_arquivo: string
    tipo_mime: string
    tamanho_bytes: number
    duracao_segundos: number
    resolucao?: string
    formato: string
  }
): Promise<number> {
  console.log('🔍 saveImovelVideo - Salvando vídeo para imóvel:', imovelId)
  
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    console.log('🔍 saveImovelVideo - Transação iniciada')
    
    // Primeiro, remover vídeo existente do imóvel (soft delete)
    const deleteResult = await client.query(
      'UPDATE imovel_video SET ativo = false, updated_at = CURRENT_TIMESTAMP WHERE imovel_id = $1 AND ativo = true',
      [imovelId]
    )
    console.log('🔍 saveImovelVideo - Vídeo existente removido:', deleteResult.rowCount)
    
    // Inserir novo vídeo
    const insertQuery = `
      INSERT INTO imovel_video (
        imovel_id,
        video,
        nome_arquivo,
        tipo_mime,
        tamanho_bytes,
        duracao_segundos,
        resolucao,
        formato,
        ativo,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id
    `
    
    const insertResult = await client.query(insertQuery, [
      imovelId,
      videoData.video,
      videoData.nome_arquivo,
      videoData.tipo_mime,
      videoData.tamanho_bytes,
      videoData.duracao_segundos,
      videoData.resolucao,
      videoData.formato
    ])
    
    const videoId = insertResult.rows[0].id
    console.log('🔍 saveImovelVideo - Novo vídeo inserido com ID:', videoId)
    
    await client.query('COMMIT')
    console.log('🔍 saveImovelVideo - Transação commitada com sucesso')
    
    return videoId
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('❌ saveImovelVideo - Erro na transação, rollback executado:', error)
    throw new Error('Erro ao salvar vídeo do imóvel')
  } finally {
    client.release()
  }
}
