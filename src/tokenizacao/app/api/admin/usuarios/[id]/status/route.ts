import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, JWTPayload } from '@/lib/auth/jwt'
import { auditLogger } from '@/lib/utils/auditLogger'
import { findUserById, updateUser } from '@/lib/database/users'
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

// PATCH - Alterar status do usuário
export async function PATCH(
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
        { error: 'Acesso negado. Permissão insuficiente para alterar status de usuários.' },
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

    const { ativo } = await request.json()
    
    if (typeof ativo !== 'boolean') {
      return NextResponse.json(
        { error: 'Status deve ser um valor booleano (true/false)' },
        { status: 400 }
      )
    }

    // Impedir auto-desativação
    if (userId === decoded.userId && !ativo) {
      return NextResponse.json(
        { error: 'Não é possível desativar seu próprio usuário' },
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
      `Usuário ${decoded.username} alterou status do usuário ${currentUser.username} de ${previousStatus ? 'Ativo' : 'Inativo'} para ${ativo ? 'Ativo' : 'Inativo'}`,
      true,
      decoded.userId,
      decoded.username,
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

