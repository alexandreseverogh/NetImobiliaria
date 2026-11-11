import axios from 'axios';
import sharp from 'sharp';
import { prisma } from '@/lib/marketing/prisma';
import type { AdNetworkService } from '../networks/types';
import { isS3Configured, uploadToS3, getS3Url } from '@/lib/storage/s3-client';

const MAX_CARDS = 10;          // limite de cartões de carrossel guardados
const THUMB_SIZE = 320;        // lado máximo da miniatura da lista (px)

/**
 * Guarda os criativos de um anúncio em DUAS versões:
 *  - imagem original (para o modal, sem perda de qualidade);
 *  - miniatura de 320px (para a lista, carrega rápido).
 * URLs da Meta expiram, por isso são baixadas e gravadas no nosso armazenamento.
 * Best-effort: sem S3 ou falha de download, devolve listas vazias sem derrubar a sincronização.
 */
export async function storeAdImages(
  tenantId: string,
  metaAdId: string,
  fullUrls: string[],
): Promise<{ images: string[]; thumbnails: string[] }> {
  const images: string[] = [];
  const thumbnails: string[] = [];
  if (!isS3Configured() || fullUrls.length === 0) return { images, thumbnails };

  for (let i = 0; i < Math.min(fullUrls.length, MAX_CARDS); i++) {
    try {
      const res = await axios.get(fullUrls[i], { responseType: 'arraybuffer', timeout: 20000 });
      const buffer = Buffer.from(res.data);
      const ct = String(res.headers['content-type'] || 'image/jpeg').split(';')[0];
      const ext = ct.includes('png') ? 'png' : ct.includes('webp') ? 'webp' : 'jpg';

      const fullKey = `criativos/${tenantId}/meta/${metaAdId}-${i}.${ext}`;
      await uploadToS3(fullKey, buffer, ct);
      const fullUrl = getS3Url(fullKey);
      if (fullUrl) images.push(fullUrl);

      const thumbBuffer = await sharp(buffer)
        .resize(THUMB_SIZE, THUMB_SIZE, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 82 })
        .toBuffer();
      const thumbKey = `criativos/${tenantId}/meta/${metaAdId}-${i}-thumb.jpg`;
      await uploadToS3(thumbKey, thumbBuffer, 'image/jpeg');
      const thumbUrl = getS3Url(thumbKey);
      if (thumbUrl) thumbnails.push(thumbUrl);
    } catch (e: any) {
      console.warn('[ads] falha ao guardar imagem do anúncio', metaAdId, e?.message);
    }
  }
  return { images, thumbnails };
}

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
): Promise<{ adSets: number; ads: number; supported: boolean; warnings: string[] }> {
  const warnings: string[] = [];
  if (!service.fetchCampaignAdSets) return { adSets: 0, ads: 0, supported: false, warnings };

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

  // Anúncios: espelho local em Ad, ligado ao AdSet pelo ID externo. Sem trackingId — o link
  // rastreado só existe nas campanhas criadas pela plataforma.
  let ads = 0;
  if (service.fetchCampaignAds) {
    const adRows = await service.fetchCampaignAds(externalCampaignId);
    const campaign = await prisma.campaign.findUnique({ where: { id: localCampaignId }, select: { tenantId: true } });

    // Imagens em tamanho original, buscadas por hash (uma chamada para a conta inteira).
    let fullByHash: Record<string, string> = {};
    if (service.fetchAdImageUrls) {
      const allHashes = adRows.flatMap(a => a.imageHashes ?? []);
      try { fullByHash = await service.fetchAdImageUrls(allHashes); }
      catch (e: any) { console.warn('[ads] falha ao buscar imagens originais:', e?.message); }
    }

    for (const a of adRows) {
      const parent = await prisma.adSet.findUnique({ where: { metaAdSetId: a.externalAdSetId }, select: { id: true } });
      if (!parent) continue;

      // Sempre rebaixa a imagem: anúncios guardados antes com miniatura pequena são corrigidos aqui.
      const existing = await prisma.ad.findUnique({ where: { metaAdId: a.externalId }, select: { thumbnails: true, images: true } });
      let stored = { images: existing?.images ?? [], thumbnails: existing?.thumbnails ?? [] };
      {
        // Preferência: original por hash; sem hash, a melhor URL disponível da própria Meta.
        let fullUrls: string[] = [];
        if ((a.imageHashes ?? []).length) {
          fullUrls = (a.imageHashes ?? []).map((h, i) => fullByHash[h] ?? a.imageUrls?.[i]).filter(Boolean) as string[];
        }
        // Sem hash: tenta a imagem original da publicação; sem ela, usa a melhor URL da própria Meta.
        if (!fullUrls.some(u => !/p64x64|pd+xd+/.test(u)) && a.storyId && service.fetchPostImages) {
          try {
            const fromPost = await service.fetchPostImages(a.storyId);
            if (fromPost.length) fullUrls = fromPost;
          } catch (e: any) {
            warnings.push(`anúncio ${a.externalId}: ${e?.message}`);
          }
        }
        if (fullUrls.length === 0) fullUrls = a.imageUrls ?? [];
        stored = await storeAdImages(campaign?.tenantId ?? '', a.externalId, fullUrls);
      }

      const data = {
        adSetId: parent.id,
        name: a.name,
        status: a.status,
        creativeType: a.creativeType,
        body: a.body,
        headline: a.headline,
        linkUrl: a.linkUrl,
        ctaType: a.ctaType ?? 'LEARN_MORE',
        images: stored.images,
        thumbnails: stored.thumbnails,
      };
      await prisma.ad.upsert({
        where: { metaAdId: a.externalId },
        update: data,
        create: { ...data, metaAdId: a.externalId },
      });
      ads += 1;
    }
  }
  return { adSets: rows.length, ads, supported: true, warnings };
}
