import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import pool from '@/lib/database/connection';

export const dynamic = 'force-dynamic';

async function assertMaster(req: NextRequest) {
  const token = req.cookies.get('admin_auth_token')?.value;
  const decoded = token ? await verifyToken(token) : null;
  if (!decoded?.is_system_role) return null;
  return decoded;
}

// GET /api/admin/master/prompts
export async function GET(request: NextRequest) {
  if (!await assertMaster(request)) {
    return NextResponse.json({ error: 'Acesso Master Requerido' }, { status: 403 });
  }

  try {
    const { rows } = await pool.query(`
      SELECT
        t.id,
        t.template_key,
        t.version,
        t.title,
        t.content,
        COALESCE(t.variables, '[]'::jsonb) as variables,
        t.is_active,
        t.segment_id,
        t.created_at,
        t.updated_at,
        s.name  AS segment_name,
        s.slug  AS segment_slug,
        length(t.content) AS content_length
      FROM public.system_prompt_templates t
      LEFT JOIN public.system_segments s ON s.id = t.segment_id
      ORDER BY t.template_key ASC, t.segment_id NULLS FIRST, t.version DESC
    `);

    return NextResponse.json({ prompts: rows });
  } catch (err: any) {
    console.error('[GET /master/prompts]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/admin/master/prompts
// Cria uma VARIAÇÃO de um prompt existente para um segmento específico.
// Body: { source_id: uuid, segment_id: string | null }
//   - clona title/content/variables do source
//   - segment_id null = Geral; uuid = override de segmento
//   - o source permanece intacto (o Geral nunca é destruído)
export async function POST(request: NextRequest) {
  if (!await assertMaster(request)) {
    return NextResponse.json({ error: 'Acesso Master Requerido' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const sourceId: string | undefined = body.source_id;
    const segmentId: string | null = body.segment_id ?? null;

    if (!sourceId) {
      return NextResponse.json({ error: 'source_id é obrigatório' }, { status: 400 });
    }

    // Carrega o prompt de origem
    const src = await pool.query<{
      template_key: string; title: string; content: string; variables: any;
    }>(
      `SELECT template_key, title, content, variables
         FROM public.system_prompt_templates
        WHERE id = $1::uuid LIMIT 1`,
      [sourceId],
    );
    if (!src.rows.length) {
      return NextResponse.json({ error: 'Prompt de origem não encontrado' }, { status: 404 });
    }
    const { template_key, title, content, variables } = src.rows[0];

    // Guarda anti-colisão: no máximo 1 prompt ATIVO por (template_key, segment_id)
    const clash = await pool.query(
      `SELECT 1 FROM public.system_prompt_templates
        WHERE template_key = $1
          AND segment_id IS NOT DISTINCT FROM $2
          AND is_active = true
        LIMIT 1`,
      [template_key, segmentId],
    );
    if (clash.rows.length) {
      return NextResponse.json({
        error: `Já existe um prompt ativo para "${template_key}" nesse segmento.`,
      }, { status: 409 });
    }

    // version = (maior versão atual da chave) + 1
    const ver = await pool.query<{ next: number }>(
      `SELECT COALESCE(MAX(version), 0) + 1 AS next
         FROM public.system_prompt_templates WHERE template_key = $1`,
      [template_key],
    );

    const { rows } = await pool.query(`
      INSERT INTO public.system_prompt_templates
        (template_key, segment_id, version, title, content, variables, is_active)
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, true)
      RETURNING id, template_key, title, version, is_active, segment_id
    `, [
      template_key,
      segmentId,
      ver.rows[0].next,
      title,
      content,
      JSON.stringify(variables ?? []),
    ]);

    return NextResponse.json({ ok: true, prompt: rows[0] }, { status: 201 });
  } catch (err: any) {
    console.error('[POST /master/prompts]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
