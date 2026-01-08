/* eslint-disable */
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, JWTPayload } from '@/lib/auth/jwt'
import { auditLogger } from '@/lib/utils/auditLogger'
import { findUserById, updateUser, deleteUser } from '@/lib/database/users'
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

// Interface para atualização de usuário
interface UpdateUserRequest {
  username?: string
  email?: string
  password?: string
  nome?: string
  telefone?: string
  ativo?: boolean
  roleId?: number
}

// Função para validar dados de atualização
function validateUpdateData(data: UpdateUserRequest): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  // Validação do username (se fornecido)
  if (data.username !== undefined) {
    if (!data.username.trim()) {
      errors.push('Username é obrigatório')
    } else if (data.username.length < 3) {
      errors.push('Username deve ter pelo menos 3 caracteres')
    } else if (!/^[a-zA-Z0-9_]+$/.test(data.username)) {
      errors.push('Username deve conter apenas letras, números e underscore')
    }
  }

  // Validação do email (se fornecido)
  if (data.email !== undefined) {
    if (!data.email.trim()) {
      errors.push('Email é obrigatório')
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push('Email inválido')
    }
  }

  // Validação do nome (se fornecido)
  if (data.nome !== undefined) {
    if (!data.nome.trim()) {
      errors.push('Nome é obrigatório')
    } else if (data.nome.length < 2) {
      errors.push('Nome deve ter pelo menos 2 caracteres')
    }
  }

  // Validação do telefone (se fornecido)
  if (data.telefone !== undefined) {
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
  }



  // Validação da senha (se fornecida)
  if (data.password !== undefined && data.password.length > 0) {
    if (data.password.length < 8) {
      errors.push('Senha deve ter pelo menos 8 caracteres')
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

// GET - Buscar usuário específico
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

    const userId = params.id
    const user = await findUserById(userId)

    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    // Log de auditoria
    auditLogger.log(
      'USER_READ',
      `Usuário ${decoded.username} visualizou dados do usuário ${user.username}`,
      true,
      decoded.userId,
      decoded.username,
      request.ip || 'unknown'
    )

    // Não retornar senha
    const { password, ...userWithoutPassword } = user

    return NextResponse.json({
      success: true,
      user: userWithoutPassword
    })

  } catch (error) {
    console.error('Erro ao buscar usuário:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar usuário
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
        { error: 'Acesso negado. Permissão insuficiente para editar usuários.' },
        { status: 403 }
      )
    }

    const userId = params.id
    const currentUser = await findUserById(userId)
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    const updateData: UpdateUserRequest = await request.json()
    
    console.log('📥 Dados recebidos para atualização:', updateData)
    console.log('🆔 ID do usuário:', userId)

    // Validação dos dados de entrada
    const validation = validateUpdateData(updateData)
    if (!validation.isValid) {
      return NextResponse.json(
        { 
          error: 'Dados inválidos',
          details: validation.errors 
        },
        { status: 400 }
      )
    }

    // Atualizar usuário no banco de dados
    const updatedUser = await updateUser(userId, updateData)

    if (!updatedUser) {
      return NextResponse.json(
        { error: 'Erro ao atualizar usuário' },
        { status: 500 }
      )
    }

    // Log de auditoria
    auditLogger.log(
      'USER_UPDATE',
      `Usuário ${decoded.username} atualizou dados do usuário ${currentUser.username}`,
      true,
      decoded.userId,
      decoded.username,
      request.ip || 'unknown'
    )

    // Não retornar senha
    const { password, ...userWithoutPassword } = updatedUser

    return NextResponse.json({
      success: true,
      message: 'Usuário atualizado com sucesso',
      user: userWithoutPassword
    })

  } catch (error) {
    console.error('Erro ao atualizar usuário:', error)
    
    // Tratar erros específicos do banco
    if (error instanceof Error) {
      if (error.message.includes('já existe')) {
        return NextResponse.json(
          { error: 'Username ou email já existe no sistema' },
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

// DELETE - Excluir usuário
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
        { status: 401 }
      )
    }

    // Verificar permissões (apenas usuários com permissão de exclusão)
    const userPermissions = decoded.permissoes
    if (!userPermissions?.usuarios || userPermissions.usuarios !== 'DELETE') {
      return NextResponse.json(
        { error: 'Acesso negado. Permissão insuficiente para excluir usuários.' },
        { status: 403 }
      )
    }

    const userId = params.id
    const currentUser = await findUserById(userId)
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    // Impedir auto-exclusão
    if (userId === decoded.userId) {
      return NextResponse.json(
        { error: 'Não é possível excluir seu próprio usuário' },
        { status: 400 }
      )
    }

    // Verificar se é o último administrador ativo
    // TODO: Implementar verificação se é o último admin
    // Por enquanto, permitir exclusão

    // Excluir usuário do banco de dados
    const success = await deleteUser(userId)

    if (!success) {
      return NextResponse.json(
        { error: 'Erro ao excluir usuário' },
        { status: 500 }
      )
    }

    // Log de auditoria
    auditLogger.log(
      'USER_DELETE',
      `Usuário ${decoded.username} excluiu o usuário ${currentUser.username}`,
      true,
      decoded.userId,
      decoded.username,
      request.ip || 'unknown'
    )

    return NextResponse.json({
      success: true,
      message: 'Usuário excluído com sucesso'
    })

  } catch (error) {
    console.error('Erro ao excluir usuário:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
