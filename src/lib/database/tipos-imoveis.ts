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

export async function findAllTiposImovel(tenantId?: string): Promise<TipoImovel[]> {
  try {
    const whereClause = tenantId ? 'WHERE tenant_id = $1' : ''
    const params = tenantId ? [tenantId] : []

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
      ${whereClause}
      ORDER BY nome
    `

    const result: QueryResult<TipoImovel> = await pool.query(query, params)

    return result.rows.map(tipo => ({
      ...tipo,
      status: tipo.ativo ? 'Ativo' : 'Inativo'
    }))
  } catch (error) {
    console.error('❌ Erro ao buscar tipos de imóveis:', error)
    throw error
  }
}

export async function findTipoImovelById(id: number, tenantId?: string): Promise<TipoImovel | null> {
  try {
    const whereClause = tenantId ? 'WHERE id = $1 AND tenant_id = $2' : 'WHERE id = $1'
    const params = tenantId ? [id, tenantId] : [id]

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
      ${whereClause}
    `

    const result: QueryResult<TipoImovel> = await pool.query(query, params)

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

export async function updateTipoImovel(id: number, tenantId: string | undefined, data: {
  nome?: string
  descricao?: string
  ativo?: boolean
}): Promise<TipoImovel | null> {
  try {
    let whereClause = 'WHERE id = $1'
    const values: any[] = [id, data.nome, data.descricao, data.ativo]
    if (tenantId) {
      whereClause += ' AND tenant_id = $5'
      values.push(tenantId)
    }

    const query = `
      UPDATE tipos_imovel
      SET
        nome = COALESCE($2, nome),
        descricao = COALESCE($3, descricao),
        ativo = COALESCE($4, ativo),
        updated_at = CURRENT_TIMESTAMP
      ${whereClause}
      RETURNING id, nome, descricao, ativo, tenant_id, created_at, updated_at
    `

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

export async function deleteTipoImovel(id: number, tenantId?: string): Promise<boolean> {
  try {
    // Verificar se há imóveis usando este tipo (com filtro de tenant quando aplicável)
    const checkWhereClause = tenantId ? 'WHERE tipo_fk = $1 AND tenant_id = $2' : 'WHERE tipo_fk = $1'
    const checkParams = tenantId ? [id, tenantId] : [id]
    const checkResult = await pool.query(`SELECT COUNT(*) as count FROM imoveis ${checkWhereClause}`, checkParams)
    const count = parseInt(checkResult.rows[0].count)

    if (count > 0) {
      throw new Error('Não é possível excluir tipo de imóvel que está sendo usado por imóveis')
    }

    const whereClause = tenantId ? 'WHERE id = $1 AND tenant_id = $2' : 'WHERE id = $1'
    const params = tenantId ? [id, tenantId] : [id]
    const result = await pool.query(`DELETE FROM tipos_imovel ${whereClause}`, params)
    return (result.rowCount || 0) > 0
  } catch (error) {
    console.error('❌ Erro ao excluir tipo de imóvel:', error)
    throw error
  }
}

export async function toggleTipoImovelStatus(id: number, tenantId?: string): Promise<TipoImovel | null> {
  try {
    const whereClause = tenantId ? 'WHERE id = $1 AND tenant_id = $2' : 'WHERE id = $1'
    const params = tenantId ? [id, tenantId] : [id]
    const query = `
      UPDATE tipos_imovel
      SET
        ativo = NOT ativo,
        updated_at = CURRENT_TIMESTAMP
      ${whereClause}
      RETURNING id, nome, descricao, ativo, tenant_id, created_at, updated_at
    `

    const result: QueryResult<TipoImovel> = await pool.query(query, params)
    
    if (result.rows.length === 0) {
      return null
    }
    
    return result.rows[0]
  } catch (error) {
    console.error('❌ Erro ao alterar status do tipo de imóvel:', error)
    throw error
  }
}








