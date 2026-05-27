/* eslint-disable */
import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { verifyTokenNode } from '@/lib/auth/jwt-node'

// GET - Listar perfis do sistema
export async function GET(request: NextRequest) {
  try {
    // 1. Verificar autenticação via token centralizado
    const authHeader = request.headers.get('authorization')
    const cookieToken = request.cookies.get('accessToken')?.value
    const token = cookieToken || authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const decoded = verifyTokenNode(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 })
    }

    // 2. Determinar escopo de visibilidade (Tenant vs Master)
    const isMaster = decoded.is_system_role === true
    const tenantId = !isMaster ? (decoded as any).tenantId : null

    // 3. Buscar perfis REAIS do banco
    let query = `
      SELECT 
        r.id, r.name, r.description, r.level, r.is_active, 
        r.is_system_role, r.created_at, r.updated_at
      FROM user_roles r
    `
    const params: any[] = []

    if (!isMaster && tenantId) {
      query += ` WHERE r.tenant_id = $1 OR r.is_system_role = true`
      params.push(tenantId)
    } else if (!isMaster) {
      // Se não for master e não tiver tenantId, só vê perfis públicos/sistema básicos
      query += ` WHERE r.is_system_role = true`
    }

    query += ` ORDER BY r.level DESC, r.name ASC`

    const result = await pool.query(query, params)

    return NextResponse.json({
      success: true,
      roles: result.rows,
      total: result.rows.length
    })

  } catch (error) {
    console.error('❌ Erro ao listar perfis (tokenizacao):', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// POST - Criar perfil
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('accessToken')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    
    const decoded = verifyTokenNode(token)
    if (!decoded) return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 })

    // Validação de Governança: Baseada em Permissões (Zero Hardcoding)
    const permissions = (decoded as any).permissoes || {}
    const canManageRoles = permissions['perfis'] === 'ADMIN' || permissions['perfis'] === 'CREATE' || permissions['perfis'] === 'DELETE' || decoded.is_system_role === true

    if (!canManageRoles) {
      return NextResponse.json({ error: 'Permissão insuficiente para gerenciar perfis' }, { status: 403 })
    }

    const data = await request.json()
    const { name, description, level } = data

    if (!name || !description || level === undefined) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
    }

    // Impedir criação de perfis com nível superior ao próprio usuário (exceto Master)
    // Nota: role_level aqui é usado apenas para ordenação e hierarquia relativa, não para gating de funcionalidade
    const userLevel = decoded.role_level || 0
    if (level > userLevel && decoded.is_system_role !== true) {
       return NextResponse.json({ error: 'Você não pode criar um perfil com nível superior ao seu' }, { status: 403 })
    }

    // Inserir no banco real
    const insertQuery = `
      INSERT INTO user_roles (name, description, level, tenant_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING *
    `
    const tenantId = (decoded as any).tenantId || null
    const result = await pool.query(insertQuery, [name, description, level, tenantId])

    return NextResponse.json({
      success: true,
      message: 'Perfil criado com sucesso',
      role: result.rows[0]
    }, { status: 201 })

  } catch (error) {
    console.error('❌ Erro ao criar perfil (tokenizacao):', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
