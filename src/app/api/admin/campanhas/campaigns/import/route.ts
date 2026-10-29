import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/marketing/prisma';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { requireApiPermission } from '@/lib/auth/apiPermissions';
import { getNetworkServiceForTenant } from '@/lib/marketing/networks/factory';
import type { ExternalCampaignSummary, NetworkCode } from '@/lib/marketing/networks/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/campanhas/campaigns/import?network=meta&clientId=own|<uuid>
 *
 * Lista campanhas que já existem na conta de anúncios real da rede, cruzando com as linhas
 * locais (Campaign.metaCampaignId/externalId) desse tenant pra marcar `alreadyImported` —
 * mesmo padrão de "nunca lançar 500 por falha de 1 rede" já usado em .../redes/balance.
 *
 * Só `meta` tem `fetchAccountCampaigns` implementado nesta 1ª versão — Google/TikTok ficam
 * pra quando os adapters reais ganharem o mesmo método (interface já é genérica).
 */
export async function GET(request: NextRequest) {
  try {
    const denied = await requireApiPermission(request, 'campanhas-importar', 'READ');
    if (denied) return denied;

    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    const tenantId = payload.tenantId;

    const { searchParams } = new URL(request.url);
    const networkCode = (searchParams.get('network') || 'meta') as NetworkCode;

    let service;
    try {
      service = await getNetworkServiceForTenant(tenantId, networkCode);
    } catch (e: any) {
      return NextResponse.json(
        { campaigns: [], error: `Rede "${networkCode}" não conectada para este tenant.` },
        { status: 200 },
      );
    }

    if (!service.fetchAccountCampaigns) {
      return NextResponse.json(
        { campaigns: [], error: `Importação de campanhas ainda não suportada para "${networkCode}".` },
        { status: 200 },
      );
    }

    let external: ExternalCampaignSummary[];
    try {
      external = await service.fetchAccountCampaigns();
    } catch (e: any) {
      return NextResponse.json(
        { campaigns: [], error: e?.response?.data?.error?.message || e.message || 'Erro ao consultar a rede.' },
        { status: 200 },
      );
    }

    // Cruza com o que já existe localmente (qualquer tenant — metaCampaignId é globalmente
    // único no schema, então "já importada por ESTE tenant" e "já existe no banco" coincidem).
    const existing = await prisma.campaign.findMany({
      where: { OR: [
        { metaCampaignId: { in: external.map(c => c.externalId) } },
        { AND: [{ networkId: { not: null } }, { externalId: { in: external.map(c => c.externalId) } }] },
      ]},
      select: { id: true, metaCampaignId: true, externalId: true, importedReadOnly: true },
    });
    // Mapa externalId → id local — necessário pro frontend poder chamar .../manual-ref sem
    // precisar de uma 2ª rota só pra resolver o id (a listagem da rede não conhece nosso id).
    const existingByExternalId = new Map<string, string>();
    for (const c of existing) {
      if (c.metaCampaignId) existingByExternalId.set(c.metaCampaignId, c.id);
      if (c.externalId) existingByExternalId.set(c.externalId, c.id);
    }

    const result = external.map(c => ({
      ...c,
      alreadyImported: existingByExternalId.has(c.externalId),
      localCampaignId: existingByExternalId.get(c.externalId) ?? null,
    }));

    return NextResponse.json({ campaigns: result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/campanhas/campaigns/import
 *
 * Body: { network, externalId, name, objective, status, clientId?, importedReadOnly }
 * Cria a linha local de Campaign apontando pro recurso real — sem AdSet (syncMetrics não
 * depende disso, só de Campaign.metaCampaignId/externalId; ver agentMonitor.ts).
 */
export async function POST(request: NextRequest) {
  try {
    const denied = await requireApiPermission(request, 'campanhas-importar', 'CREATE');
    if (denied) return denied;

    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    const tenantId = payload.tenantId;

    const body = await request.json();
    const {
      network, externalId, name, objective, status, clientId, importedReadOnly,
    } = body as {
      network: NetworkCode;
      externalId: string;
      name: string;
      objective?: string;
      status?: string;
      clientId?: string | null;
      importedReadOnly?: boolean;
    };

    if (!network || !externalId || !name) {
      return NextResponse.json({ error: 'network, externalId e name são obrigatórios' }, { status: 400 });
    }

    // Resolve network_id real (public.ad_networks) — mesmo campo que syncMetrics() usa pra
    // decidir qual adapter chamar por campanha.
    const netRes = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM public.ad_networks WHERE code = ${network} LIMIT 1
    `;
    const networkId = netRes[0]?.id ?? null;

    const resolvedClientId = !clientId || clientId === 'own' ? null : clientId;

    const created = await prisma.campaign.create({
      data: {
        tenantId,
        clientId: resolvedClientId,
        name,
        objective: objective || 'UNKNOWN',
        status: status || 'ACTIVE',
        networkId,
        externalId,
        // Mantém metaCampaignId preenchido pra Meta — campo legado que vários pontos do
        // código (syncMetrics, executeAction) ainda leem com prioridade/fallback.
        metaCampaignId: network === 'meta' ? externalId : null,
        importedReadOnly: importedReadOnly !== false, // default true — é o ponto central do pedido
      },
    });

    return NextResponse.json({ campaign: created }, { status: 201 });
  } catch (err: any) {
    if (err?.code === 'P2002') {
      return NextResponse.json({ error: 'Esta campanha já foi importada.' }, { status: 409 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
