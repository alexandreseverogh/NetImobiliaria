import { NextRequest, NextResponse } from 'next/server';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import pool from '@/lib/database/connection';

export const dynamic = 'force-dynamic';

const VALID_STAGES = ['TOF', 'MOF', 'BOF'];

// PATCH /api/admin/campanhas/campaigns/[id]/funnel-stage
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { funnelStage } = await request.json();

    if (!funnelStage || !VALID_STAGES.includes(funnelStage)) {
      return NextResponse.json(
        { error: `funnelStage inválido. Valores permitidos: ${VALID_STAGES.join(', ')}` },
        { status: 400 },
      );
    }

    const result = await pool.query(
      `UPDATE campanhasmarketingdigital."Campaign"
       SET funnel_stage = $1
       WHERE id = $2 AND tenant_id = $3::uuid
       RETURNING id, funnel_stage`,
      [funnelStage, params.id, payload.tenantId],
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 });
    }

    return NextResponse.json({ id: result.rows[0].id, funnelStage: result.rows[0].funnel_stage });
  } catch (error: any) {
    console.error('PATCH /campaigns/[id]/funnel-stage error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao atualizar estágio' }, { status: 500 });
  }
}
