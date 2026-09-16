import { NextRequest, NextResponse } from 'next/server'
import { checkCNPJExists } from '@/lib/database/clientes'
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
    const { cnpj, excludeUuid } = body

    if (!cnpj) {
      return NextResponse.json(
        { error: 'CNPJ é obrigatório' },
        { status: 400 }
      )
    }

    const exists = await checkCNPJExists(cnpj, tenantId, excludeUuid)

    return NextResponse.json({ exists })
  } catch (error) {
    console.error('❌ Erro ao verificar CNPJ:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
