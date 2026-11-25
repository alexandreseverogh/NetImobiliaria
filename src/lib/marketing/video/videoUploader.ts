/**
 * Envio de vídeo em partes (multipart) direto ao armazenamento.
 * Fluxo: init → part (URL assinada por parte, PUT direto) → complete. Em qualquer falha,
 * abort libera as partes já enviadas. Usa adminFetch para autenticar as rotas de API.
 */
import { adminFetch } from '@/lib/auth/adminFetch';

export interface VideoUploadInit {
  assetId: string;
  partSizeBytes: number;
  partCount: number;
  warnings: string[];
}

export interface VideoUploadMeta {
  fileName: string;
  sizeBytes: number;
  mimeType: string;
  durationSeconds: number | null;
  width: number | null;
  height: number | null;
  clientId?: string | null;
}

export class VideoUploadError extends Error {
  blockers?: string[];
  warnings?: string[];
  constructor(message: string, extra?: { blockers?: string[]; warnings?: string[] }) {
    super(message);
    this.blockers = extra?.blockers;
    this.warnings = extra?.warnings;
  }
}

async function readError(res: Response, fallback: string) {
  const data = await res.json().catch(() => null);
  return new VideoUploadError(data?.error || fallback, { blockers: data?.blockers, warnings: data?.warnings });
}

async function uploadPart(url: string, blob: Blob, attempts = 3): Promise<string> {
  let lastError: unknown = null;
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(url, { method: 'PUT', body: blob });
      if (res.ok) {
        const etag = res.headers.get('ETag');
        if (!etag) throw new VideoUploadError('O armazenamento não devolveu a identificação da parte (ETag).');
        return etag;
      }
      lastError = new VideoUploadError(`Falha ao enviar parte (HTTP ${res.status}).`);
    } catch (err) {
      lastError = err;
    }
    // Espera curta antes de tentar de novo (1s, 2s).
    if (i < attempts) await new Promise(r => setTimeout(r, 1000 * i));
  }
  throw lastError instanceof Error ? lastError : new VideoUploadError('Falha ao enviar parte do vídeo.');
}

/**
 * Envia o arquivo. `onProgress` recebe a fração 0..1 (partes concluídas / total).
 * Retorna o assetId pronto para ser referenciado pelo wizard.
 */
export async function uploadVideoMultipart(
  file: File,
  meta: Omit<VideoUploadMeta, 'fileName' | 'sizeBytes' | 'mimeType'>,
  onProgress?: (fraction: number) => void,
): Promise<{ assetId: string; warnings: string[] }> {
  const initRes = await adminFetch('/api/admin/campanhas/criativos/video/init', {
    method: 'POST',
    body: JSON.stringify({
      fileName: file.name,
      sizeBytes: file.size,
      mimeType: file.type || 'video/mp4',
      ...meta,
    }),
  });
  if (!initRes.ok) throw await readError(initRes, 'Não foi possível iniciar o envio do vídeo.');
  const init: VideoUploadInit = await initRes.json();

  const parts: { partNumber: number; etag: string }[] = [];
  try {
    for (let partNumber = 1; partNumber <= init.partCount; partNumber++) {
      const start = (partNumber - 1) * init.partSizeBytes;
      const end = Math.min(start + init.partSizeBytes, file.size);
      const blob = file.slice(start, end);

      const urlRes = await adminFetch('/api/admin/campanhas/criativos/video/part', {
        method: 'POST',
        body: JSON.stringify({ assetId: init.assetId, partNumber }),
      });
      if (!urlRes.ok) throw await readError(urlRes, 'Não foi possível preparar uma parte do envio.');
      const { url } = await urlRes.json();

      const etag = await uploadPart(url, blob);
      parts.push({ partNumber, etag });
      onProgress?.(partNumber / init.partCount);
    }

    const doneRes = await adminFetch('/api/admin/campanhas/criativos/video/complete', {
      method: 'POST',
      body: JSON.stringify({ assetId: init.assetId, parts }),
    });
    if (!doneRes.ok) throw await readError(doneRes, 'Não foi possível concluir o envio do vídeo.');
    return { assetId: init.assetId, warnings: init.warnings };
  } catch (err) {
    // Libera partes já enviadas; falha no abort não mascara o erro original.
    await adminFetch('/api/admin/campanhas/criativos/video/abort', {
      method: 'POST',
      body: JSON.stringify({ assetId: init.assetId }),
    }).catch(() => { /* melhor esforço */ });
    throw err;
  }
}
