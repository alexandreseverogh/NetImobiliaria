/**
 * GET/POST /api/admin/campanhas/audiences
 *
 * Tier 3 do plano "Loop do ICP" — Custom Audience/Lookalike (Meta). GET lista as audiências já
 * criadas no escopo + a contagem real de leads elegíveis (negócio fechado + email/telefone),
 * sempre calculada mesmo sem nenhuma audiência ainda — é o dado que a UI usa pra decidir se
 * vale tentar criar (mínimo real de 100 membros exigido pela Meta pra Lookalike).
 *
 * POST cria uma Custom Audience nova a partir dos negócios fechados reais do escopo — nunca
 * envia nada à Meta sem confirmar localmente que a amostra bate o mínimo (audienceService.ts).
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireApiPermission } from '@/lib/auth/apiPermissions';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { countEligibleClosedDeals, listAudiences, createCustomAudienceFromClosedDeals } from '@/lib/marketing/services/audienceService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const denied = await requireApiPermission(request, 'dashboard-campanhas', 'READ');
  if (denied) return denied;

  const payload = getTokenPayload(request);
  if (!payload?.tenantId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const rawClientId = searchParams.get('clientId');
  const clientId = rawClientId === 'own' ? 'own' : (rawClientId || undefined);

  try {
    const [audiences, eligibleCount] = await Promise.all([
      listAudiences(payload.tenantId, clientId),
      countEligibleClosedDeals(payload.tenantId, clientId),
    ]);
    return NextResponse.json({ audiences, eligibleCount });
  } catch (e: any) {
    console.error('GET /audiences error:', e);
    return NextResponse.json({ error: e.message || 'Erro ao listar audiências' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const denied = await requireApiPermission(request, 'configuracoes-campanhas', 'UPDATE');
  if (denied) return denied;

  const payload = getTokenPayload(request);
  if (!payload?.tenantId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const clientId = body.clientId === 'own' ? undefined : (body.clientId || undefined);
    const name = (body.name || '').trim();
    if (!name) {
      return NextResponse.json({ error: 'Nome da audiência é obrigatório' }, { status: 400 });
    }

    const audience = await createCustomAudienceFromClosedDeals(payload.tenantId, clientId, name);
    return NextResponse.json({ audience }, { status: 201 });
  } catch (e: any) {
    console.error('POST /audiences error:', e);
    return NextResponse.json({ error: e.message || 'Erro ao criar audiência' }, { status: 500 });
  }
}
