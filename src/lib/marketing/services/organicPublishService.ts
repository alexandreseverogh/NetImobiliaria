/**
 * FASE 16 — Postagem Orgânica no Meta
 *
 * Orquestra a publicação orgânica (sem impulsionar) em Página do Facebook / Instagram.
 * 16.B: Facebook (texto, foto única, multi-foto). Instagram chega na 16.C (depende de
 * object storage para image_url pública).
 *
 * Caminho 100% separado do fluxo pago (campaign/adset/targeting).
 */

import { prisma } from '@/lib/marketing/prisma';
import { getNetworkServiceForTenant } from '@/lib/marketing/networks/factory';
import type { MetaAdsAdapter, OrganicPublishInput } from '@/lib/marketing/networks/meta/metaAdsAdapter';

export interface PublishOrganicParams {
  tenantId:    string;
  clientId?:   string | null;   // UUID real ou null (sentinelas 'own'/'segment' já sanitizados no route)
  platform:    'facebook' | 'instagram';
  format:      'text' | 'image' | 'carousel';
  caption?:    string;
  mediaUrls?:  string[];
  assetIds?:   string[];
  link?:       string;
  createdBy?:  string | null;
}

export interface OrganicPostRecord {
  id:             string;
  platform:       string;
  format:         string;
  status:         string;
  externalPostId: string | null;
  permalinkUrl:   string | null;
  errorMessage:   string | null;
}

/**
 * Publica imediatamente e persiste o registro em OrganicPost.
 * Retorna o registro com status final (PUBLISHED ou FAILED).
 */
export async function publishOrganic(params: PublishOrganicParams): Promise<OrganicPostRecord> {
  const { tenantId, clientId, platform, format, caption, mediaUrls = [], assetIds = [], link, createdBy } = params;

  // Instagram (16.C) exige ao menos uma mídia via URL pública
  if (platform === 'instagram' && mediaUrls.length === 0) {
    throw new Error('Instagram exige ao menos uma imagem (URL pública). Não há post somente texto.');
  }

  // 1. Cria o registro em estado PUBLISHING (rastreável mesmo se a API falhar)
  const post = await prisma.organicPost.create({
    data: {
      tenantId,
      clientId:  clientId ?? null,
      platform,
      format,
      caption:   caption ?? null,
      mediaUrls: mediaUrls,
      assetIds:  assetIds.length > 0 ? assetIds : undefined,
      status:    'PUBLISHING',
      createdBy: createdBy ?? null,
    },
  });

  try {
    // 2. Resolve o adapter do Meta (cascata cliente → tenant) e publica
    const service = await getNetworkServiceForTenant(tenantId, 'meta', clientId ?? null);
    const meta    = service as unknown as MetaAdsAdapter;

    const input: OrganicPublishInput = { format, caption, mediaUrls, link };
    const result = platform === 'instagram'
      ? await meta.publishToInstagram(input)
      : await meta.publishToFacebookPage(input);

    // 3. Atualiza para PUBLISHED
    const updated = await prisma.organicPost.update({
      where: { id: post.id },
      data: {
        status:         'PUBLISHED',
        externalPostId: result.postId,
        permalinkUrl:   result.permalink ?? null,
        publishedAt:    new Date(),
      },
    });

    return toRecord(updated);
  } catch (err: any) {
    // 4. Falha → registra erro acionável sem quebrar a galeria
    const message = err?.response?.data?.error?.message || err?.message || 'Erro ao publicar';
    const failed = await prisma.organicPost.update({
      where: { id: post.id },
      data:  { status: 'FAILED', errorMessage: message },
    });
    return toRecord(failed);
  }
}

/** Lista publicações orgânicas do tenant, com filtros opcionais. */
export async function listOrganicPosts(
  tenantId: string,
  opts: { clientId?: string | null; status?: string; platform?: string; limit?: number } = {},
): Promise<OrganicPostRecord[]> {
  const where: any = { tenantId };
  if (opts.clientId === 'own')          where.clientId = null;
  else if (opts.clientId)               where.clientId = opts.clientId;
  if (opts.status)                      where.status = opts.status;
  if (opts.platform)                    where.platform = opts.platform;

  const rows = await prisma.organicPost.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: Math.min(100, Math.max(1, opts.limit ?? 30)),
  });
  return rows.map(toRecord);
}

function toRecord(p: any): OrganicPostRecord {
  return {
    id:             p.id,
    platform:       p.platform,
    format:         p.format,
    status:         p.status,
    externalPostId: p.externalPostId ?? null,
    permalinkUrl:   p.permalinkUrl ?? null,
    errorMessage:   p.errorMessage ?? null,
  };
}
