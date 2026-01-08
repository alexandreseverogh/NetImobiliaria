/* eslint-disable */
import { NextRequest, NextResponse } from 'next/server'

// ForÃ§ar uso do Node.js runtime
export const runtime = 'nodejs'

import { AuthService } from '@/lib/admin/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password } = body
    
    // ValidaÃ§Ã£o bÃ¡sica
    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'UsuÃ¡rio e senha sÃ£o obrigatÃ³rios' },
        { status: 400 }
      )
    }
    
    // Tentar fazer login
    const result = await AuthService.login({ username, password })
    
    if (result.success) {
      // Login bem-sucedido
      return NextResponse.json({
        success: true,
        user: {
          id: result.user?.id,
          username: result.user?.username,
          email: result.user?.email,
          nome: result.user?.nome,
          cargo: result.user?.cargo,
          permissoes: result.user?.permissoes
        },
        sessionId: result.sessionId
      })
    } else {
      // Login falhou
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 401 }
      )
    }
  } catch (error) {
    console.error('Erro no login:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}















