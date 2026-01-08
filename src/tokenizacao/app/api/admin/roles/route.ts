/* eslint-disable */
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, JWTPayload } from '@/lib/auth/jwt'
import { auditLogger } from '@/lib/utils/auditLogger'
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

// Interface para perfil de usuÃ¡rio
interface UserRole {
  id: number
  name: string
  description: string
  level: number
  permissoes: {
    imoveis: string
    proximidades: string
    usuarios: string
    relatorios: string
  }
  ativo: boolean
  createdAt: string
  updatedAt: string
}

// Interface para criaÃ§Ã£o de perfil
interface CreateRoleRequest {
  name: string
  description: string
  level: number
  permissoes: {
    imoveis: string
    proximidades: string
    usuarios: string
    relatorios: string
  }
}

// Dados mockados de perfis (temporÃ¡rio para debug)
const rolesData: UserRole[] = [
  {
    id: 1,
    name: 'Super Admin',
    description: 'Acesso total ao sistema, incluindo gestÃ£o de outros administradores',
    level: 100,
    permissoes: {
      imoveis: 'DELETE',
      proximidades: 'DELETE',
      usuarios: 'DELETE',
      relatorios: 'DELETE'
    },
    ativo: true,
    createdAt: '2024-12-19T00:00:00.000Z',
    updatedAt: '2024-12-19T00:00:00.000Z'
  },
  {
    id: 2,
    name: 'Administrador',
    description: 'Acesso total ao sistema, exceto gestÃ£o de super admins',
    level: 90,
    permissoes: {
      imoveis: 'DELETE',
      proximidades: 'DELETE',
      usuarios: 'DELETE',
      relatorios: 'WRITE'
    },
    ativo: true,
    createdAt: '2024-12-19T00:00:00.000Z',
    updatedAt: '2024-12-19T00:00:00.000Z'
  },
  {
    id: 3,
    name: 'Corretor',
    description: 'Acesso limitado baseado em permissÃµes especÃ­ficas',
    level: 50,
    permissoes: {
      imoveis: 'WRITE',
      proximidades: 'WRITE',
      usuarios: 'READ',
      relatorios: 'READ'
    },
    ativo: true,
    createdAt: '2024-12-19T00:00:00.000Z',
    updatedAt: '2024-12-19T00:00:00.000Z'
  },
  {
    id: 9,
    name: 'UsuÃ¡rio',
    description: 'UsuÃ¡rio bÃ¡sico para visualizaÃ§Ã£o',
    level: 10,
    permissoes: {
      imoveis: 'READ',
      proximidades: 'READ',
      usuarios: 'NONE',
      relatorios: 'READ'
    },
    ativo: true,
    createdAt: '2024-12-19T00:00:00.000Z',
    updatedAt: '2024-12-19T00:00:00.000Z'
  }
]

