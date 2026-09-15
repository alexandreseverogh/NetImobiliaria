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

/** GET — detalhe do grupo + abas vinculadas + candidatas (todas as demais features reais,
 *  pra montar o seletor "vincular"; features já noutro grupo aparecem marcadas, não escondidas
 *  — vincular aqui move a feature de lá pra cá, decisão explícita do Master). */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const decoded = await requireMaster(request)
  if (!decoded) return NextResponse.json({ error: 'Acesso Master Requerido' }, { status: 403 })

  const groupId = parseInt(params.id)
  if (isNaN(groupId)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  try {
    const groupRes = await pool.query(
      `SELECT sfg.*, sc.name as category_name
         FROM public.system_feature_groups sfg
         LEFT JOIN public.system_categorias sc ON sc.id = sfg.category_id
        WHERE sfg.id = $1`,
      [groupId],
    )
    if (groupRes.rows.length === 0) return NextResponse.json({ error: 'Grupo não encontrado' }, { status: 404 })

    const featuresRes = await pool.query(
      `SELECT id, name, url, category_id, group_id, sort_order_in_group, is_default_tab
         FROM public.system_features
        WHERE is_active = true AND url IS NOT NULL AND url <> ''
        ORDER BY name`,
    )

    return NextResponse.json({
      success: true,
      group: groupRes.rows[0],
      features: featuresRes.rows,
    })
  } catch (error: any) {
    console.error('Erro ao buscar grupo de funcionalidades:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const decoded = await requireMaster(request)
  if (!decoded) return NextResponse.json({ error: 'Acesso Master Requerido' }, { status: 403 })

  const groupId = parseInt(params.id)
  if (isNaN(groupId)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  try {
    const body = await request.json()
    const { name, icon, category_id, sort_order, is_active } = body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
    }
    if (!category_id) {
      return NextResponse.json({ error: 'Categoria é obrigatória' }, { status: 400 })
    }

    const { rows } = await pool.query(
      `UPDATE public.system_feature_groups
          SET name = $1, icon = $2, category_id = $3, sort_order = $4, is_active = $5, updated_at = NOW()
        WHERE id = $6
      RETURNING id, name, icon, category_id, sort_order, is_active`,
      [name.trim(), icon || 'Squares2X2Icon', category_id, sort_order ?? 0, is_active !== false, groupId],
    )
    if (rows.length === 0) return NextResponse.json({ error: 'Grupo não encontrado' }, { status: 404 })

    return NextResponse.json({ success: true, group: rows[0] })
  } catch (error: any) {
    console.error('Erro ao atualizar grupo de funcionalidades:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/** DELETE — remove o grupo. As features vinculadas NÃO são apagadas: voltam pro estado
 *  "solta" (item comum da sidebar, na categoria própria dela via
 *  system_features.category_id/system_feature_categorias) — `group_id`, `sort_order_in_group`
 *  e `is_default_tab` são resetados explicitamente aqui (não só via `ON DELETE SET NULL` do
 *  FK, que zeraria só `group_id` — sem isso, uma feature ex-membro ficaria com
 *  `is_default_tab=true` órfão pra sempre, inofensivo mas sujo). */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const decoded = await requireMaster(request)
  if (!decoded) return NextResponse.json({ error: 'Acesso Master Requerido' }, { status: 403 })

  const groupId = parseInt(params.id)
  if (isNaN(groupId)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(
      `UPDATE public.system_features
          SET group_id = NULL, sort_order_in_group = 0, is_default_tab = false
        WHERE group_id = $1`,
      [groupId],
    )
    const { rowCount } = await client.query(`DELETE FROM public.system_feature_groups WHERE id = $1`, [groupId])
    if (rowCount === 0) {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: 'Grupo não encontrado' }, { status: 404 })
    }
    await client.query('COMMIT')
    return NextResponse.json({ success: true })
  } catch (error: any) {
    await client.query('ROLLBACK')
    console.error('Erro ao excluir grupo de funcionalidades:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  } finally {
    client.release()
  }
}
