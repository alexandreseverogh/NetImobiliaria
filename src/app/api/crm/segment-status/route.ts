import { NextRequest, NextResponse } from 'next/server'
import { verifyTokenNode } from '@/lib/auth/jwt-node'
import { resolveSegment } from '@/lib/intelligence/segmentResolver'

/**
 * Status do gate de uso interno do CRM — consumido por src/app/crm/CRMLayoutContent.tsx
 * pra decidir se bloqueia o Kanban/gestão de leads. Master sempre bypassa (não é um
 * usuário final operando um segmento de negócio). A captação pública de lead
 * (/api/public/imoveis/prospects, webhooks, /api/crm/leads) NUNCA depende deste gate —
 * ver docs/CHECKPOINT.md pro raciocínio completo.
 */
function getCurrentUser(request: NextRequest): { userId: string, tenantId?: string, is_system_role?: boolean } | null {
  try {
    const token = request.cookies.get('admin_auth_token')?.value ||
      request.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) return null

    const decoded = verifyTokenNode(token) as any
    if (!decoded) return null

    return {
      userId: decoded.userId,
      tenantId: decoded.tenantId,
      is_system_role: decoded.is_system_role === true
    }
  } catch (error) {
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = getCurrentUser(request)
    if (!currentUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    if (currentUser.is_system_role) {
      return NextResponse.json({ ready: true, bypass: true, segmentId: null, segmentName: null })
    }

    if (!currentUser.tenantId) {
      return NextResponse.json({ ready: false, segmentId: null, segmentName: null })
    }

    const segment = await resolveSegment(currentUser.tenantId, null)
    return NextResponse.json({
      ready: !!segment?.crm_ia_ativa,
      segmentId: segment?.id ?? null,
      segmentName: segment?.name ?? null,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
