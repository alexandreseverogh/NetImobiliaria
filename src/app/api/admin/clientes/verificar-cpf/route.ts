import { NextRequest, NextResponse } from 'next/server'
import { checkCPFExists } from '@/lib/database/clientes'
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
    const { cpf, excludeUuid } = body

    if (!cpf) {
      return NextResponse.json(
        { error: 'CPF é obrigatório' },
        { status: 400 }
      )
    }

    // Bug real corrigido: faltava o tenantId — a chamada antiga (checkCPFExists(cpf, excludeUuid))
    // deixava o parâmetro tenantId da função receber undefined, e "tenant_id = NULL" nunca bate
    // com nada no Postgres — a checagem em tempo real sempre respondia "não existe", mesmo
    // quando o CPF já estava cadastrado (só o createCliente, escopado corretamente, pegava o
    // duplicado — só que na hora do submit, não em tempo real).
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
