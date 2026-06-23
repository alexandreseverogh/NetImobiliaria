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

// PUT /api/admin/master/prompts/[id]
// Body: { title?, content, is_active?, segment_id? }
//   segment_id: null = Geral (fallback p/ todos os segmentos); uuid = override de segmento.
//   Se a chave 'segment_id' não vier no body, a associação atual é mantida.
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  if (!await assertMaster(request)) {
    return NextResponse.json({ error: 'Acesso Master Requerido' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { title, content, is_active } = body;
    const segmentProvided = Object.prototype.hasOwnProperty.call(body, 'segment_id');
    const segmentId: string | null = body.segment_id ?? null;

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Conteúdo não pode ser vazio' }, { status: 400 });
    }

    // Estado atual (precisamos da template_key para a guarda de colisão)
    const current = await pool.query<{ template_key: string; segment_id: string | null }>(
      `SELECT template_key, segment_id FROM public.system_prompt_templates WHERE id = $1::uuid LIMIT 1`,
      [params.id],
    );
    if (!current.rows.length) {
      return NextResponse.json({ error: 'Template não encontrado' }, { status: 404 });
    }

    const templateKey   = current.rows[0].template_key;
    const targetSegment = segmentProvided ? segmentId : current.rows[0].segment_id;
    const willBeActive  = is_active ?? true;

    // Guarda anti-colisão: no máximo 1 prompt ATIVO por (template_key, segment_id).
    // IS NOT DISTINCT FROM trata NULL (Geral) corretamente.
    if (willBeActive) {
      const clash = await pool.query(
        `SELECT 1 FROM public.system_prompt_templates
          WHERE template_key = $1
            AND id <> $2::uuid
            AND segment_id IS NOT DISTINCT FROM $3
            AND is_active = true
          LIMIT 1`,
        [templateKey, params.id, targetSegment],
      );
      if (clash.rows.length) {
        return NextResponse.json({
          error: `Já existe um prompt ativo para "${templateKey}" nesse segmento. ` +
                 `Desative o outro ou escolha um segmento diferente.`,
        }, { status: 409 });
      }
    }

    // Extrai {{variable}} placeholders do conteúdo para atualizar o jsonb variables
    const found = [...content.matchAll(/\{\{(\w+)\}\}/g)].map((m: RegExpMatchArray) => m[1]);
    const variables = [...new Set(found)];

    const { rows } = await pool.query(`
      UPDATE public.system_prompt_templates
      SET
        title      = COALESCE($2, title),
        content    = $3,
        variables  = $4::jsonb,
        is_active  = COALESCE($5, is_active),
        segment_id = $6,
        updated_at = NOW()
      WHERE id = $1::uuid
      RETURNING id, template_key, title, version, is_active, segment_id, updated_at
    `, [
      params.id,
      title ?? null,
      content,
      JSON.stringify(variables),
      is_active ?? null,
      targetSegment,
    ]);

    return NextResponse.json({ ok: true, prompt: rows[0] });
  } catch (err: any) {
    console.error('[PUT /master/prompts/[id]]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
