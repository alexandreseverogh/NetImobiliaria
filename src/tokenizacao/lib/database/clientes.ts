/**
 * Funções de banco de dados para Clientes
 * Net Imobiliária - Sistema de Gestão de Clientes
 */

import pool from './connection'
import bcrypt from 'bcryptjs'

// ========================================
// INTERFACES E TIPOS
// ========================================

export interface Cliente {
  id: number
  nome: string
  cpf: string
  telefone: string
  endereco?: string
  numero?: string
  bairro?: string
  password: string
  email: string
  estado_fk?: string
  cidade_fk?: string
  cep?: string
  created_at: Date
  created_by?: string
  updated_at: Date
  updated_by?: string
}

export interface CreateClienteData {
  nome: string
  cpf: string
  telefone: string
  endereco?: string
  numero?: string
  bairro?: string
  password?: string
  email: string
  estado_fk?: string
  cidade_fk?: string
  cep?: string
  created_by?: string
}

export interface UpdateClienteData {
  nome?: string
  cpf?: string
  telefone?: string
  endereco?: string
  numero?: string
  bairro?: string
  password?: string
  email?: string
  estado_fk?: string
  cidade_fk?: string
  cep?: string
  updated_by?: string
}

// Interface para filtros
export interface ClienteFilters {
  nome?: string
  cpf?: string
  estado?: string
  cidade?: string
  bairro?: string
}

// ========================================
// FUNÇÕES DE VALIDAÇÃO
// ========================================

export function validateCPF(cpf: string): boolean {
  const cleanCPF = cpf.replace(/\D/g, '')
  
  if (cleanCPF.length !== 11) return false
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false
  
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i)
  }
  let remainder = sum % 11
  let firstDigit = remainder < 2 ? 0 : 11 - remainder
  
  if (parseInt(cleanCPF.charAt(9)) !== firstDigit) return false
  
  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i)
  }
  remainder = sum % 11
  let secondDigit = remainder < 2 ? 0 : 11 - remainder
  
  return parseInt(cleanCPF.charAt(10)) === secondDigit
}

