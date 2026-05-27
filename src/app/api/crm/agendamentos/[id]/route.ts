import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { verifyAuthOrRespond } from '@/lib/auth/authHelpers'
import {
  deleteEventUsuario,
  deleteEventEmpresa,
  getUserRefreshToken,
} from '@/lib/google/calendarService'

// ── PATCH /api/crm/agendamentos/[id] ──────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifyAuthOrRespond(request)
  if (!auth.success) return auth.response!

  const { id } = params
  let body: any
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Body inválido' }, { status: 400 }) }

  try {
    // Buscar agendamento atual
    const { rows } = await pool.query(
      'SELECT * FROM agendamentos WHERE id = $1',
      [id]
    )
    if (!rows[0]) return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 })

    const ag = rows[0]

    // Se for cancelamento, remover dos dois calendários
    if (body.status === 'cancelado') {
      const refreshToken = await getUserRefreshToken(auth.payload!.userId)

      if (ag.google_event_id_usuario && refreshToken) {
        deleteEventUsuario(refreshToken, ag.google_event_id_usuario).catch(e =>
          console.warn('[Cancel] Evento usuário:', e.message)
        )
      }

      if (ag.google_event_id_empresa) {
        // Buscar google_email da empresa
        const { rows: tenantRows } = await pool.query(
          'SELECT google_email FROM tenants WHERE id = $1',
          [ag.tenant_id]
        )
        const googleEmail = tenantRows[0]?.google_email
        if (googleEmail) {
          deleteEventEmpresa(googleEmail, ag.google_event_id_empresa).catch(e =>
            console.warn('[Cancel] Evento empresa:', e.message)
          )
        }
      }
    }

    // Atualizar campos permitidos
    const allowed = ['status', 'observacoes'] as const
    const updates: string[] = ['updated_at = NOW()']
    const values: any[] = []

    allowed.forEach(field => {
      if (body[field] !== undefined) {
        values.push(body[field])
        updates.push(`${field} = $${values.length}`)
      }
    })

    if (updates.length === 1) {
      return NextResponse.json({ error: 'Nenhum campo válido para atualizar' }, { status: 400 })
    }

    values.push(id)
    const { rows: updated } = await pool.query(
      `UPDATE agendamentos SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    )

    return NextResponse.json({ success: true, agendamento: updated[0] })
  } catch (err: any) {
    console.error('[PATCH Agendamento]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
