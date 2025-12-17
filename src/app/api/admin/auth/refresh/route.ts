import { NextRequest, NextResponse } from 'next/server'

// Forçar uso do Node.js runtime
export const runtime = 'nodejs'

import { verifyToken, generateTokens } from '@/lib/auth/jwt'

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get('refreshToken')?.value

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Refresh token não fornecido' },
        { status: 401 }
      )
    }

    // Verificar refresh token
    const decoded = await verifyToken(refreshToken)
    if (!decoded) {
      return NextResponse.json(
        { error: 'Refresh token inválido ou expirado' },
        { status: 401 }
      )
    }

    // Gerar novos tokens
    const { userId, username, cargo, role_name } = decoded

    if (!userId || !username || !cargo) {
      return NextResponse.json(
        { error: 'Dados insuficientes no token para renovação' },
        { status: 401 }
      )
    }

    const newTokens = await generateTokens({
      userId,
      username,
      cargo,
      role_name
    })

    // Criar resposta com novos cookies
    const response = NextResponse.json({
      success: true,
      message: 'Tokens renovados com sucesso'
    })

    // Configurar novos cookies
    response.cookies.set('accessToken', newTokens.accessToken, {
      httpOnly: true,
      secure: false, // false para desenvolvimento local
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 horas
      path: '/'
    })

    response.cookies.set('refreshToken', newTokens.refreshToken, {
      httpOnly: true,
      secure: false, // false para desenvolvimento local
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 dias
      path: '/'
    })

    return response

  } catch (error) {
    console.error('Erro ao renovar tokens:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}


