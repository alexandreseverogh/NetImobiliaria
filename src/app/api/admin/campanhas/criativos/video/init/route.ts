/**
 * POST /api/admin/campanhas/criativos/video/init
 * Fase 1 — inicia o upload de um vídeo em partes direto ao armazenamento.
 *
 * Valida as regras (bloqueios interrompem; avisos voltam para o usuário confirmar), cria o
 * registro em CreativeAsset com upload_status = 'uploading' e abre o upload multipart.
 */
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import path from 'path';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import pool from '@/lib/database/connection';
import { validateVideoMeta, type VideoMeta } from '@/lib/marketing/video/videoRules';
import {
  isMultipartConfigured, ensureVideoUploadCors, startMultipartUpload,
  numberOfParts, PART_SIZE_BYTES,
} from '@/lib/storage/s3-multipart';
import { getS3Url } from '@/lib/storage/s3-client';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const payload = getTokenPayload(request);
    if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    const tenantId = payload.tenantId;

    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Corpo da requisição inválido.' }, { status: 400 });

    const meta: VideoMeta = {
      fileName: String(body.fileName ?? ''),
      sizeBytes: Number(body.sizeBytes),
      mimeType: String(body.mimeType ?? ''),
      durationSeconds: body.durationSeconds == null ? null : Number(body.durationSeconds),
      width: body.width == null ? null : Number(body.width),
      height: body.height == null ? null : Number(body.height),
    };

    // Regra de negócio no servidor: a validação do navegador nunca é a única barreira.
    const { blockers, warnings } = validateVideoMeta(meta);
    if (blockers.length > 0) {
      return NextResponse.json({ error: blockers[0], blockers, warnings }, { status: 400 });
    }

    if (!isMultipartConfigured()) {
      return NextResponse.json({ error: 'Armazenamento de vídeo não configurado neste ambiente.' }, { status: 503 });
    }

    const assetId = crypto.randomUUID();
    const ext = path.extname(meta.fileName).toLowerCase();
    const key = `criativos/${tenantId}/videos/${assetId}${ext}`;
    const clientId = body.clientId && body.clientId !== 'own' ? String(body.clientId) : null;

    await ensureVideoUploadCors();
    const uploadId = await startMultipartUpload(key, meta.mimeType);

    await pool.query(
      `INSERT INTO campanhasmarketingdigital."CreativeAsset"
         (id, tenant_id, client_id, original_name, storage_path, storage_url, file_size, mime_type,
          format, width, height, duration_seconds, upload_status, upload_id, is_active)
       VALUES ($1, $2::uuid, $3::uuid, $4, $5, $6, $7, $8, 'video', $9, $10, $11, 'uploading', $12, true)`,
      [
        assetId, tenantId, clientId, meta.fileName, key, getS3Url(key) ?? key, meta.sizeBytes, meta.mimeType,
        meta.width ?? null, meta.height ?? null, meta.durationSeconds ?? null, uploadId,
      ],
    );

    return NextResponse.json({
      assetId,
      partSizeBytes: PART_SIZE_BYTES,
      partCount: numberOfParts(meta.sizeBytes),
      warnings,
    });
  } catch (error: any) {
    console.error('[criativos/video/init] erro:', error);
    return NextResponse.json({ error: error?.message || 'Não foi possível iniciar o envio do vídeo.' }, { status: 500 });
  }
}
