import { NextRequest, NextResponse } from 'next/server'
import { checkCPFExists } from '@/lib/database/proprietarios'
import { verifyToken, getTokenFromRequest } from '@/lib/auth/jwt'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { cpf, excludeUuid } = body

    if (!cpf) {
      return NextResponse.json({ error: 'CPF é obrigatório' }, { status: 400 })
    }
    
    // Obter tenantId do token
    const token = getTokenFromRequest(request)
    const decoded = token ? await verifyToken(token) : null
    const tenantId = decoded?.tenantId

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant não identificado' }, { status: 401 })
    }

    const exists = await checkCPFExists(cpf, tenantId, excludeUuid)
    
    return NextResponse.json({ exists })
  } catch (error) {
    console.error('❌ Erro ao verificar CPF:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}








