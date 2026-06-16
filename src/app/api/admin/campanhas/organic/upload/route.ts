import { NextRequest, NextResponse } from 'next/server';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { requireApiPermission } from '@/lib/auth/apiPermissions';
import { uploadToS3, getS3Url } from '@/lib/storage/s3-client';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg':  'jpg',
  'image/png':  'png',
  'image/webp': 'webp',
  'image/gif':  'gif',
  'video/mp4':  'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
};

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB

// POST /api/admin/campanhas/organic/upload
export async function POST(request: NextRequest) {
  const denied = await requireApiPermission(request, 'publicacoes-organicas', 'CREATE');
  if (denied) return denied;

  const payload = getTokenPayload(request);
  if (!payload?.tenantId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    const ext = ALLOWED_TYPES[file.type];
    if (!ext) {
      return NextResponse.json(
        { error: `Tipo não permitido: ${file.type}. Use JPEG, PNG, WebP, GIF, MP4 ou MOV.` },
        { status: 400 },
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(1)} MB). Limite: 50 MB.` },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const key    = `organic/${payload.tenantId}/${randomUUID()}.${ext}`;

    const result = await uploadToS3(key, buffer, file.type);
    if (!result) {
      return NextResponse.json({ error: 'Object Storage não configurado (S3_ENDPOINT ausente).' }, { status: 500 });
    }

    const url = getS3Url(key) ?? result.url;

    return NextResponse.json({ url, key, size: file.size, type: file.type });
  } catch (error: any) {
    console.error('POST /organic/upload error:', error);
    return NextResponse.json({ error: error.message ?? 'Erro no upload' }, { status: 500 });
  }
}
