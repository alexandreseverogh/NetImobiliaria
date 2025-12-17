import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { updateClienteByUuid } from '@/lib/database/clientes'
import { updateProprietarioByUuid } from '@/lib/database/proprietarios'
import { verifyToken } from '@/lib/auth/jwt'
import jwt from 'jsonwebtoken'

// Forçar uso do Node.js runtime
export const runtime = 'nodejs'

// Função para extrair e validar token JWT
function getUserFromToken(request: NextRequest): { userUuid: string, userType: 'cliente' | 'proprietario' } | null {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ PROFILE - Token não fornecido no header Authorization')
      return null
    }

    const token = authHeader.substring(7) // Remove "Bearer "
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret'

    console.log('🔍 PROFILE - Verificando token JWT...')
    console.log('🔍 PROFILE - Token (primeiros 20 chars):', token.substring(0, 20) + '...')
    console.log('🔍 PROFILE - JWT_SECRET existe?', !!jwtSecret)

    let decoded: any
    try {
      decoded = jwt.verify(token, jwtSecret) as any
      console.log('✅ PROFILE - Token decodificado:', decoded)
    } catch (jwtError: any) {
      console.error('❌ PROFILE - Erro ao verificar JWT:', jwtError.message)
      console.error('❌ PROFILE - Tipo do erro:', jwtError.name)
      if (jwtError.name === 'TokenExpiredError') {
        console.log('❌ PROFILE - Token expirado em:', new Date(jwtError.expiredAt))
      }
      return null
    }

    if (!decoded || !decoded.userUuid || !decoded.userType) {
      console.log('❌ PROFILE - Token inválido (dados faltando):', {
        hasDecoded: !!decoded,
        hasUserUuid: !!decoded?.userUuid,
        hasUserType: !!decoded?.userType,
        decodedKeys: decoded ? Object.keys(decoded) : []
      })
      return null
    }

    console.log('✅ PROFILE - Token válido:', decoded.userUuid, decoded.userType)
    return {
      userUuid: decoded.userUuid,
      userType: decoded.userType
    }
  } catch (error: any) {
    console.error('❌ PROFILE - Erro ao verificar token:', error)
    console.error('❌ PROFILE - Stack:', error?.stack)
    return null
  }
}

// =====================================================
// GET - Obter dados do perfil
// =====================================================

export async function GET(request: NextRequest) {
  try {
    // Validar token
    const userAuth = getUserFromToken(request)
    if (!userAuth) {
      return NextResponse.json(
        { success: false, message: 'Não autenticado' },
        { status: 401 }
      )
    }

    const { userUuid, userType } = userAuth
    const tableName = userType === 'cliente' ? 'clientes' : 'proprietarios'

    console.log(`🔍 PROFILE GET - Buscando perfil de ${userType} UUID:`, userUuid)

    // Buscar dados do usuário
    // Nota: A tabela não tem coluna 'id', apenas 'uuid'
    const query = `
      SELECT 
        uuid, nome, cpf, email, telefone,
        endereco, numero, bairro, complemento, estado_fk, cidade_fk, cep,
        origem_cadastro, two_fa_enabled,
        created_at, updated_at
      FROM ${tableName}
      WHERE uuid = $1::uuid
    `

    const result = await pool.query(query, [userUuid])

    if (result.rows.length === 0) {
      console.log('❌ PROFILE GET - Usuário não encontrado')
      return NextResponse.json(
        { success: false, message: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    const user = result.rows[0]
    
    // Remover senha da resposta (se existir)
    delete user.password

    console.log('✅ PROFILE GET - Perfil encontrado:', user.nome)

    return NextResponse.json({
      success: true,
      data: {
        ...user,
        userType: userType
      }
    })

  } catch (error) {
    console.error('❌ PROFILE GET - Erro:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// =====================================================
// PUT - Atualizar dados do perfil
// =====================================================

export async function PUT(request: NextRequest) {
  try {
    // Validar token
    const userAuth = getUserFromToken(request)
    if (!userAuth) {
      return NextResponse.json(
        { success: false, message: 'Não autenticado' },
        { status: 401 }
      )
    }

    const { userUuid, userType } = userAuth
    const body = await request.json()

    console.log(`📝 PROFILE PUT - Atualizando perfil de ${userType} UUID:`, userUuid)

    // Remover campos que não podem ser atualizados via esta rota
    delete body.id
    delete body.cpf // CPF não pode ser alterado
    delete body.created_at
    delete body.updated_at
    delete body.created_by
    delete body.updated_by

    // Adicionar updated_by
    body.updated_by = `public_self_${userUuid}`

    console.log('📋 PROFILE PUT - Campos a atualizar:', Object.keys(body))

    // Atualizar na tabela apropriada
    let updatedUser

    try {
      if (userType === 'cliente') {
        console.log('👤 PROFILE PUT - Atualizando cliente...')
        updatedUser = await updateClienteByUuid(userUuid, body)
      } else {
        console.log('🏢 PROFILE PUT - Atualizando proprietário...')
        updatedUser = await updateProprietarioByUuid(userUuid, body)
      }
    } catch (error: any) {
      console.error('❌ PROFILE PUT - Erro ao atualizar:', error)

      // Tratar erros específicos
      if (error.message?.includes('Email já cadastrado')) {
        return NextResponse.json(
          { success: false, message: 'Email já está em uso' },
          { status: 409 }
        )
      }

      if (error.message?.includes('CPF já cadastrado')) {
        return NextResponse.json(
          { success: false, message: 'CPF já está em uso' },
          { status: 409 }
        )
      }

      // Erro genérico
      return NextResponse.json(
        { success: false, message: 'Erro ao atualizar perfil' },
        { status: 500 }
      )
    }

    // Remover senha da resposta
    const { password: _passwordOmitted, ...sanitizedUser } = updatedUser as typeof updatedUser & { password?: unknown }

    console.log('✅ PROFILE PUT - Perfil atualizado com sucesso')

    return NextResponse.json({
      success: true,
      message: 'Perfil atualizado com sucesso',
      data: {
        ...sanitizedUser,
        userType: userType
      }
    })

  } catch (error) {
    console.error('❌ PROFILE PUT - Erro:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

