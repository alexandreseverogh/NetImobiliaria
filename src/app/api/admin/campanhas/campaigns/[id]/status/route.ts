import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/marketing/prisma';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { getNetworkServiceForTenant } from '@/lib/marketing/networks/factory';
import { requireApiPermission } from '@/lib/auth/apiPermissions';
import { transitionCampaign } from '@/lib/marketing/services/campaignStateMachine';
import { VALID_TRANSITIONS, type LifecycleStatus } from '@/lib/marketing/services/campaignLifecycleTypes';

export const dynamic = 'force-dynamic';

// PATCH /api/admin/campanhas/campaigns/[id]/status
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Verificar permissão de edição server-side
    // 'campanhasmarketingdigital' nunca foi um slug real de permissão — só o Master passava.
    // 'configuracoes-campanhas' é o recurso real que o admin do tenant recebe.
    const denied = await requireApiPermission(request, 'configuracoes-campanhas', 'UPDATE');
    if (denied) return denied;

    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { status } = await request.json();
    if (!['ACTIVE', 'PAUSED', 'ARCHIVED'].includes(status)) {
      return NextResponse.json({ error: 'Status inválido' }, { status: 400 });
    }

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

    // Ciclo de vida acompanha a ação: ativar sai do rascunho (DRAFT → READY → LEARNING, a fase
    // real de uma campanha recém-ativa); pausar vai para PAUSED quando a transição é permitida.
    // Falha aqui nunca bloqueia a ativação/pausa em si — só fica registrada no log.
    try {
      const current = (campaign as any).lifecycleStatus as LifecycleStatus;
      if (status === 'ACTIVE') {
        if (current === 'DRAFT') {
          await transitionCampaign(params.id, 'READY', 'MANUAL', 'Ativada pelo usuário');
          await transitionCampaign(params.id, 'LEARNING', 'MANUAL', 'Campanha ativa, em aprendizado');
        } else if (current === 'READY') {
          await transitionCampaign(params.id, 'LEARNING', 'MANUAL', 'Campanha ativa, em aprendizado');
        }
      } else if (status === 'PAUSED' && current && VALID_TRANSITIONS[current]?.includes('PAUSED')) {
        await transitionCampaign(params.id, 'PAUSED', 'MANUAL', 'Pausada pelo usuário');
      } else if (status === 'ARCHIVED' && current && VALID_TRANSITIONS[current]?.includes('KILLED')) {
        // Arquivar é o encerramento definitivo do ciclo de vida (KILLED).
        await transitionCampaign(params.id, 'KILLED', 'MANUAL', 'Arquivada pelo usuário');
      }
    } catch (err) {
      console.error('[campaign status] falha ao atualizar ciclo de vida:', err);
    }

    // Ativar/pausar vale para a campanha INTEIRA: conjuntos e anúncios acompanham (senão a
    // campanha fica ativa mas sem nenhum anúncio veiculando). Só status ACTIVE/PAUSED.
    if (status === 'ACTIVE' || status === 'PAUSED' || status === 'ARCHIVED') {
      await prisma.ad.updateMany({
        where: { adSet: { campaignId: params.id } },
        data: { status },
      });
    }

    // Propaga para a rede: campanha, conjuntos e anúncios que já têm ID externo.
    const networkCode = campaign.networkCode || 'meta';
    const externalIds: string[] = [];
    const campaignExternal = campaign.external_id || campaign.metaCampaignId;
    if (campaignExternal) externalIds.push(campaignExternal);
    const adSets = await prisma.adSet.findMany({ where: { campaignId: params.id } });
    adSets.forEach((s: any) => { if (s.metaAdSetId) externalIds.push(s.metaAdSetId); });
    const ads = await prisma.ad.findMany({ where: { adSet: { campaignId: params.id } } });
    ads.forEach((a: any) => { if (a.metaAdId) externalIds.push(a.metaAdId); });

    if (externalIds.length > 0) {
      try {
        const networkService = await getNetworkServiceForTenant(payload.tenantId, networkCode);
        // Arquivar exige pausar antes na rede: campanha ativa nunca vai direto para arquivada,
        // assim nenhuma verba continua sendo gasta enquanto o arquivamento é processado.
        if (status === 'ARCHIVED') {
          for (const id of externalIds) {
            await networkService.updateCampaignStatus(id, 'PAUSED');
          }
        }
        for (const id of externalIds) {
          await networkService.updateCampaignStatus(id, status);
        }
      } catch (err) {
        console.error('Erro ao atualizar status na rede de anúncios:', err);
      }
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao atualizar status' }, { status: 500 });
  }
}
