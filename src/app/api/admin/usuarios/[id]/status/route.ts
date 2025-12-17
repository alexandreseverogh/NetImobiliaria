import { NextRequest, NextResponse } from 'next/server'
import { unifiedPermissionMiddleware } from '@/lib/middleware/UnifiedPermissionMiddleware'
import { auditLogger } from '@/lib/utils/auditLogger'
import { findUserById, updateUser } from '@/lib/database/users'

// PATCH - Alterar status do usuário
export async function PATCH(
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

    const { ativo } = await request.json()
    
    if (typeof ativo !== 'boolean') {
      return NextResponse.json(
        { error: 'Status deve ser um valor booleano (true/false)' },
        { status: 400 }
      )
    }

    // Verificar se é o último administrador ativo
    // TODO: Implementar verificação se é o último admin
    // Por enquanto, permitir desativação

    const previousStatus = currentUser.ativo

    // Atualizar status no banco de dados
    const updatedUser = await updateUser(userId, { ativo })

    if (!updatedUser) {
      return NextResponse.json(
        { error: 'Erro ao alterar status do usuário' },
        { status: 500 }
      )
    }

    // Log de auditoria
    auditLogger.log(
      'USER_STATUS_CHANGE',
      `Status do usuário ${currentUser.username} alterado de ${previousStatus ? 'Ativo' : 'Inativo'} para ${ativo ? 'Ativo' : 'Inativo'}`,
      true,
      'system',
      'system',
      request.ip || 'unknown'
    )

    return NextResponse.json({
      success: true,
      message: `Usuário ${ativo ? 'ativado' : 'desativado'} com sucesso`,
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        nome: updatedUser.nome,
        ativo: updatedUser.ativo,
        updated_at: updatedUser.updated_at
      }
    })

  } catch (error) {
    console.error('Erro ao alterar status:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

