import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth/jwt'
import { restoreImovel } from '@/lib/database/imoveis'
import { userHasPermission } from '@/lib/database/users'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticação
    const token = request.cookies.get('accessToken')?.value
    if (!token) {
      return NextResponse.json(
        { error: 'Token de autenticação não fornecido' },
        { status: 401 }
      )
    }

    const decoded = await verifyToken(token)
    if (!decoded) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      )
    }

    // Verificar permissão de escrita
    const hasPermission = await userHasPermission(decoded.userId, 'imoveis', 'UPDATE')
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Sem permissão para restaurar imóveis' },
        { status: 403 }
      )
    }

    // Validar ID
    const id = parseInt(params.id)
    if (isNaN(id) || id <= 0) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      )
    }

    // Restaurar imóvel
    const sucesso = await restoreImovel(id, decoded.userId)
    if (!sucesso) {
      return NextResponse.json(
        { error: 'Imóvel não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Imóvel restaurado com sucesso'
    })

  } catch (error) {
    console.error('Erro ao restaurar imóvel:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}



