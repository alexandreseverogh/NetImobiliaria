/* eslint-disable */
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, JWTPayload } from '@/lib/auth/jwt'
import { auditLogger } from '@/lib/utils/auditLogger'
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

// Interface para perfil de usuário
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

// Interface para atualização de perfil
interface UpdateRoleRequest {
  name?: string
  description?: string
  level?: number
  permissoes?: {
    imoveis?: string
    proximidades?: string
    usuarios?: string
    relatorios?: string
  }
  ativo?: boolean
}

// Dados mockados de perfis (em produção, viriam do banco de dados)
const rolesData: UserRole[] = [
  {
    id: 1,
    name: 'Administrador',
    description: 'Acesso total ao sistema com todas as permissões',
    level: 100,
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
    id: 2,
    name: 'Corretor',
    description: 'Acesso para gerenciar imóveis e proximidades',
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
    id: 3,
    name: 'Assistente',
    description: 'Acesso de leitura para consultas e relatórios',
    level: 25,
    permissoes: {
      imoveis: 'READ',
      proximidades: 'READ',
      usuarios: 'READ',
      relatorios: 'READ'
    },
    ativo: true,
    createdAt: '2024-12-19T00:00:00.000Z',
    updatedAt: '2024-12-19T00:00:00.000Z'
  }
]

