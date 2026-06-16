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
  format:      'text' | 'image' | 'carousel' | 'video' | 'reel' | 'story';
  caption?:    string;
  mediaUrls?:  string[];
  assetIds?:   string[];
  link?:       string;
  mediaKind?:  'image' | 'video';   // desambigua Stories
  scheduledAt?: string | null;      // ISO — se no futuro, agenda em vez de publicar já
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
  caption:        string | null;
  scheduledAt:    string | null;
  createdAt:      string;
}

/**
 * Publica imediatamente ou AGENDA, persistindo o registro em OrganicPost.
 * - scheduledAt no futuro → cria registro SCHEDULED (publicado depois pelo cron)
 * - caso contrário        → publica já (PUBLISHED ou FAILED)
 */
export async function publishOrganic(params: PublishOrganicParams): Promise<OrganicPostRecord> {
  const { tenantId, clientId, platform, format, caption, mediaUrls = [], assetIds = [], mediaKind, scheduledAt, createdBy } = params;

  // Instagram exige ao menos uma mídia via URL pública (não há post somente texto)
  if (platform === 'instagram' && mediaUrls.length === 0) {
    throw new Error('Instagram exige ao menos uma mídia (URL pública).');
  }

  const scheduleDate = scheduledAt ? new Date(scheduledAt) : null;
  const isScheduled  = !!scheduleDate && scheduleDate.getTime() > Date.now() + 30_000; // 30s de folga

  // 1. Cria o registro (SCHEDULED ou PUBLISHING)
  const post = await prisma.organicPost.create({
    data: {
      tenantId,
      clientId:    clientId ?? null,
      platform,
      format,
      caption:     caption ?? null,
      mediaUrls:   mediaUrls,
      assetIds:    assetIds.length > 0 ? assetIds : undefined,
      mediaKind:   mediaKind ?? null,
      status:      isScheduled ? 'SCHEDULED' : 'PUBLISHING',
      scheduledAt: scheduleDate ?? undefined,
      createdBy:   createdBy ?? null,
    },
  });

  // Agendado → não publica agora; o cron cuidará no horário
  if (isScheduled) return toRecord(post);

  return executePublish(post.id);
}

/**
 * Executa a publicação de um registro OrganicPost já existente (usado tanto na
 * publicação imediata quanto pelo cron de agendados). Atualiza PUBLISHED/FAILED.
 */
export async function executePublish(postId: string): Promise<OrganicPostRecord> {
  const post = await prisma.organicPost.findUnique({ where: { id: postId } });
  if (!post) throw new Error('Publicação não encontrada');

  try {
    const service = await getNetworkServiceForTenant(post.tenantId, 'meta', post.clientId ?? null);
    const meta    = service as unknown as MetaAdsAdapter;

    const input: OrganicPublishInput = {
      format:    post.format as OrganicPublishInput['format'],
      caption:   post.caption ?? undefined,
      mediaUrls: Array.isArray(post.mediaUrls) ? (post.mediaUrls as string[]) : [],
      mediaKind: (post.mediaKind as 'image' | 'video' | null) ?? undefined,
    };
    const result = post.platform === 'instagram'
      ? await meta.publishToInstagram(input)
      : await meta.publishToFacebookPage(input);

    const updated = await prisma.organicPost.update({
      where: { id: post.id },
      data: {
        status:         'PUBLISHED',
        externalPostId: result.postId,
        permalinkUrl:   result.permalink ?? null,
        publishedAt:    new Date(),
        errorMessage:   null,
      },
    });
    return toRecord(updated);
  } catch (err: any) {
    const message = err?.response?.data?.error?.message || err?.message || 'Erro ao publicar';
    const failed = await prisma.organicPost.update({
      where: { id: post.id },
      data:  { status: 'FAILED', errorMessage: message },
    });
    return toRecord(failed);
  }
}

/**
 * Publica todos os posts agendados cujo horário já chegou (usado pelo cron).
 * Retorna um resumo de execução.
 */
export async function runDueScheduledPosts(): Promise<{ due: number; published: number; failed: number }> {
  const duePosts = await prisma.organicPost.findMany({
    where: { status: 'SCHEDULED', scheduledAt: { lte: new Date() } },
    select: { id: true },
    take: 100,
  });

  let published = 0, failed = 0;
  for (const p of duePosts) {
    const rec = await executePublish(p.id).catch(() => null);
    if (rec?.status === 'PUBLISHED') published++; else failed++;
  }
  return { due: duePosts.length, published, failed };
}

/** Cancela um agendamento ou remove um rascunho. */
export async function cancelOrganicPost(tenantId: string, id: string): Promise<boolean> {
  const res = await prisma.organicPost.deleteMany({
    where: { id, tenantId, status: { in: ['DRAFT', 'SCHEDULED', 'FAILED'] } },
  });
  return res.count > 0;
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
    caption:        p.caption ?? null,
    scheduledAt:    p.scheduledAt ? (p.scheduledAt instanceof Date ? p.scheduledAt.toISOString() : p.scheduledAt) : null,
    createdAt:      (p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt) ?? new Date().toISOString(),
  };
}
