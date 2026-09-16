/**
 * F5 (docs/PLANO_AGENTES_ACELERACAO_CRM.md §3.2) — decisão (aplicar/descartar) de uma
 * sugestão de recalibração de score, escopo SEGMENTO. Aprovação 1-clique, sem PIN — a Master
 * já está autenticada na mesma tela onde vê a sugestão; PIN+WhatsApp é só pra ações que
 * falam com o CLIENTE (reactivation), não pra ajustar um valor de config interna.
 *
 * POST { suggestionId, decision: 'apply' | 'dismiss' }
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import pool from '@/lib/database/connection';
import { decideRecalibrationSuggestion } from '@/lib/crm/agents/scoreRecalibrationService';

export const dynamic = 'force-dynamic';

async function requireMaster(request: NextRequest) {
  const token = request.cookies.get('admin_auth_token')?.value;
  const decoded = token ? await verifyToken(token) : null;
  if (!decoded || !decoded.is_system_role) return null;
  return decoded;
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireMaster(request))) {
    return NextResponse.json({ error: 'Acesso Master requerido' }, { status: 403 });
  }
  try {
    const body = await request.json();
    const { suggestionId, decision } = body || {};
    if (!suggestionId || (decision !== 'apply' && decision !== 'dismiss')) {
      return NextResponse.json({ error: 'suggestionId e decision ("apply"|"dismiss") são obrigatórios' }, { status: 400 });
    }

    // Nunca confia em params.id vindo só da URL — confirma que a sugestão é deste segmento.
    const { rows } = await pool.query(
      `SELECT scope, segment_id FROM public.crm_score_recalibration_suggestions WHERE id = $1::uuid`,
      [suggestionId],
    );
    if (!rows[0]) return NextResponse.json({ error: 'Sugestão não encontrada' }, { status: 404 });
    if (rows[0].scope !== 'segmento' || rows[0].segment_id !== params.id) {
      return NextResponse.json({ error: 'Sugestão não pertence a este segmento' }, { status: 403 });
    }

    const result = await decideRecalibrationSuggestion(suggestionId, decision);
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
