import { NextRequest, NextResponse } from 'next/server'
import { checkCPFExists } from '@/lib/database/clientes'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { cpf, excludeUuid } = body
    
    console.log('🔍 Verificando CPF de cliente:', cpf, 'excludeUuid:', excludeUuid)
    
    if (!cpf) {
      return NextResponse.json(
        { error: 'CPF é obrigatório' },
        { status: 400 }
      )
    }
    
    const exists = await checkCPFExists(cpf, excludeUuid)
    
    console.log('✅ Resultado da verificação de CPF:', exists)
    
    return NextResponse.json({ exists })
  } catch (error) {
    console.error('❌ Erro ao verificar CPF:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}








