/* eslint-disable */
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth/jwt'
import { getImoveisStats } from '@/lib/database/imoveis'
import { userHasPermission } from '@/lib/database/users'

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticaÃ§Ã£o
    const token = request.cookies.get('accessToken')?.value
    if (!token) {
      return NextResponse.json(
        { error: 'Token de autenticaÃ§Ã£o nÃ£o fornecido' },
        { status: 401 }
      )
    }

    const decoded = await verifyToken(token)
    if (!decoded) {
      return NextResponse.json(
        { error: 'Token invÃ¡lido' },
        { status: 401 }
      )
    }

    // Verificar permissÃ£o de leitura
    const hasPermission = await userHasPermission(decoded.userId, 'imoveis', 'READ')
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Sem permissÃ£o para acessar estatÃ­sticas de imÃ³veis' },
        { status: 403 }
      )
    }

    // Buscar estatÃ­sticas
    const stats = await getImoveisStats()

    return NextResponse.json({
      success: true,
      data: stats
    })

  } catch (error) {
    console.error('Erro ao buscar estatÃ­sticas de imÃ³veis:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

