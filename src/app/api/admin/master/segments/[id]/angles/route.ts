/**
 * FASE 18.3 — Ângulos + termos de Trends por segmento (Master)
 *
 * GET  /api/admin/master/segments/[id]/angles
 *   → ângulos atuais do segmento (slug, label, terms[])
 *
 * POST /api/admin/master/segments/[id]/angles
 *   → LLM sugere ângulos+termos para o nicho (não salva). Body opcional: { name, description }
 *
 * PUT  /api/admin/master/segments/[id]/angles
 *   → salva os ângulos confirmados. Body: { angles: [{slug,label,terms[]}] }
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import pool from '@/lib/database/connection';
import {
  suggestSegmentAngles,
  getSegmentAnglesDetailed,
  saveSegmentAngles,
  type SuggestedAngle,
} from '@/lib/marketing/services/segmentAngleSuggestionService';

export const dynamic = 'force-dynamic';

async function requireMaster(request: NextRequest) {
  const token   = request.cookies.get('admin_auth_token')?.value;
  const decoded = token ? await verifyToken(token) : null;
  if (!decoded || !decoded.is_system_role) return null;
  return decoded;
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireMaster(request))) {
    return NextResponse.json({ error: 'Acesso Master requerido' }, { status: 403 });
  }
  try {
    const angles = await getSegmentAnglesDetailed(params.id);
    return NextResponse.json({ angles });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireMaster(request))) {
    return NextResponse.json({ error: 'Acesso Master requerido' }, { status: 403 });
  }
  try {
    // Nome/descrição: do body ou do próprio segmento
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

    const suggestions = await suggestSegmentAngles(name!, description ?? '');
    return NextResponse.json({ angles: suggestions });
  } catch (err: any) {
    console.error('[segments/angles POST]', err?.message ?? err);
    return NextResponse.json({ error: err.message ?? 'Erro ao sugerir ângulos' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireMaster(request))) {
    return NextResponse.json({ error: 'Acesso Master requerido' }, { status: 403 });
  }
  try {
    const body = await request.json();
    const angles = body?.angles as SuggestedAngle[];
    if (!Array.isArray(angles)) {
      return NextResponse.json({ error: 'Campo "angles" deve ser um array' }, { status: 400 });
    }
    const inserted = await saveSegmentAngles(params.id, angles);
    return NextResponse.json({ ok: true, inserted });
  } catch (err: any) {
    console.error('[segments/angles PUT]', err?.message ?? err);
    return NextResponse.json({ error: err.message ?? 'Erro ao salvar ângulos' }, { status: 500 });
  }
}
