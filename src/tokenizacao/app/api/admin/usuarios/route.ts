/* eslint-disable */
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, JWTPayload } from '@/lib/auth/jwt'
import { auditLogger } from '@/lib/utils/auditLogger'
import { findUsersWithRoles, createUser } from '@/lib/database/users'
import { Permission } from '@/lib/types/admin'

// Interface estendida para JWT com permissÃµes
interface JWTPayloadWithPermissions extends JWTPayload {
  permissoes: {
    imoveis: Permission
    proximidades: Permission
    amenidades: Permission
    'categorias-amenidades': Permission
    'categorias-proximidades': Permission
    usuarios: Permission
    relatorios: Permission
    sistema: Permission
  }
}

// Interface para criaÃ§Ã£o de usuÃ¡rio
interface CreateUserRequest {
  username: string
  email: string
  nome: string
  telefone: string
  roleId: number
  password: string
}

// FunÃ§Ã£o para validar dados de entrada
function validateCreateData(data: CreateUserRequest): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  // ValidaÃ§Ã£o de username
  if (!data.username.trim()) {
    errors.push('Username Ã© obrigatÃ³rio')
  } else if (data.username.length < 3) {
    errors.push('Username deve ter pelo menos 3 caracteres')
  } else if (!/^[a-zA-Z0-9_]+$/.test(data.username)) {
    errors.push('Username deve conter apenas letras, nÃºmeros e underscore')
  }

  // ValidaÃ§Ã£o de email
  if (!data.email.trim()) {
    errors.push('Email Ã© obrigatÃ³rio')
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('Email invÃ¡lido')
  }

  // ValidaÃ§Ã£o de nome
  if (!data.nome.trim()) {
    errors.push('Nome Ã© obrigatÃ³rio')
  } else if (data.nome.length < 2) {
    errors.push('Nome deve ter pelo menos 2 caracteres')
  }

  // ValidaÃ§Ã£o de telefone
  if (!data.telefone.trim()) {
    errors.push('Telefone Ã© obrigatÃ³rio')
  } else {
    const telefone = data.telefone.trim()
    // Aceitar formatos: (81) 99999-9999, (81) 999999999, (81) 9999-9999
    const telefoneRegex = /^\(\d{2}\) \d{4,5}-?\d{4}$/
    if (!telefoneRegex.test(telefone)) {
      errors.push('Telefone deve estar no formato (81) 99999-9999 ou (81) 9999-9999')
    }
  }

  // ValidaÃ§Ã£o de roleId
  if (!data.roleId || data.roleId <= 0) {
    errors.push('Perfil Ã© obrigatÃ³rio')
  }

  // ValidaÃ§Ã£o de senha
  if (!data.password) {
    errors.push('Senha Ã© obrigatÃ³ria')
  } else if (data.password.length < 8) {
    errors.push('Senha deve ter pelo menos 8 caracteres')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

// GET - Listar usuÃ¡rios
export async function GET(request: NextRequest) {
  try {
    // Verificar permissÃµes usando o middleware
    const { checkApiPermission } = await import('@/lib/middleware/permissionMiddleware')
    const permissionCheck = await checkApiPermission(request)
    if (permissionCheck) {
      return permissionCheck
    }

    // O middleware jÃ¡ verificou as permissÃµes, entÃ£o podemos prosseguir

    // Buscar usuÃ¡rios do banco de dados
    const users = await findUsersWithRoles()

    // Filtrar usuÃ¡rios (ocultar senhas por seguranÃ§a)
    const filteredUsers = users.map(user => ({
      ...user,
      password: '***' // Ocultar senha
    }))

    // Log de auditoria (sem informaÃ§Ãµes sensÃ­veis)
    auditLogger.log(
      'USERS_LIST',
      'UsuÃ¡rio listou usuÃ¡rios do sistema',
      true,
      'system',
      'system',
      request.ip || 'unknown'
    )

    return NextResponse.json({
      success: true,
      users: filteredUsers,
      total: filteredUsers.length
    })

  } catch (error) {
    console.error('Erro ao listar usuÃ¡rios:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST - Criar usuÃ¡rio
export async function POST(request: NextRequest) {
  try {
    // Verificar permissÃµes usando o middleware
    const { checkApiPermission } = await import('@/lib/middleware/permissionMiddleware')
    const permissionCheck = await checkApiPermission(request)
    if (permissionCheck) {
      return permissionCheck
    }

    // O middleware jÃ¡ verificou as permissÃµes, entÃ£o podemos prosseguir
    const createData: CreateUserRequest = await request.json()

    // ValidaÃ§Ã£o dos dados de entrada
    const validation = validateCreateData(createData)
    if (!validation.isValid) {
      return NextResponse.json(
        { 
          error: 'Dados invÃ¡lidos',
          details: validation.errors 
        },
        { status: 400 }
      )
    }

    // Criar usuÃ¡rio no banco
    const newUser = await createUser({
      username: createData.username.trim(),
      email: createData.email.trim(),
      nome: createData.nome.trim(),
      telefone: createData.telefone.trim(),
      roleId: createData.roleId,
      password: createData.password,
      ativo: true,
      ultimo_login: null
    })

    // Log de auditoria
    auditLogger.log(
      'USER_CREATE',
      'UsuÃ¡rio criou um novo usuÃ¡rio no sistema',
      true,
      'system',
      'system',
      request.ip || 'unknown'
    )

    // NÃ£o retornar senha
    const { password, ...userWithoutPassword } = newUser

    return NextResponse.json({
      success: true,
      message: 'UsuÃ¡rio criado com sucesso',
      user: userWithoutPassword
    }, { status: 201 })

  } catch (error) {
    console.error('Erro ao criar usuÃ¡rio:', error)
    
    // Tratar erros especÃ­ficos do banco
    if (error instanceof Error) {
      if (error.message.includes('jÃ¡ existe')) {
        return NextResponse.json(
          { error: 'Username ou email jÃ¡ existe no sistema' },
          { status: 400 }
        )
      }
      if (error.message.includes('Perfil especificado nÃ£o existe')) {
        return NextResponse.json(
          { error: 'Perfil especificado nÃ£o existe ou nÃ£o estÃ¡ ativo' },
          { status: 400 }
        )
      }
    }
    
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

