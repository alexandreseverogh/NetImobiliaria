/**
 * Lê metadados de um arquivo de vídeo no navegador (duração, largura, altura) usando um
 * elemento <video> fora da tela. Só leitura: não reenvia nem altera o arquivo.
 */
export interface LocalVideoMeta {
  durationSeconds: number | null;
  width: number | null;
  height: number | null;
}

export function readVideoMeta(file: File): Promise<LocalVideoMeta> {
  return new Promise(resolve => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    const finish = (meta: LocalVideoMeta) => {
      URL.revokeObjectURL(url);
      resolve(meta);
    };
    video.onloadedmetadata = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : null;
      finish({
        durationSeconds: duration,
        width: video.videoWidth || null,
        height: video.videoHeight || null,
      });
    };
    // Formato que o navegador não consegue decodificar: devolve vazio; a validação
    // do servidor continua sendo a barreira real.
    video.onerror = () => finish({ durationSeconds: null, width: null, height: null });
    video.src = url;
  });
}
