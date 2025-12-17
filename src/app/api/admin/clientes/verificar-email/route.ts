import { NextRequest, NextResponse } from 'next/server'
import { checkEmailExists } from '@/lib/database/clientes'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, excludeUuid } = body
    
    console.log('🔍 Verificando Email de cliente:', email, 'excludeUuid:', excludeUuid)
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email é obrigatório' },
        { status: 400 }
      )
    }
    
    const exists = await checkEmailExists(email, excludeUuid)
    
    console.log('✅ Resultado da verificação de Email:', exists)
    
    return NextResponse.json({ exists })
  } catch (error) {
    console.error('❌ Erro ao verificar Email:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

