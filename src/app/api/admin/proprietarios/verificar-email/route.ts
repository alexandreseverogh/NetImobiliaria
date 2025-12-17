import { NextRequest, NextResponse } from 'next/server'
import { checkEmailExists } from '@/lib/database/proprietarios'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, excludeUuid } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email é obrigatório' },
        { status: 400 }
      )
    }
    
    const exists = await checkEmailExists(email, excludeUuid)
    
    return NextResponse.json({ exists })
  } catch (error) {
    console.error('❌ Erro ao verificar Email:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

