import { NextRequest, NextResponse } from 'next/server'
import { verifyTokenNode } from '@/lib/auth/jwt-node'
import { hasMensageriaModule } from '@/lib/crm/leadTimeline'

// Gate de contratação da Central de Mensagens: a tela usa isso para decidir se mostra o
// conteúdo ou a tela de acesso negado. A API de conversas já bloqueia separadamente (403).
// Master (is_system_role) sempre tem acesso, como no gate do CRM.
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_auth_token')?.value
      || request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const decoded = verifyTokenNode(token) as any
    if (!decoded) return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    if (decoded.is_system_role) return NextResponse.json({ contracted: true, master: true })
    if (!decoded.tenantId) return NextResponse.json({ contracted: false })

    const contracted = await hasMensageriaModule(decoded.tenantId)
    return NextResponse.json({ contracted })
  } catch (error: any) {
    console.error('[mensageria/access] erro:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
