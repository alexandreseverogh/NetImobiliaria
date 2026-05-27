import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/marketing/prisma';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { getNetworkServiceForTenant } from '@/lib/marketing/networks/factory';
import { requireApiPermission } from '@/lib/auth/apiPermissions';

export const dynamic = 'force-dynamic';

// POST /api/admin/campanhas/insights/sync
export async function POST(request: NextRequest) {
  try {
    // Verificar permissão de execução server-side
    const denied = await requireApiPermission(request, 'campanhasmarketingdigital', 'EXECUTE');
    if (denied) return denied;

    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const campaigns = await prisma.campaign.findMany({
      where: { tenantId: payload.tenantId, metaCampaignId: { not: null } },
    });

    if (campaigns.length === 0) {
      return NextResponse.json({ synced: 0, message: 'Nenhuma campanha vinculada à rede encontrada' });
    }

    let networkService: Awaited<ReturnType<typeof getNetworkServiceForTenant>>;
    try {
      networkService = await getNetworkServiceForTenant(payload.tenantId, 'meta');
    } catch {
      return NextResponse.json({ error: 'Credenciais Meta não configuradas. Configure em Configurações > Redes.' }, { status: 400 });
    }

    const until = new Date().toISOString().slice(0, 10);
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    let syncedCount = 0;
    const errors: string[] = [];

    for (const campaign of campaigns) {
      const externalId = (campaign as any).external_id || campaign.metaCampaignId;
      if (!externalId) continue;
      try {
        const insights = await networkService.fetchInsights(externalId, { since, until });
        for (const day of insights) {
          const insightId = `${campaign.id}-${day.date}`;
          const insightBase = {
            impressions: day.impressions,
            reach:       day.reach,
            clicks:      day.clicks,
            spend:       day.spend,
            cpc:         day.cpc,
            cpm:         day.cpm,
            ctr:         day.ctr,
            conversions: day.conversions,
            frequency:   day.frequency,
            breakdowns:  {},
          };
          await prisma.insight.upsert({
            where: { id: insightId },
            update: insightBase,
            create: {
              id: insightId,
              campaignId: campaign.id,
              tenantId:   payload.tenantId,
              date:       new Date(day.date),
              ...insightBase,
            },
          });
          syncedCount++;
        }
      } catch (err: any) {
        errors.push(`${campaign.name}: ${err.message}`);
      }
    }

    return NextResponse.json({
      synced: syncedCount,
      campaigns: campaigns.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('POST /insights/sync error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao sincronizar insights' }, { status: 500 });
  }
}
