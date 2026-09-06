/**
 * POST /api/admin/campanhas/audiences/[id]/lookalike
 *
 * Tier 3 do plano "Loop do ICP" — cria uma Lookalike Audience a partir de uma Custom Audience
 * já criada (semente). `[id]` é o id LOCAL (tenant_audiences.id), nunca o external_id da Meta.
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireApiPermission } from '@/lib/auth/apiPermissions';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { createLookalikeFromAudience } from '@/lib/marketing/services/audienceService';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requireApiPermission(request, 'configuracoes-campanhas', 'UPDATE');
  if (denied) return denied;

  const payload = getTokenPayload(request);
  if (!payload?.tenantId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const country = (body.country || 'BR').toUpperCase();
    const ratio = typeof body.ratio === 'number' ? body.ratio : 0.01;

    const audience = await createLookalikeFromAudience(params.id, country, ratio, payload.tenantId);
    return NextResponse.json({ audience }, { status: 201 });
  } catch (e: any) {
    console.error('POST /audiences/[id]/lookalike error:', e);
    const status = e.message?.includes('não encontrada') ? 404 : 400;
    return NextResponse.json({ error: e.message || 'Erro ao criar Lookalike' }, { status });
  }
}
