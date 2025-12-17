/**
 * Funções de banco de dados para Tipos de Imóveis
 * Net Imobiliária - Sistema de Gestão de Tipos de Imóveis
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
// FUNÇÕES DE CONSULTA
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
    console.error('❌ Erro ao buscar tipos de imóveis:', error)
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
    console.error('❌ Erro ao buscar tipo de imóvel por ID:', error)
    throw error
  }
}

// ========================================
// FUNÇÕES DE CRIAÇÃO E EDIÇÃO
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
    console.error('❌ Erro ao criar tipo de imóvel:', error)
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
    console.error('❌ Erro ao atualizar tipo de imóvel:', error)
    throw error
  }
}

export async function deleteTipoImovel(id: number): Promise<boolean> {
  try {
    // Verificar se há imóveis usando este tipo
    const checkQuery = `
      SELECT COUNT(*) as count
      FROM imoveis
      WHERE tipo_id = $1
    `
    
    const checkResult = await pool.query(checkQuery, [id])
    const count = parseInt(checkResult.rows[0].count)
    
    if (count > 0) {
      throw new Error('Não é possível excluir tipo de imóvel que está sendo usado por imóveis')
    }
    
    const query = `
      DELETE FROM tipos_imovel
      WHERE id = $1
    `
    
    const result = await pool.query(query, [id])
    return result.rowCount > 0
  } catch (error) {
    console.error('❌ Erro ao excluir tipo de imóvel:', error)
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
    console.error('❌ Erro ao alterar status do tipo de imóvel:', error)
    throw error
  }
}





