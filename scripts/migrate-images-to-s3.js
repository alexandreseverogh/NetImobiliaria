/**
 * ============================================================
 * Robô de Migração: BYTEA → S3/MinIO
 * ============================================================
 * 
 * Migra imagens existentes do banco (BYTEA) para o Object Storage.
 * Projetado para rodar em background, processando em lotes.
 * 
 * Uso:
 *   node scripts/migrate-images-to-s3.js [--batch-size=500] [--dry-run]
 * 
 * Requer variáveis S3_ENDPOINT, S3_ACCESS_KEY, S3_SECRET_KEY, S3_BUCKET
 * ============================================================
 */

const { Pool } = require('pg')
const crypto = require('crypto')

// ============================================================
// Configuração
// ============================================================
const args = process.argv.slice(2)
const BATCH_SIZE = parseInt(args.find(a => a.startsWith('--batch-size='))?.split('=')[1] || '500')
const DRY_RUN = args.includes('--dry-run')

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '15432'),
  database: process.env.DB_NAME || 'net_imobiliaria',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
})

// ============================================================
// S3 Upload simplificado (sem SDK externo)
// ============================================================
async function uploadToS3(key, buffer, contentType) {
  const endpoint = process.env.S3_ENDPOINT
  const accessKey = process.env.S3_ACCESS_KEY
  const secretKey = process.env.S3_SECRET_KEY
  const bucket = process.env.S3_BUCKET

  if (!endpoint || !accessKey || !secretKey || !bucket) {
    throw new Error('Variáveis S3 não configuradas')
  }

  const url = `${endpoint}/${bucket}/${key}`
  const now = new Date()
  const dateStamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  const shortDate = dateStamp.substring(0, 8)
  const region = process.env.S3_REGION || 'us-east-1'
  const scope = `${shortDate}/${region}/s3/aws4_request`

  const contentSha = crypto.createHash('sha256').update(buffer).digest('hex')

  const headers = {
    'host': new URL(endpoint).host,
    'content-type': contentType,
    'content-length': buffer.length.toString(),
    'x-amz-content-sha256': contentSha,
    'x-amz-date': dateStamp,
  }

  // Canonical request
  const path = `/${bucket}/${key}`
  const sortedKeys = Object.keys(headers).sort()
  const canonicalHeaders = sortedKeys.map(k => `${k}:${headers[k].trim()}`).join('\n') + '\n'
  const signedHeaders = sortedKeys.join(';')

  const canonicalRequest = [
    'PUT', path, '', canonicalHeaders, signedHeaders, contentSha
  ].join('\n')

  const stringToSign = [
    'AWS4-HMAC-SHA256', dateStamp, scope,
    crypto.createHash('sha256').update(canonicalRequest).digest('hex')
  ].join('\n')

  // Signing key
  const kDate = crypto.createHmac('sha256', `AWS4${secretKey}`).update(shortDate).digest()
  const kRegion = crypto.createHmac('sha256', kDate).update(region).digest()
  const kService = crypto.createHmac('sha256', kRegion).update('s3').digest()
  const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest()

  const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex')

  headers['authorization'] = `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

  const response = await fetch(url, {
    method: 'PUT',
    headers,
    body: buffer,
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`S3 upload failed (${response.status}): ${errorText}`)
  }

  return { s3Key: key, url }
}

// ============================================================
// Migração principal
// ============================================================
async function migrate() {
  console.log('============================================')
  console.log('🖼️  MIGRAÇÃO DE IMAGENS: BYTEA → S3/MinIO')
  console.log(`   Batch size: ${BATCH_SIZE}`)
  console.log(`   Dry run: ${DRY_RUN}`)
  console.log('============================================\n')

  // Contar total de imagens a migrar
  const countResult = await pool.query(
    "SELECT COUNT(*) as total FROM imovel_imagens WHERE storage_type = 'database' OR storage_type IS NULL"
  )
  const total = parseInt(countResult.rows[0].total)

  const countMigrated = await pool.query(
    "SELECT COUNT(*) as total FROM imovel_imagens WHERE storage_type = 's3'"
  )
  const migrated = parseInt(countMigrated.rows[0].total)

  console.log(`📊 Total no banco (BYTEA): ${total}`)
  console.log(`📊 Já migradas (S3): ${migrated}`)
  console.log(`📊 Restantes: ${total}\n`)

  if (total === 0) {
    console.log('✅ Todas as imagens já estão no S3! Nada a fazer.')
    await pool.end()
    return
  }

  let processadas = 0
  let erros = 0

  while (true) {
    // Buscar lote de imagens ainda no banco
    const batch = await pool.query(`
      SELECT id, imovel_id, imagem, tipo_mime
      FROM imovel_imagens
      WHERE (storage_type = 'database' OR storage_type IS NULL)
        AND imagem IS NOT NULL
      ORDER BY id ASC
      LIMIT $1
    `, [BATCH_SIZE])

    if (batch.rows.length === 0) {
      break
    }

    console.log(`\n📦 Processando lote de ${batch.rows.length} imagens...`)

    for (const row of batch.rows) {
      try {
        const contentType = row.tipo_mime || 'image/jpeg'
        const ext = contentType === 'image/png' ? 'png'
          : contentType === 'image/webp' ? 'webp'
          : 'jpg'
        const hash = crypto.createHash('md5').update(row.imagem).digest('hex').substring(0, 8)
        const s3Key = `imoveis/${row.imovel_id}/${row.id}_${hash}.${ext}`

        if (DRY_RUN) {
          console.log(`   [DRY-RUN] ID ${row.id}: ${s3Key} (${row.imagem.length} bytes)`)
          processadas++
          continue
        }

        // Upload para S3
        await uploadToS3(s3Key, row.imagem, contentType)

        // Atualizar metadados no banco
        const cdnUrl = process.env.CDN_URL
          ? `${process.env.CDN_URL}/${s3Key}`
          : `${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET}/${s3Key}`

        await pool.query(`
          UPDATE imovel_imagens
          SET storage_type = 's3',
              s3_key = $1,
              url_cdn = $2
          WHERE id = $3
        `, [s3Key, cdnUrl, row.id])

        // Limpar BYTEA para liberar espaço (PONTO CRÍTICO)
        await pool.query(`
          UPDATE imovel_imagens
          SET imagem = NULL
          WHERE id = $1
        `, [row.id])

        processadas++
        
        if (processadas % 50 === 0) {
          const pct = ((processadas / total) * 100).toFixed(1)
          console.log(`   ✅ Progresso: ${processadas}/${total} (${pct}%)`)
        }
      } catch (err) {
        erros++
        console.error(`   ❌ Erro na imagem ID ${row.id}:`, err.message)
      }
    }
  }

  console.log('\n============================================')
  console.log('📊 RELATÓRIO FINAL')
  console.log(`   Processadas: ${processadas}`)
  console.log(`   Erros: ${erros}`)
  console.log(`   Taxa de sucesso: ${((processadas - erros) / processadas * 100).toFixed(1)}%`)
  console.log('============================================')

  await pool.end()
}

migrate().catch(err => {
  console.error('❌ Erro fatal na migração:', err)
  process.exit(1)
})
