/**
 * Upload de arquivos grandes em partes (multipart), direto do navegador para o S3/MinIO.
 *
 * Por que existe: vídeo passa de centenas de MB. Recebê-lo pelo servidor do Next.js estoura o
 * limite de corpo da requisição e prende memória. O navegador envia cada parte com uma URL
 * pré-assinada; o servidor só emite as URLs e confirma o resultado.
 *
 * Variáveis de ambiente (as mesmas do s3-client.ts, mais uma):
 *   S3_ENDPOINT          — endpoint interno (ex.: http://minio:9000), usado pelo servidor
 *   S3_PUBLIC_ENDPOINT   — endpoint que o NAVEGADOR alcança (ex.: https://imovtec.com.br/storage).
 *                          Obrigatório quando o interno não é acessível do navegador. A assinatura
 *                          depende do host, então a URL assinada precisa usar este endereço.
 *   S3_ACCESS_KEY / S3_SECRET_KEY / S3_BUCKET / S3_REGION / S3_FORCE_PATH_STYLE
 *   S3_CORS_ORIGINS      — origens permitidas a enviar (separadas por vírgula). Padrão: NEXT_PUBLIC_APP_URL.
 */

import {
  S3Client,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  HeadObjectCommand,
  PutBucketCorsCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/** Tamanho de cada parte. Acima de 5 MB (mínimo do S3), resulta em no máximo 512 partes para 4 GB. */
export const PART_SIZE_BYTES = 8 * 1024 * 1024;

/** Validade da URL assinada de cada parte. */
const PART_URL_TTL_SECONDS = 60 * 60;

interface Clients {
  client: S3Client;        // operações no servidor (endpoint interno)
  signer: S3Client;        // só para assinar URLs que o navegador usa (endpoint público)
  bucket: string;
}

let cached: Clients | null | undefined;
let corsApplied = false;

function buildClients(): Clients | null {
  const internal = process.env.S3_ENDPOINT;
  const accessKeyId = process.env.S3_ACCESS_KEY;
  const secretAccessKey = process.env.S3_SECRET_KEY;
  const bucket = process.env.S3_BUCKET;
  if (!internal || !accessKeyId || !secretAccessKey || !bucket) return null;

  const region = process.env.S3_REGION || 'us-east-1';
  const forcePathStyle = process.env.S3_FORCE_PATH_STYLE !== 'false';
  const credentials = { accessKeyId, secretAccessKey };
  const publicEndpoint = process.env.S3_PUBLIC_ENDPOINT || internal;

  return {
    client: new S3Client({ region, endpoint: internal, credentials, forcePathStyle }),
    signer: new S3Client({ region, endpoint: publicEndpoint, credentials, forcePathStyle }),
    bucket,
  };
}

function clients(): Clients | null {
  if (cached === undefined) cached = buildClients();
  return cached;
}

export function isMultipartConfigured(): boolean {
  return clients() !== null;
}

/**
 * Libera o navegador a enviar ao bucket e a ler o ETag de cada parte (necessário para concluir).
 * Aplicado uma vez por processo; se já estiver configurado no bucket, não tem efeito.
 */
export async function ensureVideoUploadCors(): Promise<void> {
  if (corsApplied) return;
  const c = clients();
  if (!c) return;

  const origins = (process.env.S3_CORS_ORIGINS || process.env.NEXT_PUBLIC_APP_URL || '')
    .split(',').map(s => s.trim()).filter(Boolean);
  if (origins.length === 0) {
    console.warn('[s3-multipart] Nenhuma origem configurada em S3_CORS_ORIGINS/NEXT_PUBLIC_APP_URL — upload direto pode falhar por CORS.');
    return;
  }

  try {
    await c.client.send(new PutBucketCorsCommand({
      Bucket: c.bucket,
      CORSConfiguration: {
        CORSRules: [{
          AllowedOrigins: origins,
          AllowedMethods: ['PUT', 'GET', 'HEAD'],
          AllowedHeaders: ['*'],
          ExposeHeaders: ['ETag'],
          MaxAgeSeconds: 3600,
        }],
      },
    }));
    corsApplied = true;
  } catch (err: any) {
    console.error('[s3-multipart] Falha ao configurar CORS do bucket:', err?.message);
  }
}

export function numberOfParts(sizeBytes: number): number {
  return Math.max(1, Math.ceil(sizeBytes / PART_SIZE_BYTES));
}

export async function startMultipartUpload(key: string, contentType: string): Promise<string> {
  const c = clients();
  if (!c) throw new Error('Armazenamento de objetos não configurado.');
  const res = await c.client.send(new CreateMultipartUploadCommand({
    Bucket: c.bucket, Key: key, ContentType: contentType,
  }));
  if (!res.UploadId) throw new Error('O armazenamento não devolveu o identificador do upload.');
  return res.UploadId;
}

/** URL assinada para o navegador enviar uma parte específica (PUT direto). */
export async function presignPart(key: string, uploadId: string, partNumber: number): Promise<string> {
  const c = clients();
  if (!c) throw new Error('Armazenamento de objetos não configurado.');
  return getSignedUrl(
    c.signer,
    new UploadPartCommand({ Bucket: c.bucket, Key: key, UploadId: uploadId, PartNumber: partNumber }),
    { expiresIn: PART_URL_TTL_SECONDS },
  );
}

export async function completeMultipartUpload(
  key: string, uploadId: string, parts: { PartNumber: number; ETag: string }[],
): Promise<void> {
  const c = clients();
  if (!c) throw new Error('Armazenamento de objetos não configurado.');
  const sorted = [...parts].sort((a, b) => a.PartNumber - b.PartNumber);
  await c.client.send(new CompleteMultipartUploadCommand({
    Bucket: c.bucket, Key: key, UploadId: uploadId,
    MultipartUpload: { Parts: sorted },
  }));
}

export async function abortMultipartUpload(key: string, uploadId: string): Promise<void> {
  const c = clients();
  if (!c) return;
  await c.client.send(new AbortMultipartUploadCommand({
    Bucket: c.bucket, Key: key, UploadId: uploadId,
  })).catch(() => { /* já abortado ou expirado: nada a fazer */ });
}

/** Tamanho real do objeto no armazenamento (fonte da verdade depois do upload). */
export async function headObjectSize(key: string): Promise<number | null> {
  const c = clients();
  if (!c) return null;
  try {
    const res = await c.client.send(new HeadObjectCommand({ Bucket: c.bucket, Key: key }));
    return res.ContentLength ?? null;
  } catch {
    return null;
  }
}
