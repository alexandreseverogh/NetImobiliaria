import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { verifyTokenNode } from '@/lib/auth/jwt-node'

/**
 * GET/PATCH /api/admin/usuarios/me/plantonista — autoatendimento de plantão.
 *
 * Zero hardcode de segmento/vertical: elegibilidade vem do perfil (`user_roles.
 * elegivel_plantonista`, curado em `/admin/hierarquia-perfis` pra qualquer role de qualquer
 * tenant), e o próprio usuário liga/desliga o plantão dele — nunca um admin editando o
 * cadastro de outra pessoa. Resolve rotatividade alta sem precisar de escala/calendário: quem
 * está de plantão hoje marca a si mesmo, sem fricção.
 *
 * `is_plantonista` fica em `user_tenant_membership` (por vínculo), não em `users` (global) —
 * o mesmo usuário pode ter roles diferentes, elegíveis ou não, em tenants diferentes.
 */

function getCurrentUser(request: NextRequest): { userId: string; tenantId?: string } | null {
  try {
    const token = request.cookies.get('admin_auth_token')?.value ||
      request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return null
    const decoded = verifyTokenNode(token) as any
    if (!decoded) return null
    return { userId: decoded.userId, tenantId: decoded.tenantId }
  } catch {
    return null
  }
}

async function resolveEligibility(userId: string, tenantId: string) {
  const { rows } = await pool.query(
    `SELECT ur.elegivel_plantonista, utm.is_plantonista
       FROM public.user_tenant_membership utm
       JOIN public.user_roles ur ON ur.id = utm.role_id
      WHERE utm.user_id = $1::uuid AND utm.tenant_id = $2::uuid`,
    [userId, tenantId],
  )
  const row = rows[0]
  return {
    eligible: row?.elegivel_plantonista === true,
    active: row?.is_plantonista === true,
  }
}

export async function GET(request: NextRequest) {
  const currentUser = getCurrentUser(request)
  if (!currentUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (!currentUser.tenantId) return NextResponse.json({ error: 'tenant_id necessário' }, { status: 400 })

  const result = await resolveEligibility(currentUser.userId, currentUser.tenantId)
  return NextResponse.json(result)
}

export async function PATCH(request: NextRequest) {
  const currentUser = getCurrentUser(request)
  if (!currentUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (!currentUser.tenantId) return NextResponse.json({ error: 'tenant_id necessário' }, { status: 400 })

  const body = await request.json().catch(() => ({}))
  if (typeof body?.active !== 'boolean') {
    return NextResponse.json({ error: '"active" (boolean) é obrigatório' }, { status: 400 })
  }

  // Nunca confia no cliente pra elegibilidade — revalida sempre no servidor, mesmo que a UI já
  // devesse ter escondido o toggle pra quem não é elegível.
  const { eligible } = await resolveEligibility(currentUser.userId, currentUser.tenantId)
  if (!eligible) {
    return NextResponse.json({ error: 'Seu perfil não é elegível para plantão neste tenant.' }, { status: 403 })
  }

  const { rows } = await pool.query(
    `UPDATE public.user_tenant_membership
        SET is_plantonista = $1
      WHERE user_id = $2::uuid AND tenant_id = $3::uuid
    RETURNING is_plantonista`,
    [body.active, currentUser.userId, currentUser.tenantId],
  )
  if (rows.length === 0) {
    return NextResponse.json({ error: 'Vínculo com este tenant não encontrado' }, { status: 404 })
  }

  return NextResponse.json({ success: true, active: rows[0].is_plantonista })
}
