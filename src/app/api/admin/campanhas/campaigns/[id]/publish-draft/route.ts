import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/marketing/prisma';
import pool from '@/lib/database/connection';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { getNetworkServiceForTenant } from '@/lib/marketing/networks/factory';
import { requireApiPermission } from '@/lib/auth/apiPermissions';
import type { NetworkCode } from '@/lib/marketing/networks/types';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/campanhas/campaigns/[id]/publish-draft
 * Publica na rede um rascunho com vídeo (salvo sem lançar). Nasce PAUSADA na rede, igual ao
 * "Salvar" do wizard: ativar continua sendo uma decisão separada.
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const denied = await requireApiPermission(request, 'configuracoes-campanhas', 'UPDATE');
    if (denied) return denied;

    const payload = getTokenPayload(request);
    if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const campaign = await prisma.campaign.findFirst({
      where: { id: params.id, tenantId: payload.tenantId },
      include: { adSets: { include: { ads: true } } },
    }) as any;
    if (!campaign) return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 });
    if (campaign.externalId) {
      return NextResponse.json({ error: 'Esta campanha já foi publicada na rede.' }, { status: 409 });
    }

    const adSet = campaign.adSets?.[0];
    const ad = adSet?.ads?.[0];
    if (!adSet || !ad) return NextResponse.json({ error: 'Rascunho incompleto: conjunto ou anúncio ausente.' }, { status: 400 });

    const videoRes = await pool.query(
      `SELECT storage_url, upload_status FROM campanhasmarketingdigital."CreativeAsset"
        WHERE campaign_id = $1 AND tenant_id = $2::uuid AND format = 'video' AND is_active = true`,
      [params.id, payload.tenantId],
    );
    const video = videoRes.rows[0];
    if (!video?.storage_url || video.upload_status !== 'ready') {
      return NextResponse.json({ error: 'O vídeo deste rascunho não está pronto para publicação.' }, { status: 400 });
    }

    const netRes = await pool.query(`SELECT code FROM public.ad_networks WHERE id = $1`, [campaign.networkId]);
    const networkCode = (netRes.rows[0]?.code ?? 'meta') as NetworkCode;

    let result;
    try {
      const networkService = await getNetworkServiceForTenant(payload.tenantId, networkCode, campaign.clientId || null);
      result = await networkService.createCampaign({
        launchNow: false,
        name: campaign.name,
        objective: campaign.objective,
        specialAdCategory: campaign.specialAdCategory || undefined,
        adSet: {
          name: adSet.name,
          dailyBudget: adSet.dailyBudget,
          startTime: adSet.startTime.toISOString(),
          endTime: adSet.endTime?.toISOString(),
          optimizationGoal: adSet.optimizationGoal,
          billingEvent: adSet.billingEvent,
          ageMin: adSet.ageMin,
          ageMax: adSet.ageMax,
          genders: adSet.genders || [],
          locations: adSet.locations as Record<string, any>,
          interests: (adSet.interests || []) as any[],
          scheduleDays: adSet.scheduleDays || [],
          scheduleStartHour: adSet.scheduleStartHour || undefined,
          scheduleEndHour: adSet.scheduleEndHour || undefined,
          scheduleTimeSlots: adSet.scheduleTimeSlots,
        },
        ad: {
          name: ad.name,
          creativeType: 'VIDEO',
          images: [],
          videoUrl: video.storage_url,
          body: ad.body,
          headline: ad.headline || undefined,
          linkUrl: ad.linkUrl,
          ctaType: ad.ctaType,
        },
      });
    } catch (networkError: any) {
      console.error(`[PUBLISH-DRAFT] Falha ao publicar em ${networkCode} (campaign ${params.id}):`, networkError?.message || networkError);
      return NextResponse.json({ error: networkError?.message || `Erro ao publicar na rede ${networkCode}` }, { status: 502 });
    }

    // Grava os IDs externos, como o POST de criação faz.
    await pool.query(`UPDATE campanhasmarketingdigital."Campaign" SET external_id = $1 WHERE id = $2`, [result.externalId, params.id]);
    if (result.externalAdSetId) {
      await pool.query(`UPDATE campanhasmarketingdigital."AdSet" SET external_id = $1 WHERE id = $2`, [result.externalAdSetId, adSet.id]);
    }
    if (result.externalAdId) {
      await pool.query(`UPDATE campanhasmarketingdigital."Ad" SET external_id = $1 WHERE id = $2`, [result.externalAdId, ad.id]);
    }
    return NextResponse.json({ ok: true, externalId: result.externalId, status: 'PAUSED' });
  } catch (error: any) {
    console.error('[PUBLISH-DRAFT] erro:', error);
    return NextResponse.json({ error: 'Não foi possível publicar o rascunho.' }, { status: 500 });
  }
}
