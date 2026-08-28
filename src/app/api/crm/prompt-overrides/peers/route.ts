import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { verifyTokenNode } from '@/lib/auth/jwt-node'

/**
 * "Copiar de outro cliente" (v1 da sugestão por similaridade, docs/CHECKPOINT.md 2026-08-28) —
 * lista os clientes do MESMO tenant que já têm PROMPT próprio pra este templateKey (não é
 * sobre modelo de LLM, é sobre o texto — um cliente pode ter modelo próprio sem prompt próprio
 * e vice-versa, são cascatas independentes). Sem IA/embedding nesta v1: o admin do tenant
 * escolhe manualmente, com o próprio conhecimento de negócio, qual cliente existente é
 * "parecido" o bastante pra servir de ponto de partida — evita o problema de not-enough-text-
 * to-embed de um cliente recém-criado. Nunca cruza tenants — o texto de um cliente de OUTRO
 * tenant é dado de negócio de outro cliente da plataforma, fora de escopo aqui.
 */

const ALLOWED_TEMPLATE_KEYS = new Set([
  'crm_lead_qualification',
  'mensageria_bot_persona',
  'crm_agent_reactivation_message',
  'crm_agent_next_best_action',
])

function getCurrentUser(request: NextRequest): { userId: string; tenantId?: string; is_system_role?: boolean } | null {
  try {
    const token = request.cookies.get('admin_auth_token')?.value ||
      request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return null
    const decoded = verifyTokenNode(token) as any
    if (!decoded) return null
    return { userId: decoded.userId, tenantId: decoded.tenantId, is_system_role: decoded.is_system_role === true }
  } catch {
    return null
  }
}

function resolveTenantId(request: NextRequest, currentUser: { tenantId?: string; is_system_role?: boolean }, searchParams: URLSearchParams) {
  const isMaster = currentUser.is_system_role === true
  return isMaster ? (searchParams.get('tenant_id') || currentUser.tenantId || null) : (currentUser.tenantId || null)
}

export async function GET(request: NextRequest) {
  const currentUser = getCurrentUser(request)
  if (!currentUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const templateKey = searchParams.get('templateKey')
  const excludeClientId = searchParams.get('excludeClientId') || null
  const tenantId = resolveTenantId(request, currentUser, searchParams)

  if (!templateKey || !ALLOWED_TEMPLATE_KEYS.has(templateKey)) {
    return NextResponse.json({ error: 'templateKey inválido.' }, { status: 400 })
  }
  if (!tenantId) return NextResponse.json({ error: 'tenant_id necessário' }, { status: 400 })

  try {
    const res = await pool.query(
      `SELECT spt.client_id, c.nome AS client_name, spt.content
       FROM public.system_prompt_templates spt
       JOIN public.clientes c ON c.uuid = spt.client_id
       WHERE spt.template_key = $1
         AND spt.tenant_id = $2::uuid
         AND spt.client_id IS NOT NULL
         AND spt.is_active = true
         AND ($3::uuid IS NULL OR spt.client_id <> $3::uuid)
       ORDER BY c.nome ASC`,
      [templateKey, tenantId, excludeClientId],
    )

    return NextResponse.json({
      success: true,
      peers: res.rows.map((r) => ({ clientId: r.client_id, clientName: r.client_name, content: r.content })),
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
