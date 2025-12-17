import { NextRequest, NextResponse } from 'next/server'
import { checkEmailExists as checkClienteEmail } from '@/lib/database/clientes'
import { checkEmailExists as checkProprietarioEmail } from '@/lib/database/proprietarios'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, userType, excludeUuid } = body
    
    console.log('🔍 [PUBLIC] Verificando Email:', email, 'Tipo:', userType, 'excludeUuid:', excludeUuid)
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email é obrigatório' },
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
      ? await checkClienteEmail(email, excludeUuid)
      : await checkProprietarioEmail(email, excludeUuid)
    
    console.log('✅ [PUBLIC] Resultado Email exists:', exists)
    
    return NextResponse.json({ exists })
  } catch (error) {
    console.error('❌ Erro ao verificar Email público:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}


