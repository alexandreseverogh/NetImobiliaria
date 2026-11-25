/**
 * Regras de validação de vídeo para criativos da Meta (Fase 1 — criativos em vídeo).
 *
 * Duas categorias, sem ambiguidade:
 *  - BLOQUEIO: impede o envio (tamanho, formato, arquivo inválido).
 *  - AVISO: permite seguir, mas o usuário precisa confirmar (duração, proporção, resolução).
 *
 * Esta lógica roda no navegador (feedback imediato) e de novo no servidor (fonte da verdade).
 * Nunca confiar só na validação do cliente.
 */

export const VIDEO_RULES = {
  maxBytes: 4 * 1024 * 1024 * 1024,           // 4 GB — limite de arquivo de vídeo da Meta
  allowedMimeTypes: ['video/mp4', 'video/quicktime'],
  allowedExtensions: ['.mp4', '.mov'],
  recommendedMaxSeconds: 120,                  // 2 min — acima disso há aviso (retenção cai)
  // Proporções recomendadas: 4:5 (feed) e 9:16 (Reels/Stories). Tolerância de 2%.
  recommendedAspectRatios: [4 / 5, 9 / 16],
  aspectTolerance: 0.02,
  recommendedMinHeightPx: 720,
} as const;

export interface VideoMeta {
  fileName: string;
  sizeBytes: number;
  mimeType: string;
  durationSeconds?: number | null;
  width?: number | null;
  height?: number | null;
}

export interface VideoValidation {
  blockers: string[];   // impedem o envio
  warnings: string[];   // o usuário pode seguir mesmo assim (confirmação explícita)
}

function formatGb(bytes: number): string {
  return (bytes / (1024 ** 3)).toFixed(2).replace('.', ',') + ' GB';
}

function extensionOf(fileName: string): string {
  const i = fileName.lastIndexOf('.');
  return i >= 0 ? fileName.slice(i).toLowerCase() : '';
}

export function validateVideoMeta(meta: VideoMeta): VideoValidation {
  const blockers: string[] = [];
  const warnings: string[] = [];

  // ── Bloqueios ──
  if (!Number.isFinite(meta.sizeBytes) || meta.sizeBytes <= 0) {
    blockers.push('Não foi possível ler o tamanho do arquivo. Envie o vídeo novamente.');
  } else if (meta.sizeBytes > VIDEO_RULES.maxBytes) {
    blockers.push(`O vídeo tem ${formatGb(meta.sizeBytes)}. O limite da Meta é ${formatGb(VIDEO_RULES.maxBytes)}.`);
  }

  const ext = extensionOf(meta.fileName);
  const formatOk = VIDEO_RULES.allowedMimeTypes.includes(meta.mimeType as never)
    && VIDEO_RULES.allowedExtensions.includes(ext as never);
  if (!formatOk) {
    blockers.push('Formato não suportado. Use MP4 ou MOV (H.264 com áudio AAC é o mais compatível).');
  }

  // ── Avisos ──
  if (meta.durationSeconds == null) {
    warnings.push('Não conseguimos ler a duração do vídeo. Confira se ele não é muito longo.');
  } else if (meta.durationSeconds > VIDEO_RULES.recommendedMaxSeconds) {
    const min = Math.round(meta.durationSeconds / 60 * 10) / 10;
    warnings.push(`O vídeo tem ${min} min. Vídeos acima de ${VIDEO_RULES.recommendedMaxSeconds / 60} min costumam perder retenção.`);
  }

  if (meta.width && meta.height) {
    const ratio = meta.width / meta.height;
    const ok = VIDEO_RULES.recommendedAspectRatios.some(r => Math.abs(ratio - r) / r <= VIDEO_RULES.aspectTolerance);
    if (!ok) {
      warnings.push(`A proporção é ${meta.width}×${meta.height}. Recomendamos 4:5 (feed) ou 9:16 (Reels e Stories).`);
    }
    if (Math.min(meta.width, meta.height) < VIDEO_RULES.recommendedMinHeightPx) {
      warnings.push(`A resolução é ${meta.width}×${meta.height}. Recomendamos ao menos ${VIDEO_RULES.recommendedMinHeightPx} px no lado menor.`);
    }
  } else {
    warnings.push('Não conseguimos ler a resolução do vídeo. Confira a proporção antes de lançar.');
  }

  return { blockers, warnings };
}
