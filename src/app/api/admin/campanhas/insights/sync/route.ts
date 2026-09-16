import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/marketing/prisma';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { getNetworkServiceForTenant } from '@/lib/marketing/networks/factory';
import { syncCampaignInsights } from '@/lib/marketing/services/agentMonitor';
import { getProvisionedNetworkCodes } from '@/lib/marketing/services/networkProvisioning';
import { requireApiPermission } from '@/lib/auth/apiPermissions';
import type { NetworkCode } from '@/lib/marketing/networks/types';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/campanhas/insights/sync
 *
 * Sincroniza métricas de TODAS as redes contratadas+conectadas do tenant, não só Meta —
 * antes desta sessão o endpoint era hardcoded pra Meta (filtro por metaCampaignId, chamada
 * fixa a getNetworkServiceForTenant(tenantId, 'meta')), defasado desde que Google/TikTok
 * ganharam adapter real. Mesma resolução de rede por campanha que o cron (syncMetrics)
 * já usa, e mesmo mapeamento de campos (via syncCampaignInsights compartilhado) — evita a
 * própria classe de defasagem que causou o gap original.
 *
 * Nunca sincroniza rede não contratada (getProvisionedNetworkCodes) — mesmo que a
 * credencial ainda esteja ativa no banco de um provisionamento anterior já encerrado.
 */
export async function POST(request: NextRequest) {
  try {
    const denied = await requireApiPermission(request, 'campanhasmarketingdigital', 'EXECUTE');
    if (denied) return denied;

    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    const tenantId = payload.tenantId;

    const campaigns = await prisma.campaign.findMany({
      where: {
        tenantId,
        OR: [
          { metaCampaignId: { not: null } },
          { AND: [{ networkId: { not: null } }, { externalId: { not: null } }] },
        ],
      },
      select: { id: true, tenantId: true, metaCampaignId: true, externalId: true, networkId: true },
    });

    if (campaigns.length === 0) {
      return NextResponse.json({ synced: 0, campaigns: 0, message: 'Nenhuma campanha vinculada a uma rede encontrada' });
    }

    const networkIds = Array.from(new Set(campaigns.map(c => c.networkId).filter(Boolean))) as string[];
    const networkCodeById = new Map<string, string>();
    if (networkIds.length > 0) {
      const rows = await prisma.$queryRawUnsafe<{ id: string; code: string }[]>(
        `SELECT id, code FROM public.ad_networks WHERE id = ANY($1::uuid[])`,
        networkIds,
      );
      for (const r of rows) networkCodeById.set(r.id, r.code);
    }

    const provisionedNetworks = await getProvisionedNetworkCodes(tenantId);

    const until = new Date().toISOString().slice(0, 10);
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const byNetwork: Record<string, { synced: number; campaigns: number; errors: string[] }> = {};
    let totalSynced = 0;
    const skippedNotProvisioned = new Set<string>();

    for (const campaign of campaigns) {
      const networkCode = ((campaign.networkId ? networkCodeById.get(campaign.networkId) : null) || 'meta') as NetworkCode;
      const externalId = networkCode === 'meta' ? (campaign.metaCampaignId || campaign.externalId) : campaign.externalId;
      if (!externalId) continue;

      if (!provisionedNetworks.has(networkCode)) {
        skippedNotProvisioned.add(networkCode);
        continue;
      }

      const bucket = byNetwork[networkCode] ?? (byNetwork[networkCode] = { synced: 0, campaigns: 0, errors: [] });

      let networkService: Awaited<ReturnType<typeof getNetworkServiceForTenant>>;
      try {
        networkService = await getNetworkServiceForTenant(tenantId, networkCode);
      } catch {
        bucket.errors.push('Credenciais não configuradas — configure em Configurações > Redes.');
        continue;
      }

      try {
        const count = await syncCampaignInsights(networkService, campaign, externalId, since, until);
        bucket.synced += count;
        bucket.campaigns += 1;
        totalSynced += count;
      } catch (err: any) {
        bucket.errors.push(`${campaign.id.slice(0, 8)}: ${err.message}`);
      }
    }

    return NextResponse.json({
      synced: totalSynced,
      campaigns: campaigns.length,
      byNetwork,
      skippedNotProvisioned: Array.from(skippedNotProvisioned),
    });
  } catch (error: any) {
    console.error('POST /insights/sync error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao sincronizar insights' }, { status: 500 });
  }
}
