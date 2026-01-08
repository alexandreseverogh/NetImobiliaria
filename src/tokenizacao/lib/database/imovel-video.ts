/* eslint-disable */
// FunÃ§Ãµes para gerenciar vÃ­deos dos imÃ³veis
// Conforme especificado no PLANEJAMENTO_VIDEOS_STEP5.md

import pool from './connection'
import { ImovelVideo, VideoMetadata } from '@/lib/types/video'

// Buscar vÃ­deo de um imÃ³vel
export async function findImovelVideo(imovelId: number): Promise<ImovelVideo | null> {
  try {
    console.log('ðŸ” findImovelVideo - Buscando vÃ­deo para imÃ³vel:', imovelId)
    
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
      console.log('ðŸ” findImovelVideo - Nenhum vÃ­deo encontrado para imÃ³vel:', imovelId)
      return null
    }
    
    console.log('ðŸ” findImovelVideo - VÃ­deo encontrado:', {
      id: result.rows[0].id,
      nome_arquivo: result.rows[0].nome_arquivo,
      tamanho_bytes: result.rows[0].tamanho_bytes,
      duracao_segundos: result.rows[0].duracao_segundos
    })
    
    return result.rows[0]
  } catch (error) {
    console.error('âŒ Erro ao buscar vÃ­deo do imÃ³vel:', error)
    throw new Error('Erro ao buscar vÃ­deo do imÃ³vel')
  }
}

// Buscar metadados do vÃ­deo (sem o conteÃºdo binÃ¡rio)
export async function findImovelVideoMetadata(imovelId: number): Promise<VideoMetadata | null> {
  try {
    console.log('ðŸ” findImovelVideoMetadata - Buscando metadados para imÃ³vel:', imovelId)
    
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
    
    if (result.rows.length === 0) {
      return null
    }
    
    return result.rows[0]
  } catch (error) {
    console.error('âŒ Erro ao buscar metadados do vÃ­deo:', error)
    throw new Error('Erro ao buscar metadados do vÃ­deo')
  }
}

// Criar novo vÃ­deo para imÃ³vel
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
    console.log('ðŸ” createImovelVideo - Criando vÃ­deo para imÃ³vel:', data.imovel_id)
    
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
    console.log('ðŸ” createImovelVideo - VÃ­deo criado com ID:', videoId)
    
    return videoId
  } catch (error) {
    console.error('âŒ Erro ao criar vÃ­deo do imÃ³vel:', error)
    throw new Error('Erro ao criar vÃ­deo do imÃ³vel')
  }
}

// Atualizar vÃ­deo existente
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
    console.log('ðŸ” updateImovelVideo - Atualizando vÃ­deo:', videoId)
    
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
    
    console.log('ðŸ” updateImovelVideo - VÃ­deo atualizado:', result.rowCount > 0)
    return result.rowCount > 0
  } catch (error) {
    console.error('âŒ Erro ao atualizar vÃ­deo do imÃ³vel:', error)
    throw new Error('Erro ao atualizar vÃ­deo do imÃ³vel')
  }
}

// Remover vÃ­deo (soft delete)
export async function deleteImovelVideo(videoId: number): Promise<boolean> {
  try {
    console.log('ðŸ” deleteImovelVideo - Removendo vÃ­deo:', videoId)
    
    const query = `
      UPDATE imovel_video 
      SET ativo = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND ativo = true
    `
    
    const result = await pool.query(query, [videoId])
    
    console.log('ðŸ” deleteImovelVideo - VÃ­deo removido:', result.rowCount > 0)
    return result.rowCount > 0
  } catch (error) {
    console.error('âŒ Erro ao remover vÃ­deo do imÃ³vel:', error)
    throw new Error('Erro ao remover vÃ­deo do imÃ³vel')
  }
}

// Remover vÃ­deo por imÃ³vel (soft delete)
export async function deleteImovelVideoByImovel(imovelId: number): Promise<boolean> {
  try {
    console.log('ðŸ” deleteImovelVideoByImovel - Removendo vÃ­deo do imÃ³vel:', imovelId)
    
    const query = `
      UPDATE imovel_video 
      SET ativo = false, updated_at = CURRENT_TIMESTAMP
      WHERE imovel_id = $1 AND ativo = true
    `
    
    const result = await pool.query(query, [imovelId])
    
    console.log('ðŸ” deleteImovelVideoByImovel - VÃ­deo removido:', result.rowCount > 0)
    return result.rowCount > 0
  } catch (error) {
    console.error('âŒ Erro ao remover vÃ­deo do imÃ³vel:', error)
    throw new Error('Erro ao remover vÃ­deo do imÃ³vel')
  }
}

// Salvar/atualizar vÃ­deo de um imÃ³vel (substitui vÃ­deo existente)
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
  console.log('ðŸ” saveImovelVideo - Salvando vÃ­deo para imÃ³vel:', imovelId)
  
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    console.log('ðŸ” saveImovelVideo - TransaÃ§Ã£o iniciada')
    
    // Primeiro, remover vÃ­deo existente do imÃ³vel (soft delete)
    const deleteResult = await client.query(
      'UPDATE imovel_video SET ativo = false, updated_at = CURRENT_TIMESTAMP WHERE imovel_id = $1 AND ativo = true',
      [imovelId]
    )
    console.log('ðŸ” saveImovelVideo - VÃ­deo existente removido:', deleteResult.rowCount)
    
    // Inserir novo vÃ­deo
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
    console.log('ðŸ” saveImovelVideo - Novo vÃ­deo inserido com ID:', videoId)
    
    await client.query('COMMIT')
    console.log('ðŸ” saveImovelVideo - TransaÃ§Ã£o commitada com sucesso')
    
    return videoId
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('âŒ saveImovelVideo - Erro na transaÃ§Ã£o, rollback executado:', error)
    throw new Error('Erro ao salvar vÃ­deo do imÃ³vel')
  } finally {
    client.release()
  }
}

