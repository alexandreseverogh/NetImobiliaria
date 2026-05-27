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
    const search = searchParams.get('search') || '';
    const limit  = Math.min(parseInt(searchParams.get('limit') || '50'), 200);

    const params: any[] = [payload.tenantId];
    let searchClause = '';

    if (search.trim()) {
      params.push(`%${search.trim()}%`);
      searchClause = `AND (c.nome ILIKE $2 OR c.email ILIKE $2 OR c.telefone ILIKE $2)`;
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
         c.created_at      AS "createdAt"
       FROM public.clientes c
       LEFT JOIN public.system_segments ss ON ss.id = c.segment_id
       WHERE c.tenant_id = $1::uuid
       ${searchClause}
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
// Update segment_id for a client
export async function PATCH(request: NextRequest) {
  try {
    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { clientId, segment_id } = body as { clientId: string; segment_id: string | null };

    if (!clientId) {
      return NextResponse.json({ error: 'clientId é obrigatório' }, { status: 400 });
    }

    // Verify client belongs to this tenant
    const check = await pool.query(
      `SELECT uuid FROM public.clientes WHERE uuid = $1::uuid AND tenant_id = $2::uuid LIMIT 1`,
      [clientId, payload.tenantId],
    );
    if (!check.rows[0]) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    await pool.query(
      `UPDATE public.clientes SET segment_id = $1, updated_at = now() WHERE uuid = $2::uuid`,
      [segment_id ?? null, clientId],
    );

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('PATCH /campanhas/clients error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao atualizar cliente' }, { status: 500 });
  }
}
