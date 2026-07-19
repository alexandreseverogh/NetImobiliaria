/**
 * GET /api/admin/campanhas/dashboard/anticipation
 *
 * FASE 8.5 — Retorna AnticipationResult[] para todas as campanhas ativas
 * do tenant/client no período. Usado pelo Farol de Milha no dashboard.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTokenPayload }           from '@/lib/auth/jwt-node';
import { prisma }                    from '@/lib/marketing/prisma';
import { computeAnticipation }       from '@/lib/marketing/services/anticipationEngine';
import { resolveCampaignIdsBySegment } from '@/lib/marketing/segmentUtils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId') || undefined;
    let clientId   = searchParams.get('clientId')   || undefined;
    if (clientId === 'segment' || clientId === 'all') clientId = undefined;
    const segmentId  = searchParams.get('segmentId')  || undefined;

    // Filtro de campanhas
    const campaignFilter: any = {
      tenantId: payload.tenantId,
      status:   'ACTIVE',
    };
    if (campaignId) {
      campaignFilter.id = campaignId;
    }

    if (segmentId) {
      const segmentCampaignIds = await resolveCampaignIdsBySegment(
        payload.tenantId,
        segmentId,
        clientId,
      );
      campaignFilter.id = { in: segmentCampaignIds };
    } else if (clientId === 'own') {
      campaignFilter.clientId = null;
    } else if (clientId) {
      campaignFilter.clientId = clientId;
    }

    const campaigns = await prisma.campaign.findMany({
      where:   campaignFilter,
      select:  { id: true, clientId: true },
      take:    20,                           // limite razoável por dashboard
    });

    if (campaigns.length === 0) {
      return NextResponse.json([]);
    }

    // Compute em paralelo, falha silenciosa por campanha
    const results = await Promise.allSettled(
      campaigns.map(c =>
        computeAnticipation(
          c.id,
          payload.tenantId!,
          c.clientId ?? null,
        ),
      ),
    );

    const data = results
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
      .map(r => r.value)
      .filter(r => r.events.length > 0 || r.trajectories.length > 0);

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('GET /dashboard/anticipation error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao calcular antecipação' }, { status: 500 });
  }
}
