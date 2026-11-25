/**
 * POST /api/admin/campanhas/criativos/video/abort
 * Fase 1 — cancela um upload em andamento (usuário desistiu ou o envio falhou).
 * Libera as partes já enviadas no armazenamento e marca o registro como 'failed'.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import pool from '@/lib/database/connection';
import { abortMultipartUpload } from '@/lib/storage/s3-multipart';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const payload = getTokenPayload(request);
    if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const body = await request.json().catch(() => null);
    const assetId = String(body?.assetId ?? '');
    if (!assetId) return NextResponse.json({ error: 'Parâmetros inválidos.' }, { status: 400 });

    const { rows } = await pool.query(
      `SELECT storage_path, upload_id FROM campanhasmarketingdigital."CreativeAsset"
        WHERE id = $1 AND tenant_id = $2::uuid AND format = 'video' AND upload_status = 'uploading'`,
      [assetId, payload.tenantId],
    );
    const asset = rows[0];
    if (asset?.upload_id) {
      await abortMultipartUpload(asset.storage_path, asset.upload_id);
    }
    await pool.query(
      `UPDATE campanhasmarketingdigital."CreativeAsset"
          SET upload_status = 'failed', is_active = false, upload_id = NULL
        WHERE id = $1 AND tenant_id = $2::uuid AND upload_status = 'uploading'`,
      [assetId, payload.tenantId],
    );
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('[criativos/video/abort] erro:', error);
    return NextResponse.json({ error: 'Não foi possível cancelar o envio.' }, { status: 500 });
  }
}
