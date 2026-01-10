/**
 * Funções de banco de dados para Proprietários
 * Net Imobiliária - Sistema de Gestão de Proprietários
 */

import pool from './connection'
import bcrypt from 'bcryptjs'

// ========================================
// INTERFACES E TIPOS
// ========================================

export interface Proprietario {
  uuid: string
  nome: string
  cpf: string
  telefone: string
  endereco?: string
  numero?: string
  bairro?: string
  complemento?: string
  password: string
  email: string
  estado_fk?: string
  cidade_fk?: string
  cep?: string
  origem_cadastro?: string
  corretor_fk?: string | null
  corretor_nome?: string | null
  created_at: Date
  created_by?: string
  updated_at: Date
  updated_by?: string
}

export interface CreateProprietarioData {
  nome: string
  cpf: string
  telefone: string
  endereco?: string
  numero?: string
  bairro?: string
  complemento?: string
  password?: string
  email: string
  estado_fk?: string
  cidade_fk?: string
  cep?: string
  origem_cadastro?: string
  corretor_fk?: string | null
  created_by?: string
}

export interface UpdateProprietarioData {
  nome?: string
  cpf?: string
  telefone?: string
  endereco?: string
  numero?: string
  bairro?: string
  complemento?: string
  password?: string
  email?: string
  estado_fk?: string
  cidade_fk?: string
  cep?: string
  updated_by?: string
}

// Interface para filtros
export interface ProprietarioFilters {
  nome?: string
  cpf?: string
  estado?: string
  cidade?: string
  bairro?: string
  corretor_fk?: string
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
 * Buscar proprietários com paginação e filtros
 */
export async function findProprietariosPaginated(
  page: number = 1,
  limit: number = 10,
  filters: ProprietarioFilters = {}
): Promise<{
  proprietarios: Proprietario[]
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
      whereConditions.push(`p.nome ILIKE $${paramCount}`)
      queryParams.push(`%${filters.nome}%`)
    }

    if (filters.cpf) {
      paramCount++
      // Remover formatação do CPF para busca
      const cleanCPF = filters.cpf.replace(/\D/g, '')
      whereConditions.push(`REPLACE(REPLACE(p.cpf, '.', ''), '-', '') ILIKE $${paramCount}`)
      queryParams.push(`%${cleanCPF}%`)
    }

    if (filters.estado) {
      paramCount++
      whereConditions.push(`p.estado_fk ILIKE $${paramCount}`)
      queryParams.push(`%${filters.estado}%`)
    }

    if (filters.cidade) {
      paramCount++
      whereConditions.push(`p.cidade_fk ILIKE $${paramCount}`)
      queryParams.push(`%${filters.cidade}%`)
    }

    if (filters.bairro) {
      paramCount++
      whereConditions.push(`p.bairro ILIKE $${paramCount}`)
      queryParams.push(`%${filters.bairro}%`)
    }

