import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import pool from '@/lib/database/connection';
import { SEGMENT_SEED_DEFAULTS } from '@/lib/intelligence/benchmarkResolver';

// F7 — mesma validação de identificador já usada em data-entities/route.ts: o Master nunca
// consegue salvar um fragmento de SQL disfarçado de nome de tabela/coluna.
const IDENT_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

function validateDistributionIdents(body: any): string | null {
  for (const field of ['distribution_target_table', 'distribution_target_id_column', 'distribution_owner_column']) {
    const v = body[field];
    if (v != null && v !== '' && !IDENT_RE.test(v)) {
      return `${field} inválido — use apenas letras, números e underscore, começando por letra ou underscore`;
    }
  }
  return null;
}

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
      imagens_por_ia = false as boolean,
      chatbot_max_turns_default = 6 as number,
      distribution_role_name = 'Corretor' as string,
      distribution_target_table = null as string | null,
      distribution_target_id_column = null as string | null,
      distribution_owner_column = null as string | null,
    } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: 'name e slug são obrigatórios' }, { status: 400 });
    }

    const identError = validateDistributionIdents(body);
    if (identError) return NextResponse.json({ error: identError }, { status: 400 });

    const { rows } = await pool.query(`
      INSERT INTO public.system_segments
        (name, slug, description, icon, color_theme, is_active, imagens_por_ia, chatbot_max_turns_default,
         distribution_role_name, distribution_target_table, distribution_target_id_column, distribution_owner_column)
      VALUES ($1, $2, $3, $4, $5, $6, $7::BOOLEAN, $8, $9, $10, $11, $12)
      RETURNING id
    `, [
      name, slug, description, icon, color_theme, is_active, imagens_por_ia ?? false, chatbot_max_turns_default || 6,
      distribution_role_name || 'Corretor', distribution_target_table || null, distribution_target_id_column || null, distribution_owner_column || null,
    ]);

    const newId = rows[0].id;

    // Auto-semear todos os benchmarks do segmento a partir de SEGMENT_SEED_DEFAULTS.
    // Garante que o agente funciona imediatamente e sem hardcode em runtime.
    const seedEntries = Object.entries(SEGMENT_SEED_DEFAULTS);
    if (seedEntries.length > 0) {
      const vals   = seedEntries.map((_, i) => `($1::uuid, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4}, $${i * 4 + 5})`).join(', ');
      const params: any[] = [newId];
      for (const [key, def] of seedEntries) {
        params.push(key, def.label, def.value, def.unit);
      }
      await pool.query(
        `INSERT INTO public.system_benchmarks (segment_id, metric_key, metric_label, value, unit)
         VALUES ${vals} ON CONFLICT (segment_id, metric_key) DO NOTHING`,
        params,
      );
    }

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
      imagens_por_ia = false as boolean,
      chatbot_max_turns_default = 6 as number,
      distribution_role_name = 'Corretor' as string,
      distribution_target_table = null as string | null,
      distribution_target_id_column = null as string | null,
      distribution_owner_column = null as string | null,
    } = body;

    if (!id || !name) {
      return NextResponse.json({ error: 'id e name são obrigatórios' }, { status: 400 });
    }

    const identError = validateDistributionIdents(body);
    if (identError) return NextResponse.json({ error: identError }, { status: 400 });

    await pool.query(`
      UPDATE public.system_segments SET
        name                           = $2,
        description                    = $3,
        icon                           = $4,
        color_theme                    = $5,
        is_active                      = $6,
        imagens_por_ia                 = $7::BOOLEAN,
        chatbot_max_turns_default      = $8,
        distribution_role_name         = $9,
        distribution_target_table      = $10,
        distribution_target_id_column  = $11,
        distribution_owner_column      = $12
      WHERE id = $1::uuid
    `, [
      id, name, description, icon, color_theme, is_active, imagens_por_ia ?? false, chatbot_max_turns_default || 6,
      distribution_role_name || 'Corretor', distribution_target_table || null, distribution_target_id_column || null, distribution_owner_column || null,
    ]);

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
