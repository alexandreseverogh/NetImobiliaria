import { NextRequest, NextResponse } from 'next/server'
import { checkEmailExists } from '@/lib/database/clientes'
import { verifyToken, getTokenFromRequest } from '@/lib/auth/jwt'

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request)
    const decoded = token ? await verifyToken(token) : null
    const tenantId = decoded?.tenantId

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant não identificado' }, { status: 401 })
    }

    const body = await request.json()
    const { email, excludeUuid } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email é obrigatório' },
        { status: 400 }
      )
    }

    // Mesmo bug do verificar-cpf: faltava o tenantId — a checagem sempre respondia "não existe".
    const exists = await checkEmailExists(email, tenantId, excludeUuid)

    return NextResponse.json({ exists })
  } catch (error) {
    console.error('❌ Erro ao verificar Email:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
