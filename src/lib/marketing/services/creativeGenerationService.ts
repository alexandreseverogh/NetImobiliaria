/**
 * FASE 6.5 — Produção de Criativos por Reaproveitamento (Estágio A)
 *
 * Gera variações de criativos a custo zero usando Sharp:
 *   1. Busca imagem fonte do MinIO/S3
 *   2. Smart-crop (attention/entropy) para cada formato solicitado
 *   3. Gera overlay SVG (headline + CTA + logo) com tipografia via template
 *   4. Compõe imagem + SVG e faz upload para S3
 *   5. Registra CreativeGenerationJob para gate de aprovação humana
 *
 * Guardrail: NENHUM artefato é promovido a CreativeAsset sem aprovação explícita.
 */

import sharp from 'sharp';
import { uploadToS3 } from '@/lib/storage/s3-client';
import prisma from '@/lib/marketing/prisma';

/* ── Constantes de formato ─────────────────────────────────────────────────── */

const FORMAT_DIMS: Record<string, { w: number; h: number }> = {
  '1:1':  { w: 1080, h: 1080 },
  '4:5':  { w: 1080, h: 1350 },
  '9:16': { w: 1080, h: 1920 },
};

/* ── Tipos públicos ────────────────────────────────────────────────────────── */

export interface GenerateInput {
  tenantId:      string;
  sourceAssetId: string;
  sourceUrl:     string;       // URL pública ou S3 da imagem fonte
  templateId?:   string | null;
  concept?: {
    headline?: string;
    body?:     string;
    cta?:      string;
  };
  formats: string[];           // ['1:1', '9:16', '4:5']
  createdBy?: string | null;
}

export interface GenerationJobRecord {
  id:           string;
  tenantId:     string;
  sourceAssetId: string;
  templateId:   string | null;
  concept:      any;
  formats:      string[];
  status:       string;
  outputUrls:   string[];
  errorMessage: string | null;
  createdAt:    string;
  reviewedAt:   string | null;
}

/* ── Helpers de SVG overlay ────────────────────────────────────────────────── */

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length > maxChars) {
      if (line) lines.push(line.trim());
      line = w;
    } else {
      line = (line + ' ' + w).trim();
    }
  }
  if (line) lines.push(line.trim());
  return lines;
}

interface LayoutConfig {
  bgOpacity:        number;
  headlineFontSize: number;
  headlineColor:    string;
  headlineShadow:   boolean;
  ctaBg:            string;
  ctaColor:         string;
  ctaFontSize:      number;
  logoPosition:     string;
  logoSize:         number;
  padding:          number;
}

const DEFAULT_LAYOUT: LayoutConfig = {
  bgOpacity: 0.45, headlineFontSize: 48, headlineColor: '#FFFFFF',
  headlineShadow: true, ctaBg: '#1877F2', ctaColor: '#FFFFFF',
  ctaFontSize: 22, logoPosition: 'top-right', logoSize: 80, padding: 40,
};

function buildSvgOverlay(
  w: number,
  h: number,
  headline: string,
  cta: string,
  layout: LayoutConfig,
): string {
  const { padding, headlineFontSize, headlineColor, headlineShadow,
          ctaBg, ctaColor, ctaFontSize, bgOpacity } = layout;

  const maxCharsPerLine = Math.floor((w - padding * 2) / (headlineFontSize * 0.55));
  const lines = wrapText(headline || '', maxCharsPerLine).slice(0, 3);
  const lineH  = headlineFontSize * 1.25;
  const textBlockH = lines.length * lineH;

  // Gradiente inferior para legibilidade do texto
  const gradId = 'grad1';
  const shadow = headlineShadow
    ? `filter="url(#shadow)"`
    : '';

  // Posição do bloco de texto: 60% da altura
  const textY = h * 0.60;
  // CTA acima do bottom
  const ctaY  = h - padding - ctaFontSize * 2.5;
  const ctaW  = cta ? Math.min(w - padding * 2, cta.length * ctaFontSize * 0.7 + 80) : 0;

  const linesXml = lines.map((l, i) =>
    `<text x="${w / 2}" y="${textY + i * lineH}"
       font-family="Arial, Helvetica, sans-serif"
       font-size="${headlineFontSize}" font-weight="bold"
       fill="${escapeXml(headlineColor)}" text-anchor="middle"
       ${shadow}>${escapeXml(l)}</text>`,
  ).join('\n  ');

  const ctaXml = cta
    ? `<rect x="${(w - ctaW) / 2}" y="${ctaY}" width="${ctaW}" height="${ctaFontSize * 2.2}"
         rx="8" fill="${escapeXml(ctaBg)}"/>
       <text x="${w / 2}" y="${ctaY + ctaFontSize * 1.5}"
         font-family="Arial, Helvetica, sans-serif"
         font-size="${ctaFontSize}" font-weight="bold"
         fill="${escapeXml(ctaColor)}" text-anchor="middle">${escapeXml(cta)}</text>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <defs>
    <linearGradient id="${gradId}" x1="0" y1="0.5" x2="0" y2="1">
      <stop offset="0%" stop-color="black" stop-opacity="0"/>
      <stop offset="100%" stop-color="black" stop-opacity="${bgOpacity}"/>
    </linearGradient>
    <filter id="shadow">
      <feDropShadow dx="1" dy="1" stdDeviation="3" flood-color="black" flood-opacity="0.7"/>
    </filter>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#${gradId})"/>
  ${linesXml}
  ${ctaXml}
</svg>`;
}

