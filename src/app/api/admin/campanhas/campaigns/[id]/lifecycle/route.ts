/**
 * GET  /api/admin/campanhas/campaigns/[id]/lifecycle  → histórico de transições
 * POST /api/admin/campanhas/campaigns/[id]/lifecycle  → transição manual
 */
import { NextRequest, NextResponse } from 'next/server';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import {
  transitionCampaign,
  getLifecycleHistory,
  VALID_TRANSITIONS,
  type LifecycleStatus,
} from '@/lib/marketing/services/campaignStateMachine';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const payload = getTokenPayload(request);
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  try {
    const history = await getLifecycleHistory(params.id, 50);
    return NextResponse.json({ history });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const payload = getTokenPayload(request);
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  try {
    const { toStatus, reason } = await request.json();

    if (!toStatus) {
      return NextResponse.json({ error: 'toStatus obrigatório' }, { status: 400 });
    }

    await transitionCampaign(params.id, toStatus as LifecycleStatus, 'MANUAL', reason);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
