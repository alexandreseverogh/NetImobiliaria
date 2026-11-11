import { prisma } from '@/lib/marketing/prisma';
import type { AdNetworkService } from '../networks/types';

export interface AdInsightsSyncResult {
  adsFound: number;        // anúncios desta campanha espelhados localmente (com ID da Meta)
  adsQueried: number;      // quantos foram consultados na rede
  daysReceived: number;    // dias de métricas devolvidos pela rede (somando os anúncios)
  written: number;         // registros gravados em AdInsight
  errors: string[];        // falhas por anúncio (sem interromper os demais)
  supported: boolean;      // a rede expõe métricas por anúncio?
}

/**
 * Grava as métricas diárias de cada anúncio da campanha (tabela AdInsight).
 * Usa os anúncios já espelhados em Ad (metaAdId). Cada anúncio é independente: uma falha
 * não interrompe os demais, e o resultado traz contagens para diagnóstico.
 */
export async function syncAdInsights(
  service: AdNetworkService,
  campaignId: string,
  tenantId: string,
  since: string,
  until: string,
): Promise<AdInsightsSyncResult> {
  const result: AdInsightsSyncResult = { adsFound: 0, adsQueried: 0, daysReceived: 0, written: 0, errors: [], supported: !!service.fetchAdInsights };
  if (!service.fetchAdInsights) return result;

  const ads = await prisma.ad.findMany({
    where: { metaAdId: { not: null }, adSet: { campaignId } },
    select: { id: true, metaAdId: true },
  });
  result.adsFound = ads.length;

  for (const ad of ads) {
    try {
      const days = await service.fetchAdInsights(ad.metaAdId as string, since, until);
      result.adsQueried += 1;
      result.daysReceived += days.length;
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
        result.written += 1;
      }
    } catch (e: any) {
      const metaMsg = e?.response?.data?.error?.message;
      result.errors.push(`anúncio ${ad.metaAdId}: ${metaMsg || e?.message || 'erro desconhecido'}`);
    }
  }
  return result;
}
