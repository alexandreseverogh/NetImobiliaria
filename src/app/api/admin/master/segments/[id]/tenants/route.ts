/**
 * Empresas de um segmento — modal "Empresas" em /admin/master/segments.
 *
 * GET /api/admin/master/segments/[id]/tenants?search=&page=&pageSize=
 *   → lista paginada e ordenada alfabeticamente, com busca por nome.
 *
 * Endpoint dedicado (não reaproveita GET /api/admin/master/tenants, que traz TODAS as
 * empresas da plataforma sem filtro de segmento/paginação e com JOINs pesados que essa
 * lista não precisa).
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import pool from '@/lib/database/connection';

export const dynamic = 'force-dynamic';

async function requireMaster(request: NextRequest) {
  const token = request.cookies.get('admin_auth_token')?.value;
  const decoded = token ? await verifyToken(token) : null;
  if (!decoded || !decoded.is_system_role) return null;
  return decoded;
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireMaster(request))) {
    return NextResponse.json({ error: 'Acesso Master requerido' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search')?.trim() || null;
  const page = Math.max(parseInt(searchParams.get('page') || '1', 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(searchParams.get('pageSize') || '15', 10) || 15, 1), 100);
  const offset = (page - 1) * pageSize;

  try {
    const { rows } = await pool.query(
      // logo_url às vezes guarda uma imagem base64 embutida (não uma URL leve) — numa lista
      // paginada pensada pra centenas de empresas, isso infla o payload desnecessariamente.
      // Omitido quando for um data URI; o modal cai no fallback de iniciais nesse caso.
      `SELECT id, name, slug, status, cidade, estado,
              CASE WHEN logo_url LIKE 'data:%' THEN NULL ELSE logo_url END AS logo_url,
              created_at
         FROM tenants
        WHERE segment_id = $1::uuid
          AND ($2::text IS NULL OR name ILIKE '%' || $2 || '%')
        ORDER BY name ASC
        LIMIT $3 OFFSET $4`,
      [params.id, search, pageSize, offset],
    );
    const { rows: countRows } = await pool.query(
      `SELECT count(*)::int AS total
         FROM tenants
        WHERE segment_id = $1::uuid
          AND ($2::text IS NULL OR name ILIKE '%' || $2 || '%')`,
      [params.id, search],
    );

    return NextResponse.json({
      tenants: rows,
      total: countRows[0]?.total ?? 0,
      page,
      pageSize,
    });
  } catch (err: any) {
    console.error('[segments/tenants GET]', err?.message ?? err);
    return NextResponse.json({ error: 'Erro ao listar empresas do segmento' }, { status: 500 });
  }
}
