import { prisma } from '@/lib/marketing/prisma';
import type { AdNetworkService } from '../networks/types';

/**
 * Grava as métricas diárias de cada anúncio da campanha (tabela AdInsight).
 * Usa os anúncios já espelhados em Ad (metaAdId). Sem anúncio espelhado, não faz nada.
 */
export async function syncAdInsights(
  service: AdNetworkService,
  campaignId: string,
  tenantId: string,
  since: string,
  until: string,
): Promise<number> {
  if (!service.fetchAdInsights) return 0;

  const ads = await prisma.ad.findMany({
    where: { metaAdId: { not: null }, adSet: { campaignId } },
    select: { id: true, metaAdId: true },
  });

  let written = 0;
  for (const ad of ads) {
    const days = await service.fetchAdInsights(ad.metaAdId as string, since, until);
    for (const d of days) {
      const date = new Date(`${d.date}T00:00:00.000Z`);
      const data = {
        adId: ad.id,
        campaignId,
        tenantId,
        date,
        impressions: d.impressions,
        reach: d.reach,
        clicks: d.clicks,
        spend: d.spend,
        frequency: d.frequency,
        messagingConversations: d.messagingConversations,
        qualityRanking: d.qualityRanking,
        engagementRateRanking: d.engagementRateRanking,
        conversionRateRanking: d.conversionRateRanking,
        videoViews3s: d.videoViews3s,
        videoViewsP25: d.videoViewsP25,
        videoViewsP50: d.videoViewsP50,
        videoViewsP75: d.videoViewsP75,
        videoViewsP100: d.videoViewsP100,
      };
      await prisma.adInsight.upsert({
        where: { adId_date: { adId: ad.id, date } },
        update: data,
        create: { ...data, id: `${ad.id}-${d.date}` },
      });
      written += 1;
    }
  }
  return written;
}
