import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/marketing/prisma';
import { getTokenPayload } from '@/lib/auth/jwt-node';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/campanhas/google/search-terms
 * FASE 1 (Google Ads) A7 — drill-down de revisão manual: termos de busca agregados por
 * (campanha, termo, match type) na janela pedida, + resumo por campanha (IS Lost Budget, ROAS)
 * vindo de Insight (grão campanha-dia, já populado por fetchInsights desde a A2/A3).
 *
 * Query params: campaignId? (filtra 1 campanha), status? ('none' | 'negated' | 'added_as_keyword'
 * | 'all', default 'none' — o caso de uso principal é "o que ainda não foi tratado"), windowDays?
 * (default 30).
 */
export async function GET(request: NextRequest) {
  try {
    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    const tenantId = payload.tenantId;

    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId') || undefined;
    const status = searchParams.get('status') || 'none';
    const windowDays = Math.min(Math.max(parseInt(searchParams.get('windowDays') || '30', 10) || 30, 1), 90);
    const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

    // Campanhas Google do tenant (a UI precisa do nome pra exibir, mesmo sem termos ainda)
    const campaignIdFilter = campaignId ? Prisma.sql`AND cam.id = ${campaignId}` : Prisma.empty;
    const campaignRows = await prisma.$queryRaw<{ id: string; name: string }[]>`
      SELECT cam.id, cam.name
      FROM campanhasmarketingdigital."Campaign" cam
      JOIN public.ad_networks n ON n.id = cam."network_id"
      WHERE cam."tenant_id" = ${tenantId}::uuid AND n.code = 'google'
      ${campaignIdFilter}
    `.catch(() => [] as { id: string; name: string }[]);

    const campaignIds = campaignRows.map(c => c.id);
    if (campaignIds.length === 0) {
      return NextResponse.json({ campaigns: [], terms: [] });
    }

    const statusFilter = status === 'all' ? Prisma.empty : Prisma.sql`AND status = ${status}`;

    const terms = await prisma.$queryRaw<{
      campaign_id: string; search_term: string; match_type: string; status: string;
      impressions: number; clicks: number; cost: number; conversions: number;
    }[]>`
      SELECT campaign_id, search_term, match_type, MAX(status) as status,
             SUM(impressions)::int AS impressions, SUM(clicks)::int AS clicks,
             SUM(cost)::float AS cost, SUM(conversions)::int AS conversions
      FROM campanhasmarketingdigital."GoogleSearchTerm"
      WHERE campaign_id = ANY(${campaignIds}::text[])
        AND tenant_id = ${tenantId}::uuid
        AND date >= ${since}
        ${statusFilter}
      GROUP BY campaign_id, search_term, match_type
      ORDER BY SUM(cost) DESC
    `;

    // Resumo por campanha (IS Lost Budget médio + ROAS) — vem de Insight, não de GoogleSearchTerm
    const summaryRows = await prisma.$queryRaw<{
      campaign_id: string; avg_is_lost: number; total_spend: number; total_conv_value: number;
    }[]>`
      SELECT "campaignId" as campaign_id,
             AVG(search_budget_lost_is)::float AS avg_is_lost,
             SUM(spend)::float AS total_spend,
             SUM(conversions_value)::float AS total_conv_value
      FROM campanhasmarketingdigital."Insight"
      WHERE "campaignId" = ANY(${campaignIds}::text[])
        AND tenant_id = ${tenantId}::uuid
        AND date >= ${since}
      GROUP BY "campaignId"
    `;
    const summaryByCampaign = new Map(summaryRows.map(r => [r.campaign_id, r]));

    const campaigns = campaignRows.map(c => {
      const s = summaryByCampaign.get(c.id);
      const spend = s?.total_spend || 0;
      const convValue = s?.total_conv_value || 0;
      return {
        id: c.id,
        name: c.name,
        avgSearchBudgetLostIs: s?.avg_is_lost || 0,
        roas: spend > 0 ? convValue / spend : null,
      };
    });

    return NextResponse.json({
      campaigns,
      terms: terms.map(t => ({
        campaignId: t.campaign_id,
        searchTerm: t.search_term,
        matchType: t.match_type,
        status: t.status,
        impressions: t.impressions,
        clicks: t.clicks,
        cost: t.cost,
        conversions: t.conversions,
      })),
    });
  } catch (error: any) {
    console.error('GET /campanhas/google/search-terms error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao listar termos de busca' }, { status: 500 });
  }
}
