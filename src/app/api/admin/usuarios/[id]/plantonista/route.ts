import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { verifyTokenNode } from '@/lib/auth/jwt-node'

/**
 * PATCH /api/admin/usuarios/[id]/plantonista
 *
 * Contraparte administrativa do autoatendimento em `/api/admin/usuarios/me/plantonista`:
 * um admin marca/desmarca OUTRO usuário como plantonista, sem depender de a própria pessoa
 * entrar e ligar o toggle — útil pra cobrir ausência ou organizar a escala de quem já tem
 * o cargo elegível. Nunca cria um cargo elegível nem contorna a curadoria em Perfis
 * (`user_roles.elegivel_plantonista`) — só liga/desliga `is_plantonista` de um vínculo já
 * elegível, revalidado sempre no servidor, exatamente como o autoatendimento já faz.
 *
 * `is_plantonista` é por VÍNCULO (`user_tenant_membership`), não global — por isso o tenant
 * é sempre explícito aqui: para admin de tenant, é sempre o próprio tenant da sessão (nunca
 * confia em nada vindo do cliente); para Master (sessão sem tenant fixo, lista cruza tenants),
 * exige `tenant_id` no corpo — o mesmo valor que a listagem já devolve por linha
 * (`current_tenant_id`), então o cliente nunca precisa adivinhar.
 */

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

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const currentUser = getCurrentUser(request)
    if (!currentUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    const isMaster = currentUser.is_system_role === true

    const body = await request.json().catch(() => ({}))
    if (typeof body?.active !== 'boolean') {
      return NextResponse.json({ error: '"active" (boolean) é obrigatório' }, { status: 400 })
    }

    // Nunca confia em tenant_id vindo do cliente pra admin comum — sempre o tenant real da
    // própria sessão, mesma disciplina de /disponibilidade. Só Master (sem tenant fixo na
    // sessão) precisa informar qual tenant, já que a listagem dele cruza vários.
    let targetTenantId: string
    if (isMaster) {
      if (typeof body?.tenant_id !== 'string' || !body.tenant_id) {
        return NextResponse.json({ error: 'tenant_id é obrigatório' }, { status: 400 })
      }
      targetTenantId = body.tenant_id
    } else {
      if (!currentUser.tenantId) return NextResponse.json({ error: 'tenant_id necessário' }, { status: 400 })
      targetTenantId = currentUser.tenantId
    }

    // Revalida a elegibilidade sempre no servidor — nunca confia que o botão só apareceu
    // porque o usuário já era elegível no momento em que a lista foi carregada.
    const { rows: eligRows } = await pool.query(
      `SELECT ur.elegivel_plantonista
         FROM public.user_tenant_membership utm
         JOIN public.user_roles ur ON ur.id = utm.role_id
        WHERE utm.user_id = $1::uuid AND utm.tenant_id = $2::uuid`,
      [params.id, targetTenantId],
    )
    if (eligRows.length === 0) {
      return NextResponse.json({ error: 'Usuário não encontrado neste tenant' }, { status: 404 })
    }
    if (eligRows[0].elegivel_plantonista !== true) {
      return NextResponse.json({ error: 'O perfil deste usuário não é elegível para plantão.' }, { status: 400 })
    }

    const { rows } = await pool.query(
      `UPDATE public.user_tenant_membership
          SET is_plantonista = $1
        WHERE user_id = $2::uuid AND tenant_id = $3::uuid
      RETURNING is_plantonista`,
      [body.active, params.id, targetTenantId],
    )
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Vínculo com este tenant não encontrado' }, { status: 404 })
    }

    return NextResponse.json({ success: true, is_plantonista: rows[0].is_plantonista })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
