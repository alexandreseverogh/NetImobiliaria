import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/marketing/prisma';
import pool from '@/lib/database/connection';
import { getNetworkServiceForTenant } from '@/lib/marketing/networks/factory';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import type { GoogleCampaignInput } from '@/lib/marketing/networks/types';

export async function POST(request: NextRequest) {
  try {
    const payload = getTokenPayload(request);
    const tenantId = payload?.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { payload: campaignPayload, clientId, assetIds } = body;

    if (!campaignPayload) {
      return NextResponse.json({ error: 'Payload missing' }, { status: 400 });
    }

    const input: GoogleCampaignInput = campaignPayload;

    let networkService;
    try {
      networkService = await getNetworkServiceForTenant(tenantId, 'google', clientId);
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    // Pass the payload to Google Ads API
    // NOTA: fluxo cria na rede antes de persistir localmente (diferente do fluxo Meta, que
    // salva um rascunho local primeiro e tenta publicar depois). Será revisitado na FASE 1/A3
    // do plano (docs/PLANO_GOOGLE_TIKTOK.md) quando o adapter for completado de verdade.
    const result = await networkService.createCampaign(input);

    // Resolve network_id (public.ad_networks) — mesma convenção usada em campaigns/route.ts
    const networkRes = await pool.query(
      `SELECT id FROM public.ad_networks WHERE code = 'google' LIMIT 1`,
    );
    const networkId = networkRes.rows[0]?.id || null;

    // Salvar no BD (Campaign + AdSet mínimo — dashboards leem budget via campaign.adSets[])
    const campaign = await prisma.campaign.create({
      data: {
        tenantId,
        clientId: clientId || null,
        name: input.name,
        objective: 'LEADS',
        status: 'DRAFT',
        networkId,
        externalId: result.externalId,
      }
    });

    await prisma.adSet.create({
      data: {
        campaignId: campaign.id,
        name: `${input.name} - AdSet`,
        dailyBudget: input.budget, // cents
        startTime: new Date(),
        optimizationGoal: input.biddingStrategy?.type || 'MAXIMIZE_CONVERSIONS',
        billingEvent: 'IMPRESSIONS',
        ageMin: 18,
        ageMax: 65,
        genders: [],
        locations: { countries: ['BR'] },
        interests: input.audienceSignals?.keywords || [],
        scheduleDays: [0, 1, 2, 3, 4, 5, 6],
      },
    });

    // Se houver assetIds associados, vincula à campanha (mesmo padrão FASE 6 do fluxo Meta —
    // ver campaigns/route.ts. Google/PMax não cria um "Ad" por asset, só vincula ao campaign_id).
    if (Array.isArray(assetIds) && assetIds.length > 0) {
      try {
        await pool.query(
          `UPDATE campanhasmarketingdigital."CreativeAsset"
           SET campaign_id = $1
           WHERE id = ANY($2::uuid[]) AND tenant_id = $3::uuid`,
          [campaign.id, assetIds, tenantId],
        );
      } catch (linkErr: any) {
        console.warn('[google/route] Falha ao vincular assets:', linkErr.message);
      }
    }

    return NextResponse.json({ success: true, campaign });
  } catch (err: any) {
    console.error('[POST /api/admin/campanhas/google]', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
