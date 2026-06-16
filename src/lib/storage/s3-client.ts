/**
 * ============================================================
 * S3/MinIO Client — Object Storage Abstraction
 * ============================================================
 * 
 * Fornece interface unificada para upload/download/delete de
 * arquivos em qualquer storage compatível com S3 (AWS S3, MinIO,
 * DigitalOcean Spaces, etc.)
 * 
 * Variáveis de ambiente necessárias:
 *   S3_ENDPOINT      — URL do endpoint (ex: http://minio:9000)
 *   S3_ACCESS_KEY    — Access key
 *   S3_SECRET_KEY    — Secret key
 *   S3_BUCKET        — Nome do bucket padrão
 *   S3_REGION        — Região (default: us-east-1)
 *   S3_FORCE_PATH_STYLE — "true" para MinIO (default: true)
 * 
 * GUARDIAN RULES: ✅
 * - Fail-safe: se S3 não estiver configurado, retorna null
 * - Usa SDK oficial da AWS para assinatura V4 e integrações
 * ============================================================
 */

import { createHash } from 'crypto'
import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadBucketCommand, CreateBucketCommand, PutBucketPolicyCommand } from '@aws-sdk/client-s3'

interface UploadResult {
  s3Key: string
  url: string
  bucket: string
}

let s3ClientInstance: S3Client | null = null;
let s3Bucket: string | null = null;

function getS3Client(): S3Client | null {
  if (s3ClientInstance) return s3ClientInstance;

  const endpoint = process.env.S3_ENDPOINT
  const accessKey = process.env.S3_ACCESS_KEY
  const secretKey = process.env.S3_SECRET_KEY
  const bucket = process.env.S3_BUCKET

  if (!endpoint || !accessKey || !secretKey || !bucket) {
    return null
  }

  s3Bucket = bucket;

  s3ClientInstance = new S3Client({
    region: process.env.S3_REGION || 'us-east-1',
    endpoint: endpoint,
    credentials: {
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
    },
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== 'false', // Default to true for MinIO
  });

  return s3ClientInstance;
}

// Garante que o bucket existe com política pública de leitura (MinIO/S3 compatível)
let bucketEnsured = false;
async function ensureBucket(client: S3Client, bucket: string): Promise<void> {
  if (bucketEnsured) return;
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch {
    try {
      await client.send(new CreateBucketCommand({ Bucket: bucket }));
      await client.send(new PutBucketPolicyCommand({
        Bucket: bucket,
        Policy: JSON.stringify({
          Version: '2012-10-17',
          Statement: [{ Effect: 'Allow', Principal: '*', Action: 's3:GetObject', Resource: `arn:aws:s3:::${bucket}/*` }],
        }),
      }));
      console.log(`✅ [S3] Bucket "${bucket}" criado com política pública.`);
    } catch (err) {
      console.warn('[S3] Não foi possível criar/verificar bucket:', err);
    }
  }
  bucketEnsured = true;
}

/**
 * Verifica se o Object Storage (S3/MinIO) está configurado
 */
export function isS3Configured(): boolean {
  return getS3Client() !== null
}

/**
 * Gera a chave S3 para uma imagem de imóvel
 * Formato: tenants/{tenantId}/imoveis/{imovelId}/{timestamp}_{hash}.{ext}
 */
export function generateS3Key(
  tenantId: string,
  imovelId: number,
  contentType: string,
  buffer: Buffer
): string {
  const hash = createHash('md5').update(buffer).digest('hex').substring(0, 8)
  const timestamp = Date.now()
  const ext = contentType === 'image/png' ? 'png'
    : contentType === 'image/webp' ? 'webp'
    : 'jpg'
  
  // Organização por Tenant para isolamento físico e políticas de segurança
  return `tenants/${tenantId}/imoveis/${imovelId}/${timestamp}_${hash}.${ext}`
}

/**
 * Upload de arquivo para S3/MinIO
 * Retorna null se S3 não estiver configurado (fallback para BYTEA)
 */
export async function uploadToS3(
  s3Key: string,
  buffer: Buffer,
  contentType: string
): Promise<UploadResult | null> {
  const client = getS3Client()
  if (!client || !s3Bucket) {
    console.log('⚠️ [S3] Object Storage não configurado. Usando fallback BYTEA.')
    return null
  }

  try {
    await ensureBucket(client, s3Bucket);

    const command = new PutObjectCommand({
      Bucket: s3Bucket,
      Key: s3Key,
      Body: buffer,
      ContentType: contentType,
    });

    await client.send(command);

    console.log(`✅ [S3] Upload concluído: ${s3Key} (${buffer.length} bytes)`)

    // Quando usamos MinIO/S3 local via docker, a URL interna (http://minio:9000) não funciona pro navegador do usuário.
    // O ideal seria que a env CDN_URL apontasse para http://localhost:9000 ou domínio público.
    // Mas para manter a compatibilidade com a função antiga, vamos construir a url.
    let endpointUrl = process.env.S3_ENDPOINT as string;
    // O SDK com forcePathStyle fará endpointUrl/bucket/s3Key
    const url = `${endpointUrl}/${s3Bucket}/${s3Key}`;

    return {
      s3Key,
      url,
      bucket: s3Bucket,
    }
  } catch (error) {
    console.error('❌ [S3] Erro no upload:', error)
    return null
  }
}

/**
 * Gera URL pública/assinada para acessar o arquivo
 */
export function getS3Url(s3Key: string): string | null {
  const client = getS3Client()
  if (!client || !s3Bucket) return null

  // Para MinIO com acesso público ou proxy via CDN
  const cdnUrl = process.env.CDN_URL
  if (cdnUrl) {
    return `${cdnUrl}/${s3Key}`
  }

  return `${process.env.S3_ENDPOINT}/${s3Bucket}/${s3Key}`
}

/**
 * Deleta arquivo do S3/MinIO
 */
export async function deleteFromS3(s3Key: string): Promise<boolean> {
  const client = getS3Client()
  if (!client || !s3Bucket) return false

  try {
    const command = new DeleteObjectCommand({
      Bucket: s3Bucket,
      Key: s3Key,
    });

    await client.send(command);

    console.log(`✅ [S3] Arquivo deletado: ${s3Key}`)
    return true
  } catch (error) {
    console.error('❌ [S3] Erro ao deletar:', error)
    return false
  }
}