// FunÃ§Ã£o para validar dados de criaÃ§Ã£o
function validateCreateRole(data: CreateRoleRequest): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  // ValidaÃ§Ã£o do nome
  if (!data.name.trim()) {
    errors.push('Nome do perfil Ã© obrigatÃ³rio')
  } else if (data.name.length < 2) {
    errors.push('Nome do perfil deve ter pelo menos 2 caracteres')
  } else if (data.name.length > 50) {
    errors.push('Nome do perfil deve ter no mÃ¡ximo 50 caracteres')
  }

  // ValidaÃ§Ã£o da descriÃ§Ã£o
  if (!data.description.trim()) {
    errors.push('DescriÃ§Ã£o Ã© obrigatÃ³ria')
  } else if (data.description.length < 10) {
    errors.push('DescriÃ§Ã£o deve ter pelo menos 10 caracteres')
  } else if (data.description.length > 200) {
    errors.push('DescriÃ§Ã£o deve ter no mÃ¡ximo 200 caracteres')
  }

  // ValidaÃ§Ã£o do nÃ­vel
  if (typeof data.level !== 'number' || data.level < 1 || data.level > 100) {
    errors.push('NÃ­vel deve ser um nÃºmero entre 1 e 100')
  }

  // ValidaÃ§Ã£o das permissÃµes
  const validPermissions = ['NONE', 'READ', 'WRITE', 'DELETE']
  const permissionFields = ['imoveis', 'proximidades', 'usuarios', 'relatorios']
  
  for (const field of permissionFields) {
    const permission = data.permissoes[field as keyof typeof data.permissoes]
    if (!validPermissions.includes(permission)) {
      errors.push(`PermissÃ£o para ${field} deve ser: ${validPermissions.join(', ')}`)
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

// FunÃ§Ã£o para verificar duplicatas
function checkDuplicateName(name: string): boolean {
  return rolesData.some(role => 
    role.name.toLowerCase() === name.toLowerCase()
  )
}

// GET - Listar perfis
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticaÃ§Ã£o
    const token = request.cookies.get('accessToken')?.value
    if (!token) {
      return NextResponse.json(
        { error: 'Token de acesso nÃ£o fornecido' },
        { status: 401 }
      )
    }

    const decoded = await verifyToken(token) as JWTPayloadWithPermissions
    if (!decoded) {
      return NextResponse.json(
        { error: 'Token invÃ¡lido ou expirado' },
        { status: 401 }
      )
    }

    // Verificar permissÃµes (apenas usuÃ¡rios com permissÃ£o de leitura ou superior)
    const userPermissions = decoded.permissoes
    if (!userPermissions?.usuarios) {
      return NextResponse.json(
        { error: 'Acesso negado. PermissÃ£o insuficiente.' },
        { status: 403 }
      )
    }

    // Filtrar perfis baseado nas permissÃµes
    let filteredRoles = rolesData

    // Se o usuÃ¡rio tem apenas permissÃ£o de leitura, mostrar apenas perfis ativos
    if (userPermissions.usuarios === 'READ') {
      filteredRoles = rolesData.filter(role => role.ativo)
    }

    // Log de auditoria
    auditLogger.log(
      'ROLES_LIST',
      `UsuÃ¡rio ${decoded.username} listou perfis do sistema`,
      true,
      decoded.userId,
      decoded.username,
      request.ip || 'unknown'
    )

    return NextResponse.json({
      success: true,
      roles: filteredRoles,
      total: filteredRoles.length
    })

  } catch (error) {
    console.error('Erro ao listar perfis:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST - Criar perfil
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticaÃ§Ã£o
    const token = request.cookies.get('accessToken')?.value
    if (!token) {
      return NextResponse.json(
        { error: 'Token de acesso nÃ£o fornecido' },
        { status: 401 }
      )
    }

    const decoded = await verifyToken(token) as JWTPayloadWithPermissions
    if (!decoded) {
      return NextResponse.json(
        { error: 'Token invÃ¡lido ou expirado' },
        { status: 401 }
      )
    }

    // Verificar permissÃµes (apenas usuÃ¡rios com permissÃ£o de escrita ou superior)
    const userPermissions = decoded.permissoes
    if (!userPermissions?.usuarios || !['WRITE', 'DELETE'].includes(userPermissions.usuarios)) {
      return NextResponse.json(
        { error: 'Acesso negado. PermissÃ£o insuficiente para criar perfis.' },
        { status: 403 }
      )
    }

    const createData: CreateRoleRequest = await request.json()

    // ValidaÃ§Ã£o dos dados de entrada
    const validation = validateCreateRole(createData)
    if (!validation.isValid) {
      return NextResponse.json(
        { 
          error: 'Dados invÃ¡lidos',
          details: validation.errors 
        },
        { status: 400 }
      )
    }

    // Verificar duplicatas de nome
    if (checkDuplicateName(createData.name)) {
      return NextResponse.json(
        { error: 'JÃ¡ existe um perfil com este nome' },
        { status: 400 }
      )
    }

    // Gerar ID Ãºnico
    const newId = Math.max(...rolesData.map(r => r.id)) + 1

    // Criar novo perfil
    const newRole: UserRole = {
      id: newId,
      name: createData.name,
      description: createData.description,
      level: createData.level,
      permissoes: createData.permissoes,
      ativo: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // Adicionar perfil ao array
    rolesData.push(newRole)

    // Em produÃ§Ã£o, aqui vocÃª salvaria no banco de dados

    // Log de auditoria
    auditLogger.log(
      'ROLE_CREATE',
      `UsuÃ¡rio ${decoded.username} criou o perfil ${newRole.name}`,
      true,
      decoded.userId,
      decoded.username,
      request.ip || 'unknown'
    )

    return NextResponse.json({
      success: true,
      message: 'Perfil criado com sucesso',
      role: newRole
    }, { status: 201 })

  } catch (error) {
    console.error('Erro ao criar perfil:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}