    if (filters.corretor_fk) {
      paramCount++
      whereConditions.push(`p.corretor_fk = $${paramCount}`)
      queryParams.push(filters.corretor_fk)
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''

    // Query para contar total de proprietários com filtros
    const countQuery = `
      SELECT COUNT(*) as total
      FROM proprietarios p
      ${whereClause}
    `

    // Query para buscar proprietários com paginação e filtros
    const dataQuery = `
      SELECT 
        p.uuid,
        p.nome,
        p.cpf,
        p.telefone,
        p.endereco,
        p.numero,
        p.bairro,
        p.complemento,
        p.password,
        p.email,
        p.estado_fk,
        p.cidade_fk,
        p.cep,
        p.corretor_fk,
        ucor.nome AS corretor_nome,
        p.created_at,
        p.created_by,
        p.updated_at,
        p.updated_by
      FROM proprietarios p
      LEFT JOIN users ucor ON ucor.id = p.corretor_fk
      ${whereClause}
      ORDER BY p.nome
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `

    const countResult = await pool.query(countQuery, queryParams)
    const total = parseInt(countResult.rows[0].total)
    const totalPages = Math.ceil(total / limit)

    const dataResult = await pool.query(dataQuery, [...queryParams, limit, offset])

    return {
      proprietarios: dataResult.rows,
      total,
      totalPages,
      currentPage: page,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  } catch (error) {
    console.error('❌ Erro ao buscar proprietários com paginação:', error)
    throw new Error('Erro ao buscar proprietários com paginação')
  }
}

// Buscar proprietário por UUID
export async function findProprietarioByUuid(uuid: string): Promise<Proprietario | null> {
  try {
    const result = await pool.query(
      `
        SELECT 
          p.uuid,
          p.nome,
          p.cpf,
          p.telefone,
          p.endereco,
          p.numero,
          p.bairro,
          p.complemento,
          p.password,
          p.email,
          p.estado_fk,
          p.cidade_fk,
          p.cep,
          p.origem_cadastro,
          p.corretor_fk,
          ucor.nome AS corretor_nome,
          p.created_at,
          p.created_by,
          p.updated_at,
          p.updated_by
        FROM proprietarios p
        LEFT JOIN users ucor ON ucor.id = p.corretor_fk
        WHERE p.uuid = $1::uuid
      `,
      [uuid]
    )

    return result.rows[0] || null
  } catch (error) {
    console.error('❌ Erro ao buscar proprietário por UUID:', error)
    if (error instanceof Error) {
      throw new Error(`Erro ao buscar proprietário por UUID: ${error.message}`)
    }
    throw new Error('Erro ao buscar proprietário por UUID: Erro desconhecido')
  }
}

// Criar proprietário
export async function createProprietario(data: CreateProprietarioData): Promise<Proprietario> {
  try {
    // Validar CPF
    if (!validateCPF(data.cpf)) {
      throw new Error('CPF Inválido')
    }

    // Verificar se CPF já existe
    const existingCPF = await pool.query('SELECT 1 FROM proprietarios WHERE cpf = $1', [data.cpf])
    if (existingCPF.rows.length > 0) {
      throw new Error('CPF já cadastrado')
    }

    // Verificar se email já existe
    if (data.email) {
      const existingEmail = await pool.query('SELECT 1 FROM proprietarios WHERE email = $1', [data.email])
      if (existingEmail.rows.length > 0) {
        throw new Error('Email já cadastrado')
      }
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(data.password || 'Net123456', 10)

    const result = await pool.query(`
      INSERT INTO proprietarios (
        nome, cpf, telefone, endereco, numero, bairro, complemento,
        password, email, estado_fk, cidade_fk, cep, 
        origem_cadastro, created_by, corretor_fk
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `, [
      data.nome,
      data.cpf,
      data.telefone,
      data.endereco,
      data.numero,
      data.bairro,
      data.complemento || null,
      hashedPassword,
      data.email,
      data.estado_fk || null,
      data.cidade_fk || null,
      data.cep,
      data.origem_cadastro || 'Plataforma',
      data.created_by || 'system',
      data.corretor_fk || null
    ])

    return result.rows[0]
  } catch (error) {
    console.error('❌ Erro ao criar proprietário:', error)
    throw error
  }
}

// Atualizar proprietário por UUID
export async function updateProprietarioByUuid(uuid: string, data: UpdateProprietarioData): Promise<Proprietario> {
  try {
    // Validar CPF se fornecido
    if (data.cpf && !validateCPF(data.cpf)) {
      throw new Error('CPF Inválido')
    }

    // Verificar se CPF já existe (excluindo o próprio registro)
    if (data.cpf) {
      const cpfQuery = 'SELECT 1 FROM proprietarios WHERE cpf = $1 AND uuid != $2::uuid'
      const existingCPF = await pool.query(cpfQuery, [data.cpf, uuid])
      if (existingCPF.rows.length > 0) {
        throw new Error('CPF já cadastrado')
      }
    }

    // Verificar se email já existe (excluindo o próprio registro)
    if (data.email) {
      const emailQuery = 'SELECT 1 FROM proprietarios WHERE LOWER(email) = LOWER($1) AND uuid != $2::uuid'
      const existingEmail = await pool.query(emailQuery, [data.email, uuid])
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

    if (data.complemento !== undefined) {
      fields.push(`complemento = $${++paramCount}`)
      values.push(data.complemento || null)
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
      UPDATE proprietarios 
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE uuid = $${paramCount + 1}::uuid
      RETURNING *
    `

    values.push(uuid)

    const result = await pool.query(query, values)

    if (result.rows.length === 0) {
      throw new Error('Proprietário não encontrado')
    }

    return result.rows[0]
  } catch (error) {
    console.error('❌ Erro ao atualizar proprietário:', error)
    throw error
  }
}

// Deletar proprietário por UUID
export async function deleteProprietarioByUuid(uuid: string): Promise<void> {
  try {
    const result = await pool.query('DELETE FROM proprietarios WHERE uuid = $1::uuid', [uuid])

    if (result.rowCount === 0) {
      throw new Error('Proprietário não encontrado')
    }
  } catch (error) {
    console.error('❌ Erro ao deletar proprietário:', error)
    throw error
  }
}

// Verificar se CPF já existe
export async function checkCPFExists(cpf: string, excludeUuid?: string): Promise<boolean> {
  try {
    const cpfRaw = String(cpf || '')
    const cpfDigits = cpfRaw.replace(/\D/g, '')
    const params: any[] = [cpfRaw, cpfDigits]
    // Preferir match exato e ter fallback por dígitos para cobrir CPFs armazenados com/sem máscara.
    let query =
      "SELECT 1 FROM proprietarios WHERE cpf = $1 OR REPLACE(REPLACE(cpf, '.', ''), '-', '') = $2"

    if (excludeUuid) {
      query += ' AND uuid != $3::uuid'
      params.push(excludeUuid)
    }

    const result = await pool.query(query, params)
    return result.rows.length > 0
  } catch (error) {
    console.error('❌ Erro ao verificar CPF:', error)
    throw error
  }
}

// Verificar se Email já existe
export async function checkEmailExists(email: string, excludeUuid?: string): Promise<boolean> {
  try {
    const params: any[] = [email]
    let query = 'SELECT 1 FROM proprietarios WHERE LOWER(email) = LOWER($1)'

    if (excludeUuid) {
      query += ' AND uuid != $2::uuid'
      params.push(excludeUuid)
    }

    const result = await pool.query(query, params)
    return result.rows.length > 0
  } catch (error) {
    console.error('❌ Erro ao verificar Email:', error)
    throw error
  }
}
