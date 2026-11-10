import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/marketing/prisma';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { requireApiPermission } from '@/lib/auth/apiPermissions';
import { getNetworkServiceForTenant } from '@/lib/marketing/networks/factory';
import { syncCampaignAdSets } from '@/lib/marketing/services/importedAdSetsSync';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/campanhas/campaigns/sync-locations
 * Relê da Meta os conjuntos de anúncios (com localização) de TODAS as campanhas importadas
 * do tenant. Cada campanha é independente: uma falha não interrompe as demais.
 */
export async function POST(request: NextRequest) {
  try {
    const denied = await requireApiPermission(request, 'dashboard-campanhas', 'EXECUTE');
    if (denied) return denied;

    const payload = getTokenPayload(request);
    if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const campaigns = await prisma.campaign.findMany({
      where: { tenantId: payload.tenantId, importedReadOnly: true, metaCampaignId: { not: null } },
      select: { id: true, clientId: true, metaCampaignId: true },
    });

    let updated = 0;
    const errors: { campaignId: string; error: string }[] = [];
    for (const c of campaigns) {
      try {
        const service = await getNetworkServiceForTenant(payload.tenantId, 'meta', c.clientId);
        const r = await syncCampaignAdSets(c.id, c.metaCampaignId as string, service);
        if (r.supported) updated += 1;
      } catch (e: any) {
        errors.push({ campaignId: c.id, error: e?.response?.data?.error?.message || e.message });
      }
    }

    return NextResponse.json({ ok: true, campaigns: campaigns.length, updated, errors });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
