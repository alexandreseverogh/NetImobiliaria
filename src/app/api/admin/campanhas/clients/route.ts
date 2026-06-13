import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database/connection';
import { getTokenPayload } from '@/lib/auth/jwt-node';

export const dynamic = 'force-dynamic';

// GET /api/admin/campanhas/clients
// Lista clientes do tenant para seleção ao criar/filtrar campanhas
export async function GET(request: NextRequest) {
  try {
    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search    = searchParams.get('search')    || '';
    const segmentId = searchParams.get('segmentId') || '';
    const limit     = Math.min(parseInt(searchParams.get('limit') || '50'), 200);

    const params: any[] = [payload.tenantId];
    const extraClauses: string[] = [];

    if (search.trim()) {
      params.push(`%${search.trim()}%`);
      extraClauses.push(`AND (c.nome ILIKE $${params.length} OR c.email ILIKE $${params.length} OR c.telefone ILIKE $${params.length})`);
    }

    if (segmentId.trim()) {
      params.push(segmentId.trim());
      extraClauses.push(`AND c.segment_id = $${params.length}::uuid`);
    }

    params.push(limit);
    const limitParam = `$${params.length}`;

    const result = await pool.query(
      `SELECT
         c.uuid            AS id,
         c.nome            AS name,
         c.email,
         c.telefone        AS phone,
         c.cpf,
         c.cidade_fk       AS city,
         c.estado_fk       AS state,
         c.segment_id,
         ss.name           AS segment_name,
         ss.slug           AS segment_slug,
         c.logo_url,
         c.created_at      AS "createdAt"
       FROM public.clientes c
       LEFT JOIN public.system_segments ss ON ss.id = c.segment_id
       WHERE c.tenant_id = $1::uuid
       ${extraClauses.join(' ')}
       ORDER BY c.nome ASC
       LIMIT ${limitParam}`,
      params
    );

    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error('GET /campanhas/clients error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao listar clientes' }, { status: 500 });
  }
}

// PATCH /api/admin/campanhas/clients
// Atualiza segment_id e/ou logo_url de um cliente
export async function PATCH(request: NextRequest) {
  try {
    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { clientId, segment_id, logo_url } = body as {
      clientId:   string;
      segment_id?: string | null;
      logo_url?:   string | null;
    };

    if (!clientId) {
      return NextResponse.json({ error: 'clientId é obrigatório' }, { status: 400 });
    }

    // Valida tamanho do logo (base64 ~= 1 MB → string de ~1.37 MB)
    if (logo_url && logo_url.length > 1_500_000) {
      return NextResponse.json({ error: 'Logo muito grande. Máximo: 1 MB.' }, { status: 400 });
    }

    // Verifica que o cliente pertence ao tenant
    const check = await pool.query(
      `SELECT uuid FROM public.clientes WHERE uuid = $1::uuid AND tenant_id = $2::uuid LIMIT 1`,
      [clientId, payload.tenantId],
    );
    if (!check.rows[0]) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    // Monta SET dinâmico — só atualiza os campos enviados
    const sets: string[] = ['updated_at = now()'];
    const params: any[]  = [];

    if (segment_id !== undefined) { params.push(segment_id ?? null); sets.push(`segment_id = $${params.length}`); }
    if (logo_url   !== undefined) { params.push(logo_url   ?? null); sets.push(`logo_url   = $${params.length}`); }

    params.push(clientId);
    await pool.query(
      `UPDATE public.clientes SET ${sets.join(', ')} WHERE uuid = $${params.length}::uuid`,
      params,
    );

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('PATCH /campanhas/clients error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao atualizar cliente' }, { status: 500 });
  }
}
