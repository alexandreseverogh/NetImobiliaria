/* eslint-disable */
import { NextResponse } from 'next/server'

// ForÃ§ar uso do Node.js runtime
export const runtime = 'nodejs'

export async function POST() {
  try {
    // Criar resposta de sucesso
    const response = NextResponse.json({
      success: true,
      message: 'Logout realizado com sucesso'
    })

    // Limpar cookies de autenticaÃ§Ã£o
    response.cookies.delete('accessToken')
    response.cookies.delete('refreshToken')

    return response

  } catch (error) {
    console.error('Erro no logout:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}


