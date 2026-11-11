import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/marketing/prisma';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { getNetworkServiceForTenant } from '@/lib/marketing/networks/factory';
import { syncCampaignInsights } from '@/lib/marketing/services/agentMonitor';
import { syncAdInsights } from '@/lib/marketing/services/adInsightsSync';
import { syncCampaignAdSets } from '@/lib/marketing/services/importedAdSetsSync';
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
    // 'campanhasmarketingdigital' não é permissão real (só o Master passava). O sync é acionado
    // pelo dashboard de campanhas, então usa o recurso dessa tela.
    const denied = await requireApiPermission(request, 'dashboard-campanhas', 'EXECUTE');
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
      select: { id: true, tenantId: true, clientId: true, metaCampaignId: true, externalId: true, networkId: true, importedReadOnly: true },
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
    const adMetrics: Record<string, any> = {};
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
      } catch (credErr: any) {
        // Mostra o motivo real (não só "não configuradas"): a resolução de credencial pode falhar
        // por outro motivo, como um campo obrigatório ausente nas credenciais salvas.
        bucket.errors.push(`Credenciais: ${credErr?.message || 'não configuradas'} — verifique em Configurações > Redes.`);
        continue;
      }

      // Campanhas importadas: espelha também conjuntos, localização e anúncios (com miniaturas).
      // Antes, isso só acontecia no botão de localização, o que deixava a aba Criativos vazia.
      if (networkCode === 'meta' && campaign.importedReadOnly) {
        try {
          const mirror = await syncCampaignAdSets(campaign.id, externalId, networkService);
          for (const w of mirror.warnings) bucket.errors.push(`${campaign.id.slice(0, 8)} ${w}`);
        } catch (structErr: any) {
          console.warn('[sync] espelho de conjuntos/anúncios falhou:', structErr?.message);
          bucket.errors.push(`${campaign.id.slice(0, 8)}: espelho de anúncios falhou — ${structErr?.message}`);
        }
      }

      try {
        const count = await syncCampaignInsights(networkService, campaign, externalId, since, until);
        // Feedback por anúncio (rankings, retenção, conversas). Falha aqui não invalida a campanha.
        if (networkCode === 'meta') {
          try {
            const ad = await syncAdInsights(networkService, campaign.id, tenantId, since, until);
            adMetrics[campaign.id] = ad;
            if (ad.adsFound > 0 && ad.written === 0) {
              bucket.errors.push(`${campaign.id.slice(0, 8)}: ${ad.adsFound} anúncio(s) encontrado(s), mas a Meta não devolveu métricas por anúncio (consultados: ${ad.adsQueried}, dias recebidos: ${ad.daysReceived}).`);
            }
            for (const e of ad.errors) bucket.errors.push(`${campaign.id.slice(0, 8)} ${e}`);
          } catch (adErr: any) {
            console.warn('[sync] métricas por anúncio falharam:', adErr?.message);
            bucket.errors.push(`${campaign.id.slice(0, 8)}: métricas por anúncio falharam — ${adErr?.message}`);
          }
        }
        bucket.synced += count;
        bucket.campaigns += 1;
        totalSynced += count;
      } catch (err: any) {
        // O axios devolve só "Request failed with status code 400". O motivo real da Meta
        // (ex.: campo não suportado, ID inválido, token sem permissão) fica em response.data.
        const metaMsg = err?.response?.data?.error?.message;
        bucket.errors.push(`${campaign.id.slice(0, 8)}: ${metaMsg || err.message}`);
      }
    }

    return NextResponse.json({
      synced: totalSynced,
      campaigns: campaigns.length,
      byNetwork,
      skippedNotProvisioned: Array.from(skippedNotProvisioned),
      adMetrics,
    });
  } catch (error: any) {
    console.error('POST /insights/sync error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao sincronizar insights' }, { status: 500 });
  }
}
