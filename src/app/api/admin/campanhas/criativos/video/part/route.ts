/**
 * POST /api/admin/campanhas/criativos/video/part
 * Fase 1 — devolve a URL assinada para o navegador enviar UMA parte do vídeo.
 * Só para uploads do próprio tenant que ainda estão em andamento.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import pool from '@/lib/database/connection';
import { presignPart, numberOfParts } from '@/lib/storage/s3-multipart';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const payload = getTokenPayload(request);
    if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const body = await request.json().catch(() => null);
    const assetId = String(body?.assetId ?? '');
    const partNumber = Number(body?.partNumber);
    if (!assetId || !Number.isInteger(partNumber) || partNumber < 1) {
      return NextResponse.json({ error: 'Parâmetros inválidos.' }, { status: 400 });
    }

    const { rows } = await pool.query(
      `SELECT storage_path, upload_id, file_size FROM campanhasmarketingdigital."CreativeAsset"
        WHERE id = $1 AND tenant_id = $2::uuid AND format = 'video' AND upload_status = 'uploading'`,
      [assetId, payload.tenantId],
    );
    const asset = rows[0];
    if (!asset || !asset.upload_id) {
      return NextResponse.json({ error: 'Upload não encontrado ou já finalizado.' }, { status: 404 });
    }
    if (partNumber > numberOfParts(Number(asset.file_size))) {
      return NextResponse.json({ error: 'Número de parte fora do intervalo do arquivo.' }, { status: 400 });
    }

    const url = await presignPart(asset.storage_path, asset.upload_id, partNumber);
    return NextResponse.json({ url, partNumber });
  } catch (error: any) {
    console.error('[criativos/video/part] erro:', error);
    return NextResponse.json({ error: 'Não foi possível preparar esta parte do envio.' }, { status: 500 });
  }
}
