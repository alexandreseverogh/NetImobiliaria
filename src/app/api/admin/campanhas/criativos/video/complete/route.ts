/**
 * POST /api/admin/campanhas/criativos/video/complete
 * Fase 1 — conclui o upload multipart e confirma o arquivo no armazenamento.
 *
 * Confere, antes de marcar como pronto: todas as partes foram enviadas e o tamanho real do
 * objeto bate com o declarado. Se não bater, o upload é abortado e o registro fica como 'failed'.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import pool from '@/lib/database/connection';
import { completeMultipartUpload, headObjectSize, numberOfParts } from '@/lib/storage/s3-multipart';
import { deleteFromS3 } from '@/lib/storage/s3-client';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const payload = getTokenPayload(request);
    if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const body = await request.json().catch(() => null);
    const assetId = String(body?.assetId ?? '');
    const parts: { partNumber: number; etag: string }[] = Array.isArray(body?.parts) ? body.parts : [];
    if (!assetId) return NextResponse.json({ error: 'Parâmetros inválidos.' }, { status: 400 });

    const { rows } = await pool.query(
      `SELECT id, storage_path, storage_url, upload_id, file_size FROM campanhasmarketingdigital."CreativeAsset"
        WHERE id = $1 AND tenant_id = $2::uuid AND format = 'video' AND upload_status = 'uploading'`,
      [assetId, payload.tenantId],
    );
    const asset = rows[0];
    if (!asset || !asset.upload_id) {
      return NextResponse.json({ error: 'Upload não encontrado ou já finalizado.' }, { status: 404 });
    }

    const expected = numberOfParts(Number(asset.file_size));
    const cleanParts = parts
      .map(p => ({ PartNumber: Number(p.partNumber), ETag: String(p.etag ?? '') }))
      .filter(p => Number.isInteger(p.PartNumber) && p.PartNumber >= 1 && p.ETag);
    const distinct = new Set(cleanParts.map(p => p.PartNumber));
    if (distinct.size !== expected) {
      return NextResponse.json({
        error: `Faltam partes do envio (${distinct.size} de ${expected}). Tente enviar novamente.`,
      }, { status: 400 });
    }

    await completeMultipartUpload(asset.storage_path, asset.upload_id, cleanParts);

    // Fonte da verdade: o tamanho real no armazenamento, não o que o navegador declarou.
    const realSize = await headObjectSize(asset.storage_path);
    if (realSize === null || realSize !== Number(asset.file_size)) {
      // O objeto já foi montado no armazenamento: remove o arquivo incorreto para não ficar órfão.
      await deleteFromS3(asset.storage_path).catch(() => { /* melhor esforço */ });
      await pool.query(
        `UPDATE campanhasmarketingdigital."CreativeAsset"
            SET upload_status = 'failed', is_active = false, upload_id = NULL
          WHERE id = $1`,
        [assetId],
      );
      return NextResponse.json({
        error: 'O arquivo recebido não confere com o original (tamanho diferente). Envie o vídeo novamente.',
      }, { status: 422 });
    }

    await pool.query(
      `UPDATE campanhasmarketingdigital."CreativeAsset"
          SET upload_status = 'ready', upload_id = NULL, file_size = $2
        WHERE id = $1`,
      [assetId, realSize],
    );

    return NextResponse.json({ assetId, url: asset.storage_url, sizeBytes: realSize });
  } catch (error: any) {
    console.error('[criativos/video/complete] erro:', error);
    return NextResponse.json({ error: 'Não foi possível concluir o envio do vídeo. Tente novamente.' }, { status: 500 });
  }
}
