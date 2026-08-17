import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { verifyTokenNode } from '@/lib/auth/jwt-node'

/**
 * PATCH /api/admin/usuarios/[id]/disponibilidade
 *
 * Marca ou libera a INDISPONIBILIDADE TEMPORÁRIA de um atendente (férias, atestado, folga).
 * Ver docs/PLANO_PENDENCIA_ATENDIMENTO.md §4.1.
 *
 * Endpoint dedicado, e não um campo no formulário de edição de usuário, de propósito: marcar
 * alguém de atestado é uma ação OPERACIONAL do dia a dia (supervisor, 2 cliques), não uma
 * edição de cadastro. Mesmo padrão do toggle de status que já existe ao lado.
 *
 * Distinto de `users.ativo`, que é a conta desabilitada. Aqui a pessoa continua sendo
 * atendente — só não recebe lead novo enquanto estiver fora, e não é punida por isso:
 *   • sai da fila de distribuição (as 4 estratégias filtram)
 *   • pendência em lead dela pula direto para o escalonamento
 *   • ao perder o lead na reatribuição, NÃO leva penalidade de SLA
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

    const body = await request.json()
    const { indisponivel_ate, motivo } = body

    // Nunca confia no id cru: confirma que o usuário pertence ao tenant de quem está pedindo.
    // Sem isso, qualquer admin poderia marcar como ausente um atendente de outra empresa.
    if (!isMaster) {
      if (!currentUser.tenantId) return NextResponse.json({ error: 'tenant_id necessário' }, { status: 400 })
      const { rows } = await pool.query(
        `SELECT 1 FROM public.user_tenant_membership WHERE user_id = $1::uuid AND tenant_id = $2::uuid`,
        [params.id, currentUser.tenantId],
      )
      if (rows.length === 0) {
        return NextResponse.json({ error: 'Usuário não encontrado neste tenant' }, { status: 404 })
      }
    }

    // `indisponivel_ate` nulo/ausente = liberar (voltou ao trabalho).
    let ate: Date | null = null
    if (indisponivel_ate) {
      const parsed = new Date(indisponivel_ate)
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json({ error: 'Data de retorno inválida.' }, { status: 400 })
      }
      if (parsed.getTime() <= Date.now()) {
        return NextResponse.json({ error: 'A data de retorno precisa ser no futuro.' }, { status: 400 })
      }
      ate = parsed
    }

    const { rows } = await pool.query(
      `UPDATE public.users
          SET indisponivel_ate = $1, indisponivel_motivo = $2, updated_at = NOW()
        WHERE id = $3::uuid
      RETURNING id, nome, indisponivel_ate, indisponivel_motivo`,
      [ate, ate ? (motivo || null) : null, params.id],
    )
    if (rows.length === 0) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

    return NextResponse.json({ success: true, usuario: rows[0] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
