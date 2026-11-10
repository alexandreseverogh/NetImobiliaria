import { prisma } from '@/lib/marketing/prisma';
import type { AdNetworkService } from '../networks/types';

/**
 * Espelha os conjuntos de anúncios REAIS de uma campanha (importada ou criada fora da
 * plataforma) como linhas de AdSet, com o direcionamento de localização da rede.
 *
 * Por que existe: o mapa de geolocalização lê AdSet.locations. Uma campanha importada só
 * tinha a linha de Campaign, então o mapa ficava vazio mesmo com localização definida na Meta.
 *
 * Best-effort: quem chama decide se uma falha aqui bloqueia algo (a importação não bloqueia).
 */
export async function syncCampaignAdSets(
  localCampaignId: string,
  externalCampaignId: string,
  service: AdNetworkService,
): Promise<{ adSets: number; supported: boolean }> {
  if (!service.fetchCampaignAdSets) return { adSets: 0, supported: false };

  const rows = await service.fetchCampaignAdSets(externalCampaignId);
  for (const r of rows) {
    const data = {
      campaignId:       localCampaignId,
      name:             r.name,
      dailyBudget:      r.dailyBudget,
      startTime:        r.startTime ? new Date(r.startTime) : new Date(),
      endTime:          r.endTime ? new Date(r.endTime) : null,
      optimizationGoal: r.optimizationGoal,
      billingEvent:     r.billingEvent,
      ageMin:           r.ageMin,
      ageMax:           r.ageMax,
      genders:          r.genders,
      locations:        (r.geoLocations ?? {}) as any,
    };
    await prisma.adSet.upsert({
      where:  { metaAdSetId: r.externalId },
      update: data,
      create: { ...data, metaAdSetId: r.externalId },
    });
  }
  return { adSets: rows.length, supported: true };
}
