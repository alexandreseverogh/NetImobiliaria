import { NextRequest, NextResponse } from 'next/server';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { requireApiPermission } from '@/lib/auth/apiPermissions';
import { publishOrganic } from '@/lib/marketing/services/organicPublishService';

export const dynamic = 'force-dynamic';

// POST /api/admin/campanhas/organic/publish
// Body: { clientId?, platform, format, caption?, mediaUrls?, assetIds?, link? }
export async function POST(request: NextRequest) {
  const denied = await requireApiPermission(request, 'publicacoes-organicas', 'CREATE');
  if (denied) return denied;

  const payload = getTokenPayload(request);
  if (!payload?.tenantId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const {
      clientId: rawClientId,
      platform = 'facebook',
      format,
      caption,
      mediaUrls = [],
      assetIds = [],
      link,
    } = body;

    // Sentinelas de UI → null (sem cliente); UUID real preservado
    const clientId = (rawClientId && rawClientId !== 'own' && rawClientId !== 'segment' && rawClientId !== 'all')
      ? rawClientId
      : null;

    // Validações básicas (fail-fast com erro acionável)
    if (platform !== 'facebook' && platform !== 'instagram') {
      return NextResponse.json({ error: 'Plataforma inválida' }, { status: 400 });
    }
    const resolvedFormat = format || (mediaUrls.length > 1 ? 'carousel' : mediaUrls.length === 1 ? 'image' : 'text');
    if (resolvedFormat === 'text' && !caption?.trim() && !link) {
      return NextResponse.json({ error: 'Informe um texto, link ou imagem para publicar' }, { status: 400 });
    }

    const record = await publishOrganic({
      tenantId:  payload.tenantId,
      clientId,
      platform,
      format:    resolvedFormat,
      caption,
      mediaUrls,
      assetIds,
      link,
      createdBy: payload.userId || null,
    });

    // FAILED retorna 502 com o erro acionável; PUBLISHED retorna 201
    if (record.status === 'FAILED') {
      return NextResponse.json({ ...record, error: record.errorMessage }, { status: 502 });
    }
    return NextResponse.json(record, { status: 201 });
  } catch (error: any) {
    console.error('POST /organic/publish error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao publicar' }, { status: 500 });
  }
}
