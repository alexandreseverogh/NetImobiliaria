/**
 * FASE 18.4 — POST /api/admin/master/segments/[id]/interests/suggest
 * LLM propõe interesses por segmento → resolve IDs reais na Meta API.
 * Body opcional: { name, description }. Retorna { interests, tokenConfigured, terms }.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import pool from '@/lib/database/connection';
import { suggestSegmentInterests } from '@/lib/marketing/services/segmentInterestSuggestionService';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const token   = request.cookies.get('admin_auth_token')?.value;
  const decoded = token ? await verifyToken(token) : null;
  if (!decoded || !decoded.is_system_role) {
    return NextResponse.json({ error: 'Acesso Master requerido' }, { status: 403 });
  }
  const tenantId = (decoded as any).tenantId as string | undefined;
  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant não resolvido para o token Meta' }, { status: 400 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    let name        = body?.name as string | undefined;
    let description = body?.description as string | undefined;

    if (!name) {
      const { rows } = await pool.query(
        `SELECT name, description FROM public.system_segments WHERE id = $1::uuid LIMIT 1`,
        [params.id],
      );
      if (rows.length === 0) {
        return NextResponse.json({ error: 'Segmento não encontrado' }, { status: 404 });
      }
      name        = rows[0].name;
      description = description ?? rows[0].description ?? '';
    }

    const result = await suggestSegmentInterests(name!, description ?? '', tenantId);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[segments/interests/suggest POST]', err?.message ?? err);
    return NextResponse.json({ error: err.message ?? 'Erro ao sugerir interesses' }, { status: 500 });
  }
}