/* ── Download de imagem ────────────────────────────────────────────────────── */

async function fetchImageBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`Falha ao baixar imagem: HTTP ${res.status}`);
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

/* ── Geração de uma variação ───────────────────────────────────────────────── */

async function renderVariation(
  sourceBuffer: Buffer,
  format: string,
  concept: { headline?: string; cta?: string },
  layout: LayoutConfig,
): Promise<Buffer> {
  const dims = FORMAT_DIMS[format];
  if (!dims) throw new Error(`Formato desconhecido: ${format}`);

  const { w, h } = dims;

  // 1. Smart-crop (Sharp usa attention por padrão ao redimensionar com crop)
  const cropped = await sharp(sourceBuffer)
    .resize(w, h, { fit: 'cover', position: 'attention' })
    .toBuffer();

  // 2. Overlay SVG
  const svgBuffer = Buffer.from(buildSvgOverlay(
    w, h,
    concept.headline ?? '',
    concept.cta      ?? '',
    layout,
  ));

  // 3. Composite imagem + SVG → JPEG 90%
  const composed = await sharp(cropped)
    .composite([{ input: svgBuffer, top: 0, left: 0 }])
    .jpeg({ quality: 90 })
    .toBuffer();

  return composed;
}

/* ── API pública ───────────────────────────────────────────────────────────── */

export async function listTemplates(tenantId: string) {
  return prisma.creativeTemplate.findMany({
    where: {
      isActive: true,
      OR: [{ tenantId: null }, { tenantId }],
    },
    orderBy: { createdAt: 'asc' },
  });
}

export async function createGenerationJob(input: GenerateInput): Promise<GenerationJobRecord> {
  // 1. Cria job com status PENDING
  const job = await prisma.creativeGenerationJob.create({
    data: {
      tenantId:      input.tenantId,
      sourceAssetId: input.sourceAssetId,
      templateId:    input.templateId ?? null,
      concept:       input.concept    ?? {},
      formats:       input.formats,
      status:        'PENDING',
      createdBy:     input.createdBy  ?? null,
    },
  });

  // 2. Executa geração assincronamente (fire-and-forget; rápido o suficiente para ser síncrono)
  runGeneration(job.id, input).catch(err =>
    console.error(`[creativeGen] Job ${job.id} falhou:`, err),
  );

  return toRecord(job);
}

async function runGeneration(jobId: string, input: GenerateInput): Promise<void> {
  try {
    await prisma.creativeGenerationJob.update({
      where: { id: jobId },
      data:  { status: 'RUNNING' },
    });

    // Busca layout do template ou usa default
    let layout: LayoutConfig = { ...DEFAULT_LAYOUT };
    if (input.templateId) {
      const tmpl = await prisma.creativeTemplate.findUnique({ where: { id: input.templateId } });
      if (tmpl?.layout) {
        layout = { ...DEFAULT_LAYOUT, ...(tmpl.layout as Partial<LayoutConfig>) };
      }
    }

    const sourceBuffer = await fetchImageBuffer(input.sourceUrl);
    const outputUrls: string[] = [];

    for (const format of input.formats) {
      const rendered = await renderVariation(
        sourceBuffer,
        format,
        { headline: input.concept?.headline, cta: input.concept?.cta },
        layout,
      );

      const s3Key = `tenants/${input.tenantId}/generated/${jobId}/${format.replace(':', 'x')}_${Date.now()}.jpg`;
      const uploadResult = await uploadToS3(s3Key, rendered, 'image/jpeg');

      if (uploadResult) {
        outputUrls.push(uploadResult.url);
      } else {
        // Fallback: data URL truncada para preview (sem S3)
        const b64 = rendered.subarray(0, 50_000).toString('base64');
        outputUrls.push(`data:image/jpeg;base64,${b64}`);
      }
    }

    await prisma.creativeGenerationJob.update({
      where: { id: jobId },
      data:  { status: 'NEEDS_REVIEW', outputUrls },
    });
  } catch (err: any) {
    await prisma.creativeGenerationJob.update({
      where: { id: jobId },
      data:  { status: 'FAILED', errorMessage: err?.message ?? 'Erro desconhecido' },
    });
    throw err;
  }
}

