import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/marketing/prisma';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { requireApiPermission } from '@/lib/auth/apiPermissions';
import { getNetworkServiceForTenant } from '@/lib/marketing/networks/factory';
import { syncCampaignAdSets } from '@/lib/marketing/services/importedAdSetsSync';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/campanhas/campaigns/[id]/sync-locations
 * Relê da rede os conjuntos de anúncios da campanha (com localização) e atualiza o espelho local.
 * Usado para campanhas já importadas antes de existir esta sincronização.
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const denied = await requireApiPermission(request, 'dashboard-campanhas', 'EXECUTE');
    if (denied) return denied;

    const payload = getTokenPayload(request);
    if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const campaign = await prisma.campaign.findFirst({
      where: { id: params.id, tenantId: payload.tenantId },
      select: { id: true, clientId: true, metaCampaignId: true, externalId: true },
    });
    if (!campaign) return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 });

    const externalId = campaign.metaCampaignId || campaign.externalId;
    if (!externalId) return NextResponse.json({ error: 'Campanha sem ID externo' }, { status: 400 });

    const service = await getNetworkServiceForTenant(payload.tenantId, 'meta', campaign.clientId);
    const result = await syncCampaignAdSets(campaign.id, externalId, service);
    if (!result.supported) {
      return NextResponse.json({ error: 'Rede sem leitura de conjuntos de anúncios.' }, { status: 400 });
    }
    return NextResponse.json({ ok: true, adSets: result.adSets });
  } catch (err: any) {
    return NextResponse.json({ error: err?.response?.data?.error?.message || err.message }, { status: 500 });
  }
}
