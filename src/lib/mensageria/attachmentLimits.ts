/**
 * Limite único de anexo enviado pela Mensageria. Usado pela API (validação real) e pela tela
 * (aviso antes do envio) — assim o valor mostrado ao atendente é sempre o que o servidor aceita.
 */
export const MAX_ATTACHMENT_MB = 16
export const MAX_ATTACHMENT_BYTES = MAX_ATTACHMENT_MB * 1024 * 1024

export function formatAttachmentSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

export function attachmentTooLargeMessage(fileName: string, sizeBytes: number): string {
  return `"${fileName}" tem ${formatAttachmentSize(sizeBytes)} e não pode ser enviado. O tamanho máximo permitido é ${MAX_ATTACHMENT_MB} MB.`
}
