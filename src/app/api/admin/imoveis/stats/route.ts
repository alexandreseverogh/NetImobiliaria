import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth/jwt'
import { getImoveisStats } from '@/lib/database/imoveis'
import { userHasPermission } from '@/lib/database/users'

export async function GET(request: NextRequest) {
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

    // Verificar permissão de leitura
    const hasPermission = await userHasPermission(decoded.userId, 'imoveis', 'READ')
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Sem permissão para acessar estatísticas de imóveis' },
        { status: 403 }
      )
    }

    // Buscar estatísticas
    const stats = await getImoveisStats()

    return NextResponse.json({
      success: true,
      data: stats
    })

  } catch (error) {
    console.error('Erro ao buscar estatísticas de imóveis:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
