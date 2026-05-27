import { NextRequest, NextResponse } from 'next/server'

// Forçar uso do Node.js runtime
export const runtime = 'nodejs'

import { AuthService } from '@/lib/admin/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password } = body
    
    // Validação básica
    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Usuário e senha são obrigatórios' },
        { status: 400 }
      )
    }
    
    // Tentar fazer login
    const result = await AuthService.login({ username, password })
    
    if (result.success) {
      if (result.requiresTenantSelection) {
        return NextResponse.json({
          success: true,
          requiresTenantSelection: true,
          tenants: result.tenants,
          user: result.user // Contém o ID necessário
        })
      }

      // Login bem-sucedido (apenas 1 tenant)
      return NextResponse.json({
        success: true,
        user: result.user,
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














