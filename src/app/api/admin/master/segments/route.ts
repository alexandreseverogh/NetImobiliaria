import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import pool from '@/lib/database/connection';

/* ── auth helper ─────────────────────────────────────────────────── */

async function requireMaster(request: NextRequest) {
  const token   = request.cookies.get('admin_auth_token')?.value;
  const decoded = token ? await verifyToken(token) : null;
  if (!decoded || !decoded.is_system_role) return null;
  return decoded;
}

/* ── GET — lista segmentos + módulos disponíveis ─────────────────── */

export async function GET(request: NextRequest) {
  const decoded = await requireMaster(request);
  if (!decoded) return NextResponse.json({ error: 'Acesso Master Requerido' }, { status: 403 });

  try {
    const result = await pool.query(`
      SELECT
        s.*,
        string_agg(m.name, ', ' ORDER BY m.name)              AS module_names,
        array_agg(m.id) FILTER (WHERE m.id IS NOT NULL)       AS module_ids,
        (SELECT COUNT(*)::int FROM public.clientes c WHERE c.segment_id = s.id) AS tenant_count
      FROM public.system_segments s
      LEFT JOIN public.system_segment_modules sm ON sm.segment_id = s.id
      LEFT JOIN public.system_modules         m  ON m.id = sm.module_id
      GROUP BY s.id
      ORDER BY s.name ASC
    `);

    const modulesRes = await pool.query(
      'SELECT id, name, slug FROM public.system_modules ORDER BY name'
    );

    return NextResponse.json({
      segments:         result.rows,
      availableModules: modulesRes.rows,
    });
  } catch (error: any) {
    console.error('[segments GET]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/* ── POST — cria novo segmento ────────────────────────────────────── */

export async function POST(request: NextRequest) {
  const decoded = await requireMaster(request);
  if (!decoded) return NextResponse.json({ error: 'Acesso Master Requerido' }, { status: 403 });

  try {
    const body = await request.json();
    const {
      name, slug, description = '', icon = 'box',
      color_theme = '#2563eb', is_active = true,
      module_ids = [] as string[],
      cpl_ideal      = null as number | null,
      cpl_critical   = null as number | null,
      ctr_min        = null as number | null,
      imagens_por_ia = false as boolean,
    } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: 'name e slug são obrigatórios' }, { status: 400 });
    }

    const { rows } = await pool.query(`
      INSERT INTO public.system_segments
        (name, slug, description, icon, color_theme, is_active,
         cpl_ideal, cpl_critical, ctr_min, imagens_por_ia)
      VALUES ($1, $2, $3, $4, $5, $6,
        $7::NUMERIC, $8::NUMERIC, $9::NUMERIC, $10::BOOLEAN)
      RETURNING id
    `, [name, slug, description, icon, color_theme, is_active,
        cpl_ideal   != null && cpl_ideal   !== '' ? cpl_ideal   : null,
        cpl_critical != null && cpl_critical !== '' ? cpl_critical : null,
        ctr_min     != null && ctr_min     !== '' ? ctr_min     : null,
        imagens_por_ia ?? false]);

    const newId = rows[0].id;

    // Associar módulos
    if (module_ids.length > 0) {
      const vals   = module_ids.map((_: string, i: number) => `($1::uuid, $${i + 2}::uuid)`).join(', ');
      const params = [newId, ...module_ids];
      await pool.query(
        `INSERT INTO public.system_segment_modules (segment_id, module_id) VALUES ${vals}
         ON CONFLICT DO NOTHING`,
        params
      );
    }

    return NextResponse.json({ id: newId }, { status: 201 });
  } catch (error: any) {
    console.error('[segments POST]', error);
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Slug já existe' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/* ── PUT — atualiza segmento existente ───────────────────────────── */

export async function PUT(request: NextRequest) {
  const decoded = await requireMaster(request);
  if (!decoded) return NextResponse.json({ error: 'Acesso Master Requerido' }, { status: 403 });

  try {
    const body = await request.json();
    const {
      id, name, description = '', icon = 'box',
      color_theme = '#2563eb', is_active = true,
      module_ids = [] as string[],
      cpl_ideal      = null as number | null,
      cpl_critical   = null as number | null,
      ctr_min        = null as number | null,
      imagens_por_ia = false as boolean,
    } = body;

    if (!id || !name) {
      return NextResponse.json({ error: 'id e name são obrigatórios' }, { status: 400 });
    }

    await pool.query(`
      UPDATE public.system_segments SET
        name           = $2,
        description    = $3,
        icon           = $4,
        color_theme    = $5,
        is_active      = $6,
        cpl_ideal      = $7::NUMERIC,
        cpl_critical   = $8::NUMERIC,
        ctr_min        = $9::NUMERIC,
        imagens_por_ia = $10::BOOLEAN
      WHERE id = $1::uuid
    `, [id, name, description, icon, color_theme, is_active,
        cpl_ideal   != null && cpl_ideal   !== '' ? cpl_ideal   : null,
        cpl_critical != null && cpl_critical !== '' ? cpl_critical : null,
        ctr_min     != null && ctr_min     !== '' ? ctr_min     : null,
        imagens_por_ia ?? false]);

    // Re-sincronizar módulos: remove todos e reinsere
    await pool.query(
      'DELETE FROM public.system_segment_modules WHERE segment_id = $1::uuid',
      [id]
    );
    if (module_ids.length > 0) {
      const vals   = module_ids.map((_: string, i: number) => `($1::uuid, $${i + 2}::uuid)`).join(', ');
      const params = [id, ...module_ids];
      await pool.query(
        `INSERT INTO public.system_segment_modules (segment_id, module_id) VALUES ${vals}
         ON CONFLICT DO NOTHING`,
        params
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('[segments PUT]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
