/* eslint-disable */
// Tipos TypeScript para funcionalidade de vÃ­deos
// Conforme especificado no PLANEJAMENTO_VIDEOS_STEP5.md

export interface ImovelVideo {
  id: number
  imovel_id: number
  video: Buffer
  nome_arquivo: string
  tipo_mime: string
  tamanho_bytes: number
  duracao_segundos: number
  resolucao?: string
  formato: string
  ativo: boolean
  created_at: string
  updated_at: string
}

export interface VideoUploadData {
  arquivo: File
  nomeArquivo: string
  tipoMime: string
  tamanhoBytes: number
  duracaoSegundos: number
  resolucao?: string
  formato: string
}

export interface VideoValidationResult {
  isValid: boolean
  errors: string[]
  warnings?: string[]
}

export interface VideoMetadata {
  id?: number
  nome_arquivo: string
  tipo_mime: string
  tamanho_bytes: number
  duracao_segundos: number
  resolucao?: string
  formato: string
  created_at?: string
  updated_at?: string
}

