import { NextRequest, NextResponse } from 'next/server'
import { checkCPFExists as checkClienteCPF } from '@/lib/database/clientes'
import { checkCPFExists as checkProprietarioCPF } from '@/lib/database/proprietarios'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { cpf, userType } = body
    const cpfStr = String(cpf || '')
    
    if (!cpf) {
      return NextResponse.json(
        { error: 'CPF é obrigatório' },
        { status: 400 }
      )
    }
    
    if (!userType || !['cliente', 'proprietario'].includes(userType)) {
      return NextResponse.json(
        { error: 'Tipo de usuário inválido' },
        { status: 400 }
      )
    }
    
    const exists = userType === 'cliente' 
      ? await checkClienteCPF(cpfStr)
      : await checkProprietarioCPF(cpfStr)
    
    return NextResponse.json({ exists })
  } catch (error) {
    console.error('❌ Erro ao verificar CPF público:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}


