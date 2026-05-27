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
  tenant_id: string
  created_at: string
  updated_at: string
}

// ========================================
// FUNÇÕES DE CONSULTA
// ========================================

export async function findAllTiposImovel(tenantId: string = '00000000-0000-0000-0000-000000000001'): Promise<TipoImovel[]> {
  try {
    const query = `
      SELECT 
        id,
        nome,
        descricao,
        ativo,
        tenant_id,
        created_at,
        updated_at
      FROM tipos_imovel
      WHERE tenant_id = $1
      ORDER BY nome
    `
    
    const result: QueryResult<TipoImovel> = await pool.query(query, [tenantId])
    
    return result.rows.map(tipo => ({
      ...tipo,
      status: tipo.ativo ? 'Ativo' : 'Inativo'
    }))
  } catch (error) {
    console.error('❌ Erro ao buscar tipos de imóveis:', error)
    throw error
  }
}

export async function findTipoImovelById(id: number, tenantId: string = '00000000-0000-0000-0000-000000000001'): Promise<TipoImovel | null> {
  try {
    const query = `
      SELECT 
        id,
        nome,
        descricao,
        ativo,
        tenant_id,
        created_at,
        updated_at
      FROM tipos_imovel
      WHERE id = $1 AND tenant_id = $2
    `
    
    const result: QueryResult<TipoImovel> = await pool.query(query, [id, tenantId])
    
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
  tenant_id: string
}): Promise<TipoImovel> {
  try {
    const query = `
      INSERT INTO tipos_imovel (nome, descricao, ativo, tenant_id)
      VALUES ($1, $2, $3, $4)
      RETURNING id, nome, descricao, ativo, tenant_id, created_at, updated_at
    `
    
    const values = [data.nome, data.descricao || '', data.ativo !== false, data.tenant_id]
    const result: QueryResult<TipoImovel> = await pool.query(query, values)
    
    return result.rows[0]
  } catch (error) {
    console.error('❌ Erro ao criar tipo de imóvel:', error)
    throw error
  }
}

export async function updateTipoImovel(id: number, tenantId: string, data: {
  nome?: string
  descricao?: string
  ativo?: boolean
}): Promise<TipoImovel | null> {
  try {
    const query = `
      UPDATE tipos_imovel
      SET 
        nome = COALESCE($3, nome),
        descricao = COALESCE($4, descricao),
        ativo = COALESCE($5, ativo),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND tenant_id = $2
      RETURNING id, nome, descricao, ativo, tenant_id, created_at, updated_at
    `
    
    const values = [id, tenantId, data.nome, data.descricao, data.ativo]
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

export async function deleteTipoImovel(id: number, tenantId: string): Promise<boolean> {
  try {
    // Verificar se há imóveis usando este tipo (com filtro de tenant)
    const checkQuery = `
      SELECT COUNT(*) as count
      FROM imoveis
      WHERE tipo_fk = $1 AND tenant_id = $2
    `
    
    const checkResult = await pool.query(checkQuery, [id, tenantId])
    const count = parseInt(checkResult.rows[0].count)
    
    if (count > 0) {
      throw new Error('Não é possível excluir tipo de imóvel que está sendo usado por imóveis')
    }
    
    const query = `
      DELETE FROM tipos_imovel
      WHERE id = $1 AND tenant_id = $2
    `
    
    const result = await pool.query(query, [id, tenantId])
    return (result.rowCount || 0) > 0
  } catch (error) {
    console.error('❌ Erro ao excluir tipo de imóvel:', error)
    throw error
  }
}

export async function toggleTipoImovelStatus(id: number, tenantId: string): Promise<TipoImovel | null> {
  try {
    const query = `
      UPDATE tipos_imovel
      SET 
        ativo = NOT ativo,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND tenant_id = $2
      RETURNING id, nome, descricao, ativo, tenant_id, created_at, updated_at
    `
    
    const result: QueryResult<TipoImovel> = await pool.query(query, [id, tenantId])
    
    if (result.rows.length === 0) {
      return null
    }
    
    return result.rows[0]
  } catch (error) {
    console.error('❌ Erro ao alterar status do tipo de imóvel:', error)
    throw error
  }
}








