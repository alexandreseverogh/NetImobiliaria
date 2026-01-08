/* eslint-disable */
import { NextRequest, NextResponse } from 'next/server'
import { checkCPFExists } from '@/lib/database/clientes'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { cpf, excludeId } = body
    
    if (!cpf) {
      return NextResponse.json(
        { error: 'CPF Ã© obrigatÃ³rio' },
        { status: 400 }
      )
    }
    
    const exists = await checkCPFExists(cpf, excludeId)
    
    return NextResponse.json({ exists })
  } catch (error) {
    console.error('Erro ao verificar CPF:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}