// Função para validar dados de atualização
function validateUpdateRole(data: UpdateRoleRequest): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  // Validação do nome (se fornecido)
  if (data.name !== undefined) {
    if (!data.name.trim()) {
      errors.push('Nome do perfil é obrigatório')
    } else if (data.name.length < 2) {
      errors.push('Nome do perfil deve ter pelo menos 2 caracteres')
    } else if (data.name.length > 50) {
      errors.push('Nome do perfil deve ter no máximo 50 caracteres')
    }
  }

  // Validação da descrição (se fornecida)
  if (data.description !== undefined) {
    if (!data.description.trim()) {
      errors.push('Descrição é obrigatória')
    } else if (data.description.length < 10) {
      errors.push('Descrição deve ter pelo menos 10 caracteres')
    } else if (data.description.length > 200) {
      errors.push('Descrição deve ter no máximo 200 caracteres')
    }
  }

  // Validação do nível (se fornecido)
  if (data.level !== undefined) {
    if (typeof data.level !== 'number' || data.level < 1 || data.level > 100) {
      errors.push('Nível deve ser um número entre 1 e 100')
    }
  }

  // Validação das permissões (se fornecidas)
  if (data.permissoes) {
    const validPermissions = ['NONE', 'READ', 'WRITE', 'DELETE']
    const permissionFields = ['imoveis', 'proximidades', 'usuarios', 'relatorios']
    
    for (const field of permissionFields) {
      const permission = data.permissoes[field as keyof typeof data.permissoes]
      if (permission !== undefined && !validPermissions.includes(permission)) {
        errors.push(`Permissão para ${field} deve ser: ${validPermissions.join(', ')}`)
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

// Função para verificar se nome já existe
function checkDuplicateName(name: string, excludeId: number): boolean {
  return rolesData.some(role => 
    role.name.toLowerCase() === name.toLowerCase() && role.id !== excludeId
  )
}

// Função para verificar se o perfil está em uso
function isRoleInUse(roleId: number): boolean {
  // Em produção, você verificaria na tabela de usuários
  // Por enquanto, vamos simular que não está em uso
  return false
}

// GET - Buscar perfil específico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticação
    const token = request.cookies.get('accessToken')?.value
    if (!token) {
      return NextResponse.json(
        { error: 'Token de acesso não fornecido' },
        { status: 401 }
      )
    }

    const decoded = await verifyToken(token) as JWTPayloadWithPermissions
    if (!decoded) {
      return NextResponse.json(
        { error: 'Token inválido ou expirado' },
        { status: 401 }
      )
    }

    // Verificar permissões (apenas usuários com permissão de leitura ou superior)
    const userPermissions = decoded.permissoes
    if (!userPermissions?.usuarios) {
      return NextResponse.json(
        { error: 'Acesso negado. Permissão insuficiente.' },
        { status: 403 }
      )
    }

    const roleId = parseInt(params.id)
    if (isNaN(roleId)) {
      return NextResponse.json(
        { error: 'ID do perfil inválido' },
        { status: 400 }
      )
    }

    const role = rolesData.find(r => r.id === roleId)

    if (!role) {
      return NextResponse.json(
        { error: 'Perfil não encontrado' },
        { status: 404 }
      )
    }

    // Log de auditoria
    auditLogger.log(
      'ROLE_READ',
      `Usuário ${decoded.username} visualizou dados do perfil ${role.name}`,
      true,
      decoded.userId,
      decoded.username,
      request.ip || 'unknown'
    )

    return NextResponse.json({
      success: true,
      role
    })

  } catch (error) {
    console.error('Erro ao buscar perfil:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar perfil
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticação
    const token = request.cookies.get('accessToken')?.value
    if (!token) {
      return NextResponse.json(
        { error: 'Token de acesso não fornecido' },
        { status: 401 }
      )
    }

    const decoded = await verifyToken(token) as JWTPayloadWithPermissions
    if (!decoded) {
      return NextResponse.json(
        { error: 'Token inválido ou expirado' },
        { status: 401 }
      )
    }

    // Verificar permissões (apenas usuários com permissão de escrita ou superior)
    const userPermissions = decoded.permissoes
    if (!userPermissions?.usuarios || !['WRITE', 'DELETE'].includes(userPermissions.usuarios)) {
      return NextResponse.json(
        { error: 'Acesso negado. Permissão insuficiente para editar perfis.' },
        { status: 403 }
      )
    }

    const roleId = parseInt(params.id)
    if (isNaN(roleId)) {
      return NextResponse.json(
        { error: 'ID do perfil inválido' },
        { status: 400 }
      )
    }

    const roleIndex = rolesData.findIndex(r => r.id === roleId)

    if (roleIndex === -1) {
      return NextResponse.json(
        { error: 'Perfil não encontrado' },
        { status: 404 }
      )
    }

    const currentRole = rolesData[roleIndex]
    const updateData: UpdateRoleRequest = await request.json()

    // Validação dos dados de entrada
    const validation = validateUpdateRole(updateData)
    if (!validation.isValid) {
      return NextResponse.json(
        { 
          error: 'Dados inválidos',
          details: validation.errors 
        },
        { status: 400 }
      )
    }

    // Verificar duplicatas de nome
    if (updateData.name && updateData.name !== currentRole.name) {
      if (checkDuplicateName(updateData.name, roleId)) {
        return NextResponse.json(
          { error: 'Já existe um perfil com este nome' },
          { status: 400 }
        )
      }
    }

    // Impedir edição do perfil de administrador principal
    if (currentRole.name === 'Administrador' && currentRole.level === 100) {
      if (updateData.level !== undefined && updateData.level < 100) {
        return NextResponse.json(
          { error: 'Não é possível reduzir o nível do perfil de Administrador' },
          { status: 400 }
        )
      }
      if (updateData.ativo === false) {
        return NextResponse.json(
          { error: 'Não é possível desativar o perfil de Administrador' },
          { status: 400 }
        )
      }
    }

    // Preparar dados para atualização
    const updatedRole: UserRole = {
      ...currentRole,
      ...updateData,
      permissoes: {
        ...currentRole.permissoes,
        ...(updateData.permissoes && {
          imoveis: updateData.permissoes.imoveis || currentRole.permissoes.imoveis,
          proximidades: updateData.permissoes.proximidades || currentRole.permissoes.proximidades,
          usuarios: updateData.permissoes.usuarios || currentRole.permissoes.usuarios,
          relatorios: updateData.permissoes.relatorios || currentRole.permissoes.relatorios
        })
      },
      updatedAt: new Date().toISOString()
    }

    // Atualizar perfil no array
    rolesData[roleIndex] = updatedRole

    // Em produção, aqui você salvaria no banco de dados

    // Log de auditoria
    auditLogger.log(
      'ROLE_UPDATE',
      `Usuário ${decoded.username} atualizou dados do perfil ${currentRole.name}`,
      true,
      decoded.userId,
      decoded.username,
      request.ip || 'unknown'
    )

    return NextResponse.json({
      success: true,
      message: 'Perfil atualizado com sucesso',
      role: updatedRole
    })

  } catch (error) {
    console.error('Erro ao atualizar perfil:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Excluir perfil
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticação
    const token = request.cookies.get('accessToken')?.value
    if (!token) {
      return NextResponse.json(
        { error: 'Token de acesso não fornecido' },
        { status: 401 }
      )
    }

    const decoded = await verifyToken(token) as JWTPayloadWithPermissions
    if (!decoded) {
      return NextResponse.json(
        { error: 'Token inválido ou expirado' },
        { status: 400 }
      )
    }

    // Verificar permissões (apenas usuários com permissão de exclusão)
    const userPermissions = decoded.permissoes
    if (!userPermissions?.usuarios || userPermissions.usuarios !== 'DELETE') {
      return NextResponse.json(
        { error: 'Acesso negado. Permissão insuficiente para excluir perfis.' },
        { status: 403 }
      )
    }

    const roleId = parseInt(params.id)
    if (isNaN(roleId)) {
      return NextResponse.json(
        { error: 'ID do perfil inválido' },
        { status: 400 }
      )
    }

    const roleIndex = rolesData.findIndex(r => r.id === roleId)

    if (roleIndex === -1) {
      return NextResponse.json(
        { error: 'Perfil não encontrado' },
        { status: 404 }
      )
    }

    const roleToDelete = rolesData[roleIndex]

    // Impedir exclusão do perfil de administrador principal
    if (roleToDelete.name === 'Administrador' && roleToDelete.level === 100) {
      return NextResponse.json(
        { error: 'Não é possível excluir o perfil de Administrador principal' },
        { status: 400 }
      )
    }

    // Verificar se o perfil está em uso
    if (isRoleInUse(roleId)) {
      return NextResponse.json(
        { error: 'Não é possível excluir um perfil que está sendo usado por usuários' },
        { status: 400 }
      )
    }

    // Remover perfil do array
    rolesData.splice(roleIndex, 1)

    // Em produção, aqui você excluiria do banco de dados

    // Log de auditoria
    auditLogger.log(
      'ROLE_DELETE',
      `Usuário ${decoded.username} excluiu o perfil ${roleToDelete.name}`,
      true,
      decoded.userId,
      decoded.username,
      request.ip || 'unknown'
    )

    return NextResponse.json({
      success: true,
      message: 'Perfil excluído com sucesso'
    })

  } catch (error) {
    console.error('Erro ao excluir perfil:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
