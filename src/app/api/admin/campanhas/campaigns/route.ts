import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/marketing/prisma';
import pool from '@/lib/database/connection';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { getNetworkServiceForTenant } from '@/lib/marketing/networks/factory';
import { requireApiPermission } from '@/lib/auth/apiPermissions';
import type { NetworkCode } from '@/lib/marketing/networks/types';

export const dynamic = 'force-dynamic';

// GET /api/admin/campanhas/campaigns
export async function GET(request: NextRequest) {
  try {
    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId') || undefined;

    const where: any = { tenantId: payload.tenantId };
    if (clientId === 'own') {
      where.clientId = null;          // apenas campanhas próprias
    } else if (clientId) {
      where.clientId = clientId;      // campanhas de um cliente específico
    }
    // sem filtro → retorna todas (próprias + clientes)

    const campaigns = await prisma.campaign.findMany({
      where,
      include: { adSets: { include: { ads: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(campaigns);
  } catch (error: any) {
    console.error('GET /campaigns error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao listar campanhas' }, { status: 500 });
  }
}

// POST /api/admin/campanhas/campaigns
export async function POST(request: NextRequest) {
  try {
    // Verificar permissão de criação server-side
    const denied = await requireApiPermission(request, 'campanhasmarketingdigital', 'CREATE');
    if (denied) return denied;

    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const {
      networkCode = 'meta',
      name, objective, specialAdCategory,
      clientId,
      adSetName, dailyBudget, startTime, endTime,
      optimizationGoal, billingEvent,
      ageMin, ageMax, genders, locations, interests,
      scheduleDays, scheduleStartHour, scheduleEndHour, scheduleTimeSlots,
      creativeType, images, body: adBody, headline, linkUrl, ctaType,
      whatsappNumber, whatsappMessage,
      // Novos campos (revisão 2026-05-29 — camada de lançamento 1.6)
      pixelId,
      customEventType,
      // FASE 6: IDs dos CreativeAssets na biblioteca (para vincular ad_id após lançamento)
      assetIds,
    } = body;

    // Valida clientId (deve pertencer ao tenant)
    if (clientId) {
      const clientCheck = await pool.query(
        'SELECT uuid FROM public.clientes WHERE uuid = $1::uuid AND tenant_id = $2::uuid LIMIT 1',
        [clientId, payload.tenantId]
      );
      if (clientCheck.rows.length === 0) {
        return NextResponse.json({ error: 'Cliente não encontrado ou não pertence ao tenant' }, { status: 400 });
      }
    }

    // 1. Criar campanha
    const campaign = await prisma.campaign.create({
      data: {
        tenantId: payload.tenantId,
        clientId:  clientId || null,
        name,
        objective,
        specialAdCategory,
        status: 'PAUSED',
      },
    });

    // 2. Criar adSet
    const adSet = await prisma.adSet.create({
      data: {
        campaignId: campaign.id,
        name: adSetName || `${name} - AdSet`,
        dailyBudget: Math.round((dailyBudget || 0) * 100),
        startTime: new Date(startTime),
        endTime: endTime ? new Date(endTime) : null,
        optimizationGoal: optimizationGoal || 'LINK_CLICKS',
        billingEvent: billingEvent || 'IMPRESSIONS',
        ageMin: ageMin || 18,
        ageMax: ageMax || 65,
        genders: genders || [],
        locations: locations || { countries: ['BR'] },
        interests: interests || [],
        scheduleDays: scheduleDays || [0, 1, 2, 3, 4, 5, 6],
        scheduleStartHour,
        scheduleEndHour,
        scheduleTimeSlots: scheduleTimeSlots || null,
      },
    });

    // 3. Tracking link
    const trackingId = `${campaign.id.slice(0, 8)}-${Date.now().toString(36)}`;
    let finalLinkUrl = linkUrl;
    if (ctaType === 'WHATSAPP_MESSAGE' && whatsappNumber) {
      const msg = encodeURIComponent(whatsappMessage || '');
      const publicDomain = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      finalLinkUrl = `${publicDomain}/api/r/${trackingId}`;
    }

    // 4. Criar ad
    const ad = await prisma.ad.create({
      data: {
        adSetId: adSet.id,
        name: `${name} - Ad`,
        status: 'PAUSED',
        creativeType,
        images: images || [],
        body: adBody || '',
        headline,
        linkUrl: finalLinkUrl,
        ctaType: ctaType || 'LEARN_MORE',
        trackingId,
      },
    });

    // 4b. FASE 6: vincular CreativeAssets ao ad criado (fecha o loop de correlação visual)
    if (Array.isArray(assetIds) && assetIds.length > 0) {
      try {
        await pool.query(
          `UPDATE campanhasmarketingdigital."CreativeAsset"
           SET ad_id = $1, campaign_id = $2
           WHERE id = ANY($3::uuid[]) AND tenant_id = $4::uuid`,
          [ad.id, campaign.id, assetIds, payload.tenantId]
        );
        console.log(`[FASE6] Vinculados ${assetIds.length} asset(s) ao ad ${ad.id}`);
      } catch (linkErr: any) {
        // Não bloquear o lançamento por erro de vinculação
        console.warn('[FASE6] Falha ao vincular assets:', linkErr.message);
      }
    }

    // 5. Publicar na rede de anúncios selecionada
    try {
      const networkService = await getNetworkServiceForTenant(
        payload.tenantId,
        networkCode as NetworkCode,
        clientId || null,   // cascata: client.page_id ?? tenant.page_id
      );

      const result = await networkService.createCampaign({
        name: campaign.name,
        objective: campaign.objective,
        specialAdCategory: campaign.specialAdCategory || undefined,
        pixelId: pixelId || undefined,
        customEventType: customEventType || undefined,
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
          locations: adSet.locations,
          interests: adSet.interests || [],
          scheduleDays: adSet.scheduleDays || [],
          scheduleStartHour: adSet.scheduleStartHour || undefined,
          scheduleEndHour: adSet.scheduleEndHour || undefined,
          scheduleTimeSlots: adSet.scheduleTimeSlots,
        },
        ad: {
          name: ad.name,
          creativeType: ad.creativeType,
          images: ad.images || [],
          body: ad.body,
          headline: ad.headline || undefined,
          linkUrl: ad.linkUrl || '',
          ctaType: ad.ctaType,
        },
        whatsappNumber,
        whatsappMessage,
      });

      // Persist external IDs (Meta-compat: also write legacy metaCampaignId)
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: {
          metaCampaignId: networkCode === 'meta' ? result.externalId : undefined,
          // FASE 1: store external_id
        } as any,
      });
      // Update external_id via raw SQL to avoid Prisma schema mismatch
      await pool.query(
        `UPDATE campanhasmarketingdigital."Campaign" SET external_id = $1 WHERE id = $2`,
        [result.externalId, campaign.id],
      );
      if (result.externalAdSetId) {
        await prisma.adSet.update({ where: { id: adSet.id }, data: { metaAdSetId: result.externalAdSetId } });
        await pool.query(
          `UPDATE campanhasmarketingdigital."AdSet" SET external_id = $1 WHERE id = $2`,
          [result.externalAdSetId, adSet.id],
        );
      }
      if (result.externalAdId) {
        await prisma.ad.update({ where: { id: ad.id }, data: { metaAdId: result.externalAdId } });
        await pool.query(
          `UPDATE campanhasmarketingdigital."Ad" SET external_id = $1 WHERE id = $2`,
          [result.externalAdId, ad.id],
        );
      }
    } catch (networkError: any) {
      // Credentials not configured or network error — save locally, warn
      return NextResponse.json({
        campaign, adSet, ad,
        networkError: networkError.message || `Erro ao publicar na rede ${networkCode}`,
        warning: `Campanha salva localmente mas não publicada em ${networkCode.toUpperCase()}`,
      }, { status: 201 });
    }

    return NextResponse.json({ campaign, adSet, ad }, { status: 201 });
  } catch (error: any) {
    console.error('POST /campaigns error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao criar campanha' }, { status: 500 });
  }
}
