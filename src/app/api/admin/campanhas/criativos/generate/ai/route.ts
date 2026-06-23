/**
 * POST /api/admin/campanhas/criativos/generate/ai
 * FASE 17-A — Geração de imagem de hook via IA (HuggingFace / Replicate / OpenAI).
 *
 * Body JSON:
 *   prompt   string   — prompt descritivo para a imagem
 *   format?  string   — 'feed' | 'story' | 'banner' (default: 'feed')
 *   clientId? string  — UUID do cliente/segmento (opcional)
 *
 * Fluxo:
 *   1. Gera imagem via provider configurado em Settings global
 *   2. Upload para MinIO/S3
 *   3. Insere CreativeAsset com ai_generated = true
 *   4. Dispara análise assíncrona (fire-and-forget)
 *   5. Retorna o asset criado
 */

import { NextRequest, NextResponse } from 'next/server'
import { getTokenPayload } from '@/lib/auth/jwt-node'
import pool from '@/lib/database/connection'
import crypto from 'crypto'
import { generateHookImage, buildImagePromptFromConcept, type ImageFormat } from '@/lib/marketing/services/aiImageGenerationService'
import { resolveSegment } from '@/lib/intelligence/segmentResolver'
import { uploadToS3, getS3Url } from '@/lib/storage/s3-client'

export const dynamic = 'force-dynamic'

const VALID_FORMATS: ImageFormat[] = ['feed', 'story', 'banner']

export async function POST(request: NextRequest) {
  const t0 = Date.now()

  try {
    const payload = getTokenPayload(request)
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    const { tenantId } = payload

    const body = await request.json()
    const { prompt, scene, hookType, angle, clientId } = body
    const format: ImageFormat = VALID_FORMATS.includes(body.format) ? body.format : 'feed'

    // ── Resolver prompt: concept-based (scene) ou direto (prompt) ────────────
    let finalPrompt: string

    if (scene && typeof scene === 'string' && scene.trim().length >= 5) {
      // Fluxo inteligente: LLM converte scene PT → prompt EN otimizado
      const segment = await resolveSegment(tenantId, null)
      const segmentName = segment?.name || 'marketing digital'
      finalPrompt = await buildImagePromptFromConcept(
        scene.trim(),
        hookType || 'benefit',
        angle    || 'lifestyle',
        segmentName,
      )
      console.log(`[generate/ai] Prompt gerado via LLM para hook="${hookType}": ${finalPrompt.slice(0, 80)}...`)
    } else if (prompt && typeof prompt === 'string' && prompt.trim().length >= 10) {
      finalPrompt = prompt.trim()
    } else {
      return NextResponse.json({ error: 'Forneça "scene" (conceito) ou "prompt" (texto direto, min 10 chars)' }, { status: 400 })
    }

    // ── Gerar imagem via IA ───────────────────────────────────────────────────
    const result = await generateHookImage(finalPrompt, format)

    // ── Hash para deduplicação ────────────────────────────────────────────────
    const hash = crypto.createHash('sha256').update(result.buffer).digest('hex')

    const existing = await pool.query(
      `SELECT id, storage_url FROM campanhasmarketingdigital."CreativeAsset"
       WHERE tenant_id = $1::uuid AND hash = $2 AND is_active = true LIMIT 1`,
      [tenantId, hash]
    )
    if (existing.rows.length) {
      return NextResponse.json({ asset: existing.rows[0], duplicate: true })
    }

    // ── Upload para MinIO/S3 ──────────────────────────────────────────────────
    const ext = result.mimeType === 'image/png' ? 'png' : 'jpg'
    const s3Key = `criativos/${tenantId}/ai-${hash.slice(0, 16)}-${format}.${ext}`
    const uploadResult = await uploadToS3(s3Key, result.buffer, result.mimeType)

    let storageUrl: string
    let storagePath: string

    if (uploadResult) {
      storageUrl  = getS3Url(s3Key) ?? uploadResult.url
      storagePath = s3Key
    } else {
      // Fallback: disco local (dev sem MinIO)
      const { default: fs }       = await import('fs')
      const { default: nodePath } = await import('path')
      const relPath = `uploads/criativos/${tenantId}/ai-${hash.slice(0, 16)}-${format}.${ext}`
      const absPath = nodePath.join(process.cwd(), 'public', relPath)
      fs.mkdirSync(nodePath.dirname(absPath), { recursive: true })
      fs.writeFileSync(absPath, result.buffer)
      storageUrl  = `/${relPath}`
      storagePath = relPath
      console.warn('[generate/ai] MinIO não configurado — usando disco local')
    }

    const originalName = `ai-hook-${format}-${Date.now()}.${ext}`

    // ── Inserir CreativeAsset ─────────────────────────────────────────────────
    const insertRes = await pool.query(
      `INSERT INTO campanhasmarketingdigital."CreativeAsset"
         (tenant_id, client_id, original_name, storage_path, storage_url,
          file_size, mime_type, width, height, hash, ai_generated)
       VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10, true)
       RETURNING id, storage_url, original_name, uploaded_at, ai_generated`,
      [
        tenantId,
        clientId || null,
        originalName,
        storagePath,
        storageUrl,
        result.buffer.length,
        result.mimeType,
        result.width,
        result.height,
        hash,
      ]
    )
    const asset = insertRes.rows[0]

    // ── Inserir CreativeAnalysis (pending) ────────────────────────────────────
    await pool.query(
      `INSERT INTO campanhasmarketingdigital."CreativeAnalysis"
         (asset_id, tenant_id, analysis_status)
       VALUES ($1, $2::uuid, 'pending')
       ON CONFLICT (asset_id) DO NOTHING`,
      [asset.id, tenantId]
    )

    // ── Análise assíncrona (fire-and-forget) ──────────────────────────────────
    import('@/lib/marketing/services/creativeAnalysisService')
      .then(m => m.analyzeCreativeAsset(asset.id))
      .catch(e => console.error('[generate/ai] análise async falhou:', e.message))

    console.log(`[generate/ai] ${format} gerado em ${Date.now() - t0}ms via ${result.provider}/${result.model}`)

    return NextResponse.json({
      asset,
      generation: {
        provider:   result.provider,
        model:      result.model,
        format,
        width:      result.width,
        height:     result.height,
        durationMs: result.durationMs,
        hookType:   hookType  || null,
        angle:      angle     || null,
      },
    }, { status: 201 })

  } catch (err: any) {
    console.error('[generate/ai] erro:', err)
    return NextResponse.json({ error: err.message || 'Erro ao gerar imagem' }, { status: 500 })
  }
}