export async function getJob(jobId: string, tenantId: string): Promise<GenerationJobRecord | null> {
  const job = await prisma.creativeGenerationJob.findFirst({
    where: { id: jobId, tenantId },
  });
  return job ? toRecord(job) : null;
}

export async function approveJob(
  jobId: string,
  tenantId: string,
  reviewedBy: string,
  selectedUrls?: string[],   // subset das outputUrls a promover; default = todas
): Promise<{ assetsCreated: number }> {
  const job = await prisma.creativeGenerationJob.findFirst({
    where: { id: jobId, tenantId, status: 'NEEDS_REVIEW' },
  });
  if (!job) throw new Error('Job não encontrado ou não está aguardando revisão');

  const sourceAsset = await prisma.creativeAsset.findUnique({
    where: { id: job.sourceAssetId },
  });

  const urls = selectedUrls?.length ? selectedUrls : (job.outputUrls as string[]);
  let assetsCreated = 0;

  for (const url of urls) {
    const format = guessFormatFromUrl(url, job.formats as string[]);
    await prisma.creativeAsset.create({
      data: {
        tenantId:           tenantId,
        clientId:           sourceAsset?.clientId ?? null,
        originalName:       `variacao-${format}-${jobId.slice(0, 8)}.jpg`,
        storagePath:        extractS3Key(url),
        storageUrl:         url,
        mimeType:           'image/jpeg',
        format:             'image',
        isActive:           true,
        aiGenerated:        true,
        derivedFromAssetId: job.sourceAssetId,
      },
    });
    assetsCreated++;
  }

  await prisma.creativeGenerationJob.update({
    where: { id: jobId },
    data:  { status: 'APPROVED', reviewedBy, reviewedAt: new Date() },
  });

  return { assetsCreated };
}

export async function rejectJob(
  jobId: string,
  tenantId: string,
  reviewedBy: string,
): Promise<void> {
  const job = await prisma.creativeGenerationJob.findFirst({
    where: { id: jobId, tenantId, status: 'NEEDS_REVIEW' },
  });
  if (!job) throw new Error('Job não encontrado ou não está aguardando revisão');

  await prisma.creativeGenerationJob.update({
    where: { id: jobId },
    data:  { status: 'REJECTED', reviewedBy, reviewedAt: new Date() },
  });
}

export async function listJobs(
  tenantId: string,
  sourceAssetId?: string,
): Promise<GenerationJobRecord[]> {
  const jobs = await prisma.creativeGenerationJob.findMany({
    where: {
      tenantId,
      ...(sourceAssetId ? { sourceAssetId } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  return jobs.map(toRecord);
}

/* ── Helpers internos ──────────────────────────────────────────────────────── */

function guessFormatFromUrl(url: string, formats: string[]): string {
  for (const f of formats) {
    if (url.includes(f.replace(':', 'x'))) return f;
  }
  return formats[0] ?? '1:1';
}

function extractS3Key(url: string): string {
  try {
    const u = new URL(url);
    // Remove leading slash and bucket prefix if present
    return u.pathname.replace(/^\/[^/]+\//, '');
  } catch {
    return url;
  }
}

function toRecord(j: any): GenerationJobRecord {
  return {
    id:            j.id,
    tenantId:      j.tenantId,
    sourceAssetId: j.sourceAssetId,
    templateId:    j.templateId ?? null,
    concept:       j.concept    ?? {},
    formats:       (j.formats   as string[]) ?? [],
    status:        j.status,
    outputUrls:    (j.outputUrls as string[]) ?? [],
    errorMessage:  j.errorMessage ?? null,
    createdAt:     (j.createdAt instanceof Date ? j.createdAt : new Date(j.createdAt)).toISOString(),
    reviewedAt:    j.reviewedAt
      ? (j.reviewedAt instanceof Date ? j.reviewedAt : new Date(j.reviewedAt)).toISOString()
      : null,
  };
}
