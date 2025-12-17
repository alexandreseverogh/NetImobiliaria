import { NextRequest, NextResponse } from 'next/server'
import { unifiedPermissionMiddleware } from '@/lib/middleware/UnifiedPermissionMiddleware'
import { auditLogger } from '@/lib/utils/auditLogger'
import { findUserById, updateUser, deleteUser } from '@/lib/database/users'

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
    // Verificar permissões usando sistema unificado
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) {
      return permissionCheck
    }

    const userId = params.id
    const user = await findUserById(userId)

    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

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
    // Verificar permissões usando sistema unificado
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) {
      return permissionCheck
    }

    const userId = params.id
    const currentUser = await findUserById(userId)
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    // 🛡️ PROTEÇÃO HIERÁRQUICA - Extrair ID do usuário logado
    const token = request.cookies.get('accessToken')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json(
        { error: 'Token não fornecido' },
        { status: 401 }
      )
    }

    const { verifyTokenNode } = await import('@/lib/auth/jwt-node')
    const decoded = verifyTokenNode(token)
    
    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      )
    }

    const loggedUserId = decoded.userId

    // 🛡️ VERIFICAÇÃO HIERÁRQUICA OBRIGATÓRIA
    const { canManageUser } = await import('@/lib/database/users')
    const hierarchyCheck = await canManageUser(loggedUserId, userId)
    
    if (!hierarchyCheck.allowed) {
      console.log('🚫 Bloqueado por hierarquia:', hierarchyCheck.reason)
      return NextResponse.json(
        { error: hierarchyCheck.reason },
        { status: 403 }
      )
    }

    console.log('✅ Verificação hierárquica passou - pode editar')

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
      `Dados do usuário ${currentUser.username} foram atualizados`,
      true,
      'system',
      'system',
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
    console.error('❌ ERRO ao atualizar usuário:', error)
    console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'N/A')
    console.error('❌ Mensagem:', error instanceof Error ? error.message : String(error))
    
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
      { error: 'Erro interno do servidor', details: error instanceof Error ? error.message : String(error) },
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
    // Verificar permissões usando sistema unificado
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) {
      return permissionCheck
    }

    const userId = params.id
    const currentUser = await findUserById(userId)
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    // 🛡️ PROTEÇÃO HIERÁRQUICA - Extrair ID do usuário logado
    const token = request.cookies.get('accessToken')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json(
        { error: 'Token não fornecido' },
        { status: 401 }
      )
    }

    const { verifyTokenNode } = await import('@/lib/auth/jwt-node')
    const decoded = verifyTokenNode(token)
    
    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      )
    }

    const loggedUserId = decoded.userId

    // 🛡️ VERIFICAÇÃO HIERÁRQUICA OBRIGATÓRIA
    const { canManageUser } = await import('@/lib/database/users')
    const hierarchyCheck = await canManageUser(loggedUserId, userId)
    
    if (!hierarchyCheck.allowed) {
      console.log('🚫 Bloqueado por hierarquia:', hierarchyCheck.reason)
      return NextResponse.json(
        { error: hierarchyCheck.reason },
        { status: 403 }
      )
    }

    console.log('✅ Verificação hierárquica passou - pode excluir')

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
      `Usuário ${currentUser.username} foi excluído do sistema`,
      true,
      'system',
      'system',
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
