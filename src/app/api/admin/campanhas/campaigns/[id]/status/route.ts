import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/marketing/prisma';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { getNetworkServiceForTenant } from '@/lib/marketing/networks/factory';
import { requireApiPermission } from '@/lib/auth/apiPermissions';

export const dynamic = 'force-dynamic';

// PATCH /api/admin/campanhas/campaigns/[id]/status
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Verificar permissão de edição server-side
    const denied = await requireApiPermission(request, 'campanhasmarketingdigital', 'UPDATE');
    if (denied) return denied;

    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { status } = await request.json();

    const campaign = await prisma.campaign.findFirst({
      where: { id: params.id, tenantId: payload.tenantId },
    }) as any;

    if (!campaign) {
      return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 });
    }

    const updated = await prisma.campaign.update({
      where: { id: params.id },
      data: { status },
    });

    // Propagate status to the ad network if campaign has an external ID
    const externalId = campaign.external_id || campaign.metaCampaignId;
    if (externalId) {
      const networkCode = campaign.networkCode || 'meta';
      try {
        const networkService = await getNetworkServiceForTenant(payload.tenantId, networkCode);
        await networkService.updateCampaignStatus(externalId, status);
      } catch (err) {
        console.error('Erro ao atualizar status na rede de anúncios:', err);
      }
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao atualizar status' }, { status: 500 });
  }
}