export function formatCPF(value: string): string {
  const cleanValue = value.replace(/\D/g, '')
  return cleanValue.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

export function validateTelefone(telefone: string): boolean {
  const cleanTelefone = telefone.replace(/\D/g, '')
  return cleanTelefone.length === 10 || cleanTelefone.length === 11
}

export function formatTelefone(value: string): string {
  const cleanValue = value.replace(/\D/g, '')
  if (cleanValue.length <= 10) {
    return cleanValue.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  } else {
    return cleanValue.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  }
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function formatCEP(value: string): string {
  const cleanValue = value.replace(/\D/g, '')
  return cleanValue.replace(/(\d{5})(\d{3})/, '$1-$2')
}

// ========================================
// FUNÇÕES DE BANCO DE DADOS
// ========================================

/**
 * Buscar clientes com paginação e filtros
 */
export async function findClientesPaginated(
  page: number = 1, 
  limit: number = 10, 
  filters: ClienteFilters = {}
): Promise<{
  clientes: Cliente[]
  total: number
  totalPages: number
  currentPage: number
  hasNext: boolean
  hasPrev: boolean
}> {
  try {
    const offset = (page - 1) * limit
    
    // Construir cláusula WHERE dinamicamente
    const whereConditions: string[] = []
    const queryParams: any[] = []
    let paramCount = 0

    if (filters.nome) {
      paramCount++
      whereConditions.push(`nome ILIKE $${paramCount}`)
      queryParams.push(`%${filters.nome}%`)
    }

    if (filters.cpf) {
      paramCount++
      // Remover formatação do CPF para busca
      const cleanCPF = filters.cpf.replace(/\D/g, '')
      whereConditions.push(`REPLACE(REPLACE(cpf, '.', ''), '-', '') ILIKE $${paramCount}`)
      queryParams.push(`%${cleanCPF}%`)
    }

    if (filters.estado) {
      paramCount++
      // Buscar pelo nome do estado baseado no ID selecionado
      whereConditions.push(`estado_fk ILIKE $${paramCount}`)
      queryParams.push(`%${filters.estado}%`)
    }

    if (filters.cidade) {
      paramCount++
      // Buscar pelo nome da cidade baseado no ID selecionado
      whereConditions.push(`cidade_fk ILIKE $${paramCount}`)
      queryParams.push(`%${filters.cidade}%`)
    }

    if (filters.bairro) {
      paramCount++
      whereConditions.push(`bairro ILIKE $${paramCount}`)
      queryParams.push(`%${filters.bairro}%`)
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''
    
    // Query para contar total de clientes com filtros
    const countQuery = `
      SELECT COUNT(*) as total
      FROM clientes
      ${whereClause}
    `
    
    // Query para buscar clientes com paginação e filtros
    const dataQuery = `
      SELECT 
        id,
        nome,
        cpf,
        telefone,
        endereco,
        numero,
        bairro,
        password,
        email,
        estado_fk,
        cidade_fk,
        cep,
        created_at,
        created_by,
        updated_at,
        updated_by
      FROM clientes
      ${whereClause}
      ORDER BY nome
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `
    
    const countResult = await pool.query(countQuery, queryParams)
    const total = parseInt(countResult.rows[0].total)
    const totalPages = Math.ceil(total / limit)
    
    const dataResult = await pool.query(dataQuery, [...queryParams, limit, offset])
    
    return {
      clientes: dataResult.rows,
      total,
      totalPages,
      currentPage: page,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  } catch (error) {
    console.error('❌ Erro ao buscar clientes com paginação:', error)
    throw new Error('Erro ao buscar clientes com paginação')
  }
}

// Buscar cliente por ID
export async function findClienteById(id: number): Promise<Cliente | null> {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        nome,
        cpf,
        telefone,
        endereco,
        numero,
        bairro,
        password,
        email,
        estado_fk,
        cidade_fk,
        cep,
        created_at,
        created_by,
        updated_at,
        updated_by
      FROM clientes 
      WHERE id = $1
    `, [id])
    
    return result.rows[0] || null
  } catch (error) {
    console.error('❌ Erro ao buscar cliente por ID:', error)
    throw new Error('Erro ao buscar cliente por ID')
  }
}

// Criar cliente
export async function createCliente(data: CreateClienteData): Promise<Cliente> {
  try {
    // Validar CPF
    if (!validateCPF(data.cpf)) {
      throw new Error('CPF Inválido')
    }
    
    // Verificar se CPF já existe
    const existingCPF = await pool.query('SELECT id FROM clientes WHERE cpf = $1', [data.cpf])
    if (existingCPF.rows.length > 0) {
      throw new Error('CPF já cadastrado')
    }
    
    // Verificar se email já existe
    if (data.email) {
      const existingEmail = await pool.query('SELECT id FROM clientes WHERE email = $1', [data.email])
      if (existingEmail.rows.length > 0) {
        throw new Error('Email já cadastrado')
      }
    }
    
    // Hash da senha
    const hashedPassword = await bcrypt.hash(data.password || 'Net123456', 10)
    
    const result = await pool.query(`
      INSERT INTO clientes (
        nome, cpf, telefone, endereco, numero, bairro, 
        password, email, estado_fk, cidade_fk, cep, 
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      data.nome,
      data.cpf,
      data.telefone,
      data.endereco,
      data.numero,
      data.bairro,
      hashedPassword,
      data.email,
      data.estado_fk || null,
      data.cidade_fk || null,
      data.cep,
      data.created_by || 'system'
    ])
    
    return result.rows[0]
  } catch (error) {
    console.error('❌ Erro ao criar cliente:', error)
    throw error
  }
}

// Atualizar cliente
export async function updateCliente(id: number, data: UpdateClienteData): Promise<Cliente> {
  try {
    // Validar CPF se fornecido
    if (data.cpf && !validateCPF(data.cpf)) {
      throw new Error('CPF Inválido')
    }
    
    // Verificar se CPF já existe (excluindo o próprio registro)
    if (data.cpf) {
      const existingCPF = await pool.query('SELECT id FROM clientes WHERE cpf = $1 AND id != $2', [data.cpf, id])
      if (existingCPF.rows.length > 0) {
        throw new Error('CPF já cadastrado')
      }
    }
    
    // Verificar se email já existe (excluindo o próprio registro)
    if (data.email) {
      const existingEmail = await pool.query('SELECT id FROM clientes WHERE email = $1 AND id != $2', [data.email, id])
      if (existingEmail.rows.length > 0) {
        throw new Error('Email já cadastrado')
      }
    }
    
    // Construir query dinamicamente
    const fields: string[] = []
    const values: any[] = []
    let paramCount = 0
    
    if (data.nome !== undefined) {
      fields.push(`nome = $${++paramCount}`)
      values.push(data.nome)
    }
    
    if (data.cpf !== undefined) {
      fields.push(`cpf = $${++paramCount}`)
      values.push(data.cpf)
    }
    
    if (data.telefone !== undefined) {
      fields.push(`telefone = $${++paramCount}`)
      values.push(data.telefone)
    }
    
    if (data.endereco !== undefined) {
      fields.push(`endereco = $${++paramCount}`)
      values.push(data.endereco)
    }
    
    if (data.numero !== undefined) {
      fields.push(`numero = $${++paramCount}`)
      values.push(data.numero)
    }
    
    if (data.bairro !== undefined) {
      fields.push(`bairro = $${++paramCount}`)
      values.push(data.bairro)
    }
    
    if (data.email !== undefined) {
      fields.push(`email = $${++paramCount}`)
      values.push(data.email)
    }
    
    if (data.estado_fk !== undefined) {
      fields.push(`estado_fk = $${++paramCount}`)
      values.push(data.estado_fk || null)
    }
    
    if (data.cidade_fk !== undefined) {
      fields.push(`cidade_fk = $${++paramCount}`)
      values.push(data.cidade_fk || null)
    }
    
    if (data.cep !== undefined) {
      fields.push(`cep = $${++paramCount}`)
      values.push(data.cep)
    }
    
    if (data.password !== undefined) {
      const hashedPassword = await bcrypt.hash(data.password, 10)
      fields.push(`password = $${++paramCount}`)
      values.push(hashedPassword)
    }
    
    if (data.updated_by !== undefined) {
      fields.push(`updated_by = $${++paramCount}`)
      values.push(data.updated_by)
    }
    
    if (fields.length === 0) {
      throw new Error('Nenhum campo para atualizar')
    }
    
    const query = `
      UPDATE clientes 
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount + 1}
      RETURNING *
    `
    
    values.push(id)
    
    const result = await pool.query(query, values)
    
    if (result.rows.length === 0) {
      throw new Error('Cliente não encontrado')
    }
    
    return result.rows[0]
  } catch (error) {
    console.error('❌ Erro ao atualizar cliente:', error)
    throw error
  }
}

// Deletar cliente
export async function deleteCliente(id: number): Promise<void> {
  try {
    const result = await pool.query('DELETE FROM clientes WHERE id = $1', [id])
    
    if (result.rowCount === 0) {
      throw new Error('Cliente não encontrado')
    }
  } catch (error) {
    console.error('❌ Erro ao deletar cliente:', error)
    throw error
  }
}

// Verificar se CPF já existe
export async function checkCPFExists(cpf: string, excludeId?: number): Promise<boolean> {
  try {
    let query = 'SELECT id FROM clientes WHERE cpf = $1'
    const params: any[] = [cpf]
    
    if (excludeId) {
      query += ' AND id != $2'
      params.push(excludeId)
    }
    
    const result = await pool.query(query, params)
    return result.rows.length > 0
  } catch (error) {
    console.error('❌ Erro ao verificar CPF:', error)
    throw error
  }
}
