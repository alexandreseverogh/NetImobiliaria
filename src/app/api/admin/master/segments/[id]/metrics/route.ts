/**
 * Catálogo de Métricas Dinâmico — Fase 1 (Master cura por segmento).
 *
 * GET /api/admin/master/segments/[id]/metrics
 *   → métricas curadas atuais do segmento
 *
 * PUT /api/admin/master/segments/[id]/metrics
 *   → salva (replace-all). Body: { metrics: SegmentMetric[] }
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import {
  getSegmentMetrics,
  saveSegmentMetrics,
  type SegmentMetric,
} from '@/lib/marketing/services/segmentMetricCatalogService';

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
  try {
    const metrics = await getSegmentMetrics(params.id);
    return NextResponse.json({ metrics });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireMaster(request))) {
    return NextResponse.json({ error: 'Acesso Master requerido' }, { status: 403 });
  }
  try {
    const body = await request.json();
    const metrics = body?.metrics as Partial<SegmentMetric>[];
    if (!Array.isArray(metrics)) {
      return NextResponse.json({ error: 'Campo "metrics" deve ser um array' }, { status: 400 });
    }
    const inserted = await saveSegmentMetrics(params.id, metrics);
    return NextResponse.json({ ok: true, inserted });
  } catch (err: any) {
    console.error('[segments/metrics PUT]', err?.message ?? err);
    return NextResponse.json({ error: err.message ?? 'Erro ao salvar métricas' }, { status: 500 });
  }
}
