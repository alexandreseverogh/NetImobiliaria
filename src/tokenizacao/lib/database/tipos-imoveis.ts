/* eslint-disable */
/**
 * FunÃ§Ãµes de banco de dados para Tipos de ImÃ³veis
 * Net ImobiliÃ¡ria - Sistema de GestÃ£o de Tipos de ImÃ³veis
 */

import pool from './connection'
import { QueryResult } from 'pg'

// ========================================
// INTERFACES E TIPOS
// ========================================

export interface TipoImovel {
  id: number
  nome: string
  descricao?: string
  ativo: boolean
  created_at: string
  updated_at: string
}

// ========================================
// FUNÃ‡Ã•ES DE CONSULTA
// ========================================

export async function findAllTiposImovel(): Promise<TipoImovel[]> {
  try {
    const query = `
      SELECT 
        id,
        nome,
        descricao,
        ativo,
        created_at,
        updated_at
      FROM tipos_imovel
      ORDER BY nome
    `

    const result: QueryResult<TipoImovel> = await pool.query(query)

    return result.rows.map(tipo => ({
      ...tipo,
      status: tipo.ativo ? 'Ativo' : 'Inativo'
    }))
  } catch (error) {
    console.error('âŒ Erro ao buscar tipos de imÃ³veis:', error)
    throw error
  }
}

export async function findTipoImovelById(id: number): Promise<TipoImovel | null> {
  try {
    const query = `
      SELECT 
        id,
        nome,
        descricao,
        ativo,
        created_at,
        updated_at
      FROM tipos_imovel
      WHERE id = $1
    `

    const result: QueryResult<TipoImovel> = await pool.query(query, [id])

    if (result.rows.length === 0) {
      return null
    }

    return result.rows[0]
  } catch (error) {
    console.error('âŒ Erro ao buscar tipo de imÃ³vel por ID:', error)
    throw error
  }
}

// ========================================
// FUNÃ‡Ã•ES DE CRIAÃ‡ÃƒO E EDIÃ‡ÃƒO
// ========================================

export async function createTipoImovel(data: {
  nome: string
  descricao?: string
  ativo?: boolean
}): Promise<TipoImovel> {
  try {
    const query = `
      INSERT INTO tipos_imovel (nome, descricao, ativo)
      VALUES ($1, $2, $3)
      RETURNING id, nome, descricao, ativo, created_at, updated_at
    `

    const values = [data.nome, data.descricao || '', data.ativo !== false]
    const result: QueryResult<TipoImovel> = await pool.query(query, values)

    return result.rows[0]
  } catch (error) {
    console.error('âŒ Erro ao criar tipo de imÃ³vel:', error)
    throw error
  }
}

export async function updateTipoImovel(id: number, data: {
  nome?: string
  descricao?: string
  ativo?: boolean
}): Promise<TipoImovel | null> {
  try {
    const query = `
      UPDATE tipos_imovel
      SET 
        nome = COALESCE($2, nome),
        descricao = COALESCE($3, descricao),
        ativo = COALESCE($4, ativo),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, nome, descricao, ativo, created_at, updated_at
    `

    const values = [id, data.nome, data.descricao, data.ativo]
    const result: QueryResult<TipoImovel> = await pool.query(query, values)

    if (result.rows.length === 0) {
      return null
    }

    return result.rows[0]
  } catch (error) {
    console.error('âŒ Erro ao atualizar tipo de imÃ³vel:', error)
    throw error
  }
}

export async function deleteTipoImovel(id: number): Promise<boolean> {
  try {
    // Verificar se hÃ¡ imÃ³veis usando este tipo
    const checkQuery = `
      SELECT COUNT(*) as count
      FROM imoveis
      WHERE tipo_id = $1
    `

    const checkResult = await pool.query(checkQuery, [id])
    const count = parseInt(checkResult.rows[0].count)

    if (count > 0) {
      throw new Error('NÃ£o Ã© possÃ­vel excluir tipo de imÃ³vel que estÃ¡ sendo usado por imÃ³veis')
    }

    const query = `
      DELETE FROM tipos_imovel
      WHERE id = $1
    `

    const result = await pool.query(query, [id])
    return (result.rowCount ?? 0) > 0
  } catch (error) {
    console.error('âŒ Erro ao excluir tipo de imÃ³vel:', error)
    throw error
  }
}

export async function toggleTipoImovelStatus(id: number): Promise<TipoImovel | null> {
  try {
    const query = `
      UPDATE tipos_imovel
      SET 
        ativo = NOT ativo,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, nome, descricao, ativo, created_at, updated_at
    `

    const result: QueryResult<TipoImovel> = await pool.query(query, [id])

    if (result.rows.length === 0) {
      return null
    }

    return result.rows[0]
  } catch (error) {
    console.error('âŒ Erro ao alterar status do tipo de imÃ³vel:', error)
    throw error
  }
}






