/**
 * Config padrão do "ativo" vinculado a um lead (imóvel, veículo, etc), curada pelo Master,
 * por segmento — a fonte que crm_ativo_config_segmento representa (docs/CHECKPOINT.md,
 * 2026-08-14). Cada tenant desse segmento herda isso automaticamente, podendo sobrepor em
 * /crm/config/segmentos (crm_ativo_config_tenant).
 *
 * GET  /api/admin/master/segments/[id]/ativo-config → { config: {...} | null }
 * POST /api/admin/master/segments/[id]/ativo-config → LLM sugere campos de Perfil de
 *      Interesse pro segmento (não salva). Body opcional: { name, description }
 * PUT  /api/admin/master/segments/[id]/ativo-config → salva (upsert), body = os mesmos campos
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth/jwt'
import pool from '@/lib/database/connection'
import { IDENT_RE } from '@/lib/crm/resolveAtivoConfig'
import { suggestAtivoFormSchema } from '@/lib/crm/ativoFormSchemaSuggestionService'

export const dynamic = 'force-dynamic'

async function requireMaster(request: NextRequest) {
  const token = request.cookies.get('admin_auth_token')?.value
  const decoded = token ? await verifyToken(token) : null
  if (!decoded || !decoded.is_system_role) return null
  return decoded
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireMaster(request))) {
    return NextResponse.json({ error: 'Acesso Master requerido' }, { status: 403 })
  }
  try {
    const segRes = await pool.query(`SELECT id FROM public.system_segments WHERE id = $1::uuid LIMIT 1`, [params.id])
    if (segRes.rows.length === 0) {
      return NextResponse.json({ error: 'Segmento não encontrado' }, { status: 404 })
    }

    const { rows } = await pool.query(
      `SELECT target_table, target_fk_column, target_name_column, target_label, layout_json, form_schema_json, is_active
         FROM public.crm_ativo_config_segmento
        WHERE segment_id = $1::uuid`,
      [params.id]
    )
    return NextResponse.json({ config: rows[0] || null })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireMaster(request))) {
    return NextResponse.json({ error: 'Acesso Master requerido' }, { status: 403 })
  }
  try {
    const body = await request.json().catch(() => ({}))
    let name = body?.name as string | undefined
    let description = body?.description as string | undefined

    if (!name) {
      const { rows } = await pool.query(
        `SELECT name, description FROM public.system_segments WHERE id = $1::uuid LIMIT 1`,
        [params.id],
      )
      if (rows.length === 0) {
        return NextResponse.json({ error: 'Segmento não encontrado' }, { status: 404 })
      }
      name = rows[0].name
      description = description ?? rows[0].description ?? ''
    }

    const fields = await suggestAtivoFormSchema(name!, description ?? '')
    return NextResponse.json({ fields })
  } catch (err: any) {
    console.error('[segments/ativo-config POST]', err?.message ?? err)
    return NextResponse.json({ error: err.message ?? 'Erro ao sugerir campos' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireMaster(request))) {
    return NextResponse.json({ error: 'Acesso Master requerido' }, { status: 403 })
  }
  try {
    const segRes = await pool.query(`SELECT id FROM public.system_segments WHERE id = $1::uuid LIMIT 1`, [params.id])
    if (segRes.rows.length === 0) {
      return NextResponse.json({ error: 'Segmento não encontrado' }, { status: 404 })
    }

    const data = await request.json()
    let {
      target_table,
      target_fk_column,
      target_name_column,
      target_label,
      layout_json = {},
      form_schema_json = [],
      is_active = true,
    } = data

    // Vínculo Exato é opcional — mas ou vem os 3 campos de identificação juntos (tabela real
    // digitalizada), ou nenhum deles (segmento só com Perfil de Interesse, ex.: revendedora de
    // carros sem `veiculos` no banco ainda). Nunca aceita meio-configurado.
    target_table = (target_table || '').trim() || null
    target_name_column = (target_name_column || '').trim() || null
    target_label = (target_label || '').trim() || null
    target_fk_column = (target_fk_column || '').trim() || null

    const temVinculoExato = !!(target_table || target_name_column || target_label)

    if (temVinculoExato) {
      if (!target_table || !target_name_column || !target_label) {
        return NextResponse.json(
          { error: 'Pra configurar Vínculo Exato, preencha Entidade/Tabela, Coluna de Nome e Rótulo juntos — ou deixe os 3 em branco pra usar só Perfil de Interesse.' },
          { status: 400 }
        )
      }
      if (!target_fk_column) target_fk_column = 'imovel_id'
      for (const [label, value] of [
        ['target_table', target_table],
        ['target_fk_column', target_fk_column],
        ['target_name_column', target_name_column],
      ] as const) {
        if (!IDENT_RE.test(value as string)) {
          return NextResponse.json(
            { error: `${label} inválido — use só letras, números e underscore, começando por letra.` },
            { status: 400 }
          )
        }
      }
    } else {
      target_table = null
      target_fk_column = null
      target_name_column = null
      target_label = null
    }

    await pool.query(
      `INSERT INTO public.crm_ativo_config_segmento
         (segment_id, target_table, target_fk_column, target_name_column, target_label, layout_json, form_schema_json, is_active, updated_at)
       VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, NOW())
       ON CONFLICT (segment_id) DO UPDATE SET
         target_table = EXCLUDED.target_table,
         target_fk_column = EXCLUDED.target_fk_column,
         target_name_column = EXCLUDED.target_name_column,
         target_label = EXCLUDED.target_label,
         layout_json = EXCLUDED.layout_json,
         form_schema_json = EXCLUDED.form_schema_json,
         is_active = EXCLUDED.is_active,
         updated_at = NOW()`,
      [params.id, target_table, target_fk_column, target_name_column, target_label, JSON.stringify(layout_json), JSON.stringify(form_schema_json), is_active]
    )

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
