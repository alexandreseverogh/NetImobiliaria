/**
 * POST /api/admin/campanhas/criativos/upload
 * FASE 6 — Upload de criativo para biblioteca persistente via MinIO/S3.
 *
 * Recebe multipart/form-data com:
 *   - file: File (imagem)
 *   - campaignId?: string
 *   - adId?: string
 *   - clientId?: string
 *   - analyzeNow?: "true"  (aciona análise síncrona – usar apenas em dev/testes)
 *
 * Salva em MinIO: criativos/<tenantId>/<hash>.<ext>
 * Cria registro em CreativeAsset + CreativeAnalysis(status=pending).
 * Dispara análise assíncrona (fire-and-forget).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import pool from '@/lib/database/connection';
import crypto from 'crypto';
import path from 'path';
import { uploadToS3, getS3Url } from '@/lib/storage/s3-client';

export const dynamic = 'force-dynamic';

const ALLOWED_MIME = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(request: NextRequest) {
  try {
    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    const { tenantId } = payload;

    const formData   = await request.formData();
    const file       = formData.get('file') as File | null;
    const campaignId = formData.get('campaignId') as string | null;
    const adId       = formData.get('adId')       as string | null;
    const clientId   = formData.get('clientId')   as string | null;
    const analyzeNow = formData.get('analyzeNow') === 'true';

    if (!file) return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 });
    if (!ALLOWED_MIME.includes(file.type)) {
      return NextResponse.json({ error: `Tipo não suportado: ${file.type}` }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Arquivo muito grande (máx 10 MB)' }, { status: 400 });
    }

    // ── Ler bytes e calcular hash ──────────────────────────────────────────────
    const buffer = Buffer.from(await file.arrayBuffer());
    const hash   = crypto.createHash('sha256').update(buffer).digest('hex');

    // ── Deduplicação: mesma hash para o mesmo tenant → retornar asset existente ─
    const existing = await pool.query(
      `SELECT id, storage_url FROM campanhasmarketingdigital."CreativeAsset"
       WHERE tenant_id = $1::uuid AND hash = $2 AND is_active = true LIMIT 1`,
      [tenantId, hash]
    );
    if (existing.rows.length) {
      return NextResponse.json({ asset: existing.rows[0], duplicate: true });
    }

    // ── Upload para MinIO/S3 ───────────────────────────────────────────────────
    const ext      = path.extname(file.name).toLowerCase().replace('.', '') || 'jpg';
    const s3Key    = `criativos/${tenantId}/${hash.slice(0, 16)}.${ext}`;

    const result = await uploadToS3(s3Key, buffer, file.type);

    let storageUrl: string;
    let storagePath: string;

    if (result) {
      // MinIO disponível — URL pública persistente
      storageUrl  = getS3Url(s3Key) ?? result.url;
      storagePath = s3Key;
    } else {
      // Fallback: disco local (apenas para desenvolvimento sem MinIO)
      const { default: fs }   = await import('fs');
      const { default: nodePath } = await import('path');
      const subdir   = `criativos/${tenantId}`;
      const filename = `${hash.slice(0, 16)}.${ext}`;
      const relPath  = `uploads/${subdir}/${filename}`;
      const absPath  = nodePath.join(process.cwd(), 'public', relPath);
      fs.mkdirSync(nodePath.dirname(absPath), { recursive: true });
      fs.writeFileSync(absPath, buffer);
      storageUrl  = `/${relPath}`;
      storagePath = relPath;
      console.warn('[criativos/upload] MinIO não configurado — usando disco local (não persistente em produção!)');
    }

    // ── Inserir CreativeAsset ──────────────────────────────────────────────────
    const insertRes = await pool.query(
      `INSERT INTO campanhasmarketingdigital."CreativeAsset"
         (tenant_id, client_id, original_name, storage_path, storage_url, file_size, mime_type, hash, campaign_id, ad_id)
       VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, storage_url, original_name, uploaded_at`,
      [tenantId, clientId || null, file.name, storagePath, storageUrl,
       file.size, file.type, hash, campaignId || null, adId || null]
    );
    const asset = insertRes.rows[0];

    // ── Inserir CreativeAnalysis (pending) ─────────────────────────────────────
    await pool.query(
      `INSERT INTO campanhasmarketingdigital."CreativeAnalysis" (asset_id, tenant_id, analysis_status)
       VALUES ($1, $2::uuid, 'pending')
       ON CONFLICT (asset_id) DO NOTHING`,
      [asset.id, tenantId]
    );

    // ── Disparar análise (assíncrona, não bloqueia a resposta) ─────────────────
    if (analyzeNow) {
      const { analyzeCreativeAsset } = await import('@/lib/marketing/services/creativeAnalysisService');
      await analyzeCreativeAsset(asset.id);
    } else {
      import('@/lib/marketing/services/creativeAnalysisService')
        .then(m => m.analyzeCreativeAsset(asset.id))
        .catch(e => console.error('[upload] análise async falhou:', e.message));
    }

    return NextResponse.json({ asset, duplicate: false }, { status: 201 });
  } catch (err: any) {
    console.error('[criativos/upload] erro:', err);
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 });
  }
}
