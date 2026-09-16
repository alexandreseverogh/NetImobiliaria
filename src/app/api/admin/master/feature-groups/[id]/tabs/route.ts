import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth/jwt'
import pool from '@/lib/database/connection'

async function requireMaster(request: NextRequest) {
  const token = request.cookies.get('admin_auth_token')?.value ||
    request.headers.get('authorization')?.replace('Bearer ', '')
  const decoded = token ? await verifyToken(token) : null
  if (!decoded || !decoded.is_system_role) return null
  return decoded
}

/**
 * PATCH /api/admin/master/feature-groups/[id]/tabs
 *
 * body: { featureId, action: 'link'|'unlink'|'reorder'|'set_default', sortOrder? }
 *
 * Vincular/desvincular uma feature real a este grupo, ou ajustar sua ordem/aba padrão dentro
 * dele. `set_default` sempre limpa o default anterior do MESMO grupo antes de marcar o novo —
 * nunca deixa passar pro banco 2 abas padrão ao mesmo tempo (o índice único parcial já barraria,
 * mas a limpeza explícita evita o erro de constraint em uso normal).
 */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const decoded = await requireMaster(request)
  if (!decoded) return NextResponse.json({ error: 'Acesso Master Requerido' }, { status: 403 })

  const groupId = parseInt(params.id)
  if (isNaN(groupId)) return NextResponse.json({ error: 'ID de grupo inválido' }, { status: 400 })

  const client = await pool.connect()
  try {
    const body = await request.json()
    const { featureId, action, sortOrder } = body

    const parsedFeatureId = parseInt(featureId)
    if (isNaN(parsedFeatureId)) return NextResponse.json({ error: 'featureId inválido' }, { status: 400 })
    if (!['link', 'unlink', 'reorder', 'set_default'].includes(action)) {
      return NextResponse.json({ error: 'action inválida' }, { status: 400 })
    }

    const groupExists = await client.query('SELECT 1 FROM public.system_feature_groups WHERE id = $1', [groupId])
    if (groupExists.rows.length === 0) return NextResponse.json({ error: 'Grupo não encontrado' }, { status: 404 })

    await client.query('BEGIN')
    try {
      if (action === 'link') {
        await client.query(
          `UPDATE public.system_features
              SET group_id = $1, sort_order_in_group = $2, is_default_tab = false
            WHERE id = $3`,
          [groupId, sortOrder ?? 0, parsedFeatureId],
        )
      } else if (action === 'unlink') {
        await client.query(
          `UPDATE public.system_features
              SET group_id = NULL, sort_order_in_group = 0, is_default_tab = false
            WHERE id = $1 AND group_id = $2`,
          [parsedFeatureId, groupId],
        )
      } else if (action === 'reorder') {
        await client.query(
          `UPDATE public.system_features SET sort_order_in_group = $1 WHERE id = $2 AND group_id = $3`,
          [sortOrder ?? 0, parsedFeatureId, groupId],
        )
      } else if (action === 'set_default') {
        await client.query(
          `UPDATE public.system_features SET is_default_tab = false WHERE group_id = $1 AND is_default_tab = true`,
          [groupId],
        )
        await client.query(
          `UPDATE public.system_features SET is_default_tab = true WHERE id = $1 AND group_id = $2`,
          [parsedFeatureId, groupId],
        )
      }

      await client.query('COMMIT')
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    }

    const { rows } = await pool.query(
      `SELECT id, name, url, group_id, sort_order_in_group, is_default_tab
         FROM public.system_features WHERE id = $1`,
      [parsedFeatureId],
    )

    return NextResponse.json({ success: true, feature: rows[0] })
  } catch (error: any) {
    console.error('Erro ao gerenciar aba do grupo:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  } finally {
    client.release()
  }
}
