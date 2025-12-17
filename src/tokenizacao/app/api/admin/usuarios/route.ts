import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, JWTPayload } from '@/lib/auth/jwt'
import { auditLogger } from '@/lib/utils/auditLogger'
import { findUsersWithRoles, createUser } from '@/lib/database/users'
import { Permission } from '@/lib/types/admin'

// Interface estendida para JWT com permissões
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

// Interface para criação de usuário
interface CreateUserRequest {
  username: string
  email: string
  nome: string
  telefone: string
  roleId: number
  password: string
}

// Função para validar dados de entrada
function validateCreateData(data: CreateUserRequest): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  // Validação de username
  if (!data.username.trim()) {
    errors.push('Username é obrigatório')
  } else if (data.username.length < 3) {
    errors.push('Username deve ter pelo menos 3 caracteres')
  } else if (!/^[a-zA-Z0-9_]+$/.test(data.username)) {
    errors.push('Username deve conter apenas letras, números e underscore')
  }

  // Validação de email
  if (!data.email.trim()) {
    errors.push('Email é obrigatório')
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('Email inválido')
  }

  // Validação de nome
  if (!data.nome.trim()) {
    errors.push('Nome é obrigatório')
  } else if (data.nome.length < 2) {
    errors.push('Nome deve ter pelo menos 2 caracteres')
  }

  // Validação de telefone
  if (!data.telefone.trim()) {
    errors.push('Telefone é obrigatório')
  } else {
    const telefone = data.telefone.trim()
    // Aceitar formatos: (81) 99999-9999, (81) 999999999, (81) 9999-9999
    const telefoneRegex = /^\(\d{2}\) \d{4,5}-?\d{4}$/
    if (!telefoneRegex.test(telefone)) {
      errors.push('Telefone deve estar no formato (81) 99999-9999 ou (81) 9999-9999')
    }
  }

  // Validação de roleId
  if (!data.roleId || data.roleId <= 0) {
    errors.push('Perfil é obrigatório')
  }

  // Validação de senha
  if (!data.password) {
    errors.push('Senha é obrigatória')
  } else if (data.password.length < 8) {
    errors.push('Senha deve ter pelo menos 8 caracteres')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

// GET - Listar usuários
export async function GET(request: NextRequest) {
  try {
    // Verificar permissões usando o middleware
    const { checkApiPermission } = await import('@/lib/middleware/permissionMiddleware')
    const permissionCheck = await checkApiPermission(request)
    if (permissionCheck) {
      return permissionCheck
    }

    // O middleware já verificou as permissões, então podemos prosseguir

    // Buscar usuários do banco de dados
    const users = await findUsersWithRoles()

    // Filtrar usuários (ocultar senhas por segurança)
    const filteredUsers = users.map(user => ({
      ...user,
      password: '***' // Ocultar senha
    }))

    // Log de auditoria (sem informações sensíveis)
    auditLogger.log(
      'USERS_LIST',
      'Usuário listou usuários do sistema',
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
    console.error('Erro ao listar usuários:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST - Criar usuário
export async function POST(request: NextRequest) {
  try {
    // Verificar permissões usando o middleware
    const { checkApiPermission } = await import('@/lib/middleware/permissionMiddleware')
    const permissionCheck = await checkApiPermission(request)
    if (permissionCheck) {
      return permissionCheck
    }

    // O middleware já verificou as permissões, então podemos prosseguir
    const createData: CreateUserRequest = await request.json()

    // Validação dos dados de entrada
    const validation = validateCreateData(createData)
    if (!validation.isValid) {
      return NextResponse.json(
        { 
          error: 'Dados inválidos',
          details: validation.errors 
        },
        { status: 400 }
      )
    }

    // Criar usuário no banco
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
      'Usuário criou um novo usuário no sistema',
      true,
      'system',
      'system',
      request.ip || 'unknown'
    )

    // Não retornar senha
    const { password, ...userWithoutPassword } = newUser

    return NextResponse.json({
      success: true,
      message: 'Usuário criado com sucesso',
      user: userWithoutPassword
    }, { status: 201 })

  } catch (error) {
    console.error('Erro ao criar usuário:', error)
    
    // Tratar erros específicos do banco
    if (error instanceof Error) {
      if (error.message.includes('já existe')) {
        return NextResponse.json(
          { error: 'Username ou email já existe no sistema' },
          { status: 400 }
        )
      }
      if (error.message.includes('Perfil especificado não existe')) {
        return NextResponse.json(
          { error: 'Perfil especificado não existe ou não está ativo' },
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
