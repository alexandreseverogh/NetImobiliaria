import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth/jwt'
import pool from '@/lib/database/connection'

/**
 * GET/POST /api/admin/master/feature-groups
 *
 * CRUD dos "Grupos de Funcionalidades" — o 3º nível opcional entre Categoria (seção vertical
 * da sidebar) e Funcionalidade (página real). Master-only: sem eixo de permissão/provisionamento
 * próprio, é puramente curadoria de apresentação — quem decide se um usuário vê uma aba
 * continua sendo o mecanismo de sempre (permissions/tenant_feature_overrides por feature).
 */

async function requireMaster(request: NextRequest) {
  const token = request.cookies.get('admin_auth_token')?.value ||
    request.headers.get('authorization')?.replace('Bearer ', '')
  const decoded = token ? await verifyToken(token) : null
  if (!decoded || !decoded.is_system_role) return null
  return decoded
}

export async function GET(request: NextRequest) {
  const decoded = await requireMaster(request)
  if (!decoded) return NextResponse.json({ error: 'Acesso Master Requerido' }, { status: 403 })

  try {
    const result = await pool.query(`
      SELECT
        sfg.id, sfg.name, sfg.icon, sfg.category_id, sfg.sort_order, sfg.is_active,
        sc.name as category_name,
        COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'id', sf.id, 'name', sf.name, 'url', sf.url,
              'sort_order_in_group', sf.sort_order_in_group,
              'is_default_tab', sf.is_default_tab
            ) ORDER BY sf.sort_order_in_group, sf.name
          ) FILTER (WHERE sf.id IS NOT NULL),
          '[]'
        ) as tabs
      FROM public.system_feature_groups sfg
      LEFT JOIN public.system_categorias sc ON sc.id = sfg.category_id
      LEFT JOIN public.system_features sf ON sf.group_id = sfg.id
      GROUP BY sfg.id, sfg.name, sfg.icon, sfg.category_id, sfg.sort_order, sfg.is_active, sc.name
      ORDER BY sfg.sort_order, sfg.name
    `)
    return NextResponse.json({ success: true, groups: result.rows })
  } catch (error: any) {
    console.error('Erro ao listar grupos de funcionalidades:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const decoded = await requireMaster(request)
  if (!decoded) return NextResponse.json({ error: 'Acesso Master Requerido' }, { status: 403 })

  try {
    const body = await request.json()
    const { name, icon, category_id, sort_order } = body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
    }
    if (!category_id) {
      return NextResponse.json({ error: 'Categoria é obrigatória — o grupo precisa saber em qual seção da sidebar aparecer' }, { status: 400 })
    }

    const { rows } = await pool.query(
      `INSERT INTO public.system_feature_groups (name, icon, category_id, sort_order)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, icon, category_id, sort_order, is_active`,
      [name.trim(), icon || 'Squares2X2Icon', category_id, sort_order ?? 0],
    )

    return NextResponse.json({ success: true, group: rows[0] })
  } catch (error: any) {
    console.error('Erro ao criar grupo de funcionalidades:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
