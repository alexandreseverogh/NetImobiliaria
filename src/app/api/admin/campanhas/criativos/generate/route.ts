import { NextRequest, NextResponse } from 'next/server';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import {
  createGenerationJob,
  listJobs,
  listTemplates,
} from '@/lib/marketing/services/creativeGenerationService';

export const dynamic = 'force-dynamic';

/**
 * GET — lista templates disponíveis + jobs recentes do tenant
 */
export async function GET(request: NextRequest) {
  const payload = getTokenPayload(request);
  if (!payload?.tenantId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const sourceAssetId = searchParams.get('sourceAssetId') ?? undefined;

  const [templates, jobs] = await Promise.all([
    listTemplates(payload.tenantId),
    listJobs(payload.tenantId, sourceAssetId),
  ]);

  return NextResponse.json({ templates, jobs });
}

/**
 * POST — inicia geração de variações para um ativo existente
 *
 * Body: {
 *   sourceAssetId: string,   // id de CreativeAsset (imagem fonte)
 *   sourceUrl: string,       // URL pública da imagem fonte
 *   templateId?: string,
 *   concept?: { headline, body, cta },
 *   formats: string[],       // ['1:1', '9:16', '4:5']
 * }
 */
export async function POST(request: NextRequest) {
  const payload = getTokenPayload(request);
  if (!payload?.tenantId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  const { sourceAssetId, sourceUrl, templateId, concept, formats } = body ?? {};

  if (!sourceAssetId || !sourceUrl) {
    return NextResponse.json({ error: 'sourceAssetId e sourceUrl são obrigatórios' }, { status: 400 });
  }

  const validFormats = ['1:1', '4:5', '9:16'];
  const reqFormats: string[] = Array.isArray(formats) && formats.length
    ? formats.filter((f: string) => validFormats.includes(f))
    : ['1:1'];

  if (!reqFormats.length) {
    return NextResponse.json({ error: 'Nenhum formato válido (use 1:1, 4:5, 9:16)' }, { status: 400 });
  }

  const job = await createGenerationJob({
    tenantId:      payload.tenantId,
    sourceAssetId,
    sourceUrl,
    templateId:    templateId ?? null,
    concept:       concept    ?? {},
    formats:       reqFormats,
    createdBy:     payload.userId ?? null,
  });

  return NextResponse.json({ job }, { status: 201 });
}
