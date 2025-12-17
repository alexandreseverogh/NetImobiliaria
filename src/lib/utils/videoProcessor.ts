/**
 * Utilitário para processar vídeos de forma consistente
 * Usado tanto na criação quanto na edição de imóveis
 */

import { saveImovelVideo } from '@/lib/database/imovel-video'

export interface VideoData {
  arquivo: File | string // File object ou string base64
  nomeArquivo: string
  tipoMime: string
  tamanhoBytes: number
  duracaoSegundos: number
  resolucao: string
  formato: string
}

/**
 * Converte um arquivo File para string base64
 */
export async function convertFileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Remover o prefixo data:video/mp4;base64, se existir
      const base64Data = result.includes(',') ? result.split(',')[1] : result
      resolve(base64Data)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Processa e salva vídeo de forma consistente
 * Funciona tanto com File object quanto com string base64
 */
export async function processAndSaveVideo(
  imovelId: number, 
  videoData: VideoData
): Promise<number | null> {
  try {
    console.log('🔍 Processando vídeo para imóvel:', imovelId)
    console.log('🔍 Dados do vídeo recebidos:', {
      nomeArquivo: videoData.nomeArquivo,
      tipoMime: videoData.tipoMime,
      tamanhoBytes: videoData.tamanhoBytes,
      duracaoSegundos: videoData.duracaoSegundos,
      formato: videoData.formato,
      arquivoType: typeof videoData.arquivo
    })
    
    let videoBuffer: Buffer
    
    if (videoData.arquivo instanceof File) {
      // Se é File object, converter para Buffer
      console.log('🔍 Convertendo File object para Buffer')
      const arrayBuffer = await videoData.arquivo.arrayBuffer()
      videoBuffer = Buffer.from(arrayBuffer)
    } else {
      // Se é string base64, converter para Buffer
      console.log('🔍 Convertendo base64 para Buffer')
      const base64Data = videoData.arquivo.includes(',') 
        ? videoData.arquivo.split(',')[1] 
        : videoData.arquivo
      videoBuffer = Buffer.from(base64Data, 'base64')
    }
    
    console.log('🔍 Buffer criado com tamanho:', videoBuffer.length)
    
    const videoSaveData = {
      video: videoBuffer,
      nome_arquivo: videoData.nomeArquivo || 'video.mp4',
      tipo_mime: videoData.tipoMime || 'video/mp4',
      tamanho_bytes: videoData.tamanhoBytes || videoBuffer.length,
      duracao_segundos: videoData.duracaoSegundos || 30,
      resolucao: videoData.resolucao || '1920x1080',
      formato: videoData.formato || 'mp4'
    }
    
    console.log('🔍 Chamando saveImovelVideo com dados:', {
      imovelId,
      nome_arquivo: videoSaveData.nome_arquivo,
      tipo_mime: videoSaveData.tipo_mime,
      tamanho_bytes: videoSaveData.tamanho_bytes,
      duracao_segundos: videoSaveData.duracao_segundos,
      formato: videoSaveData.formato
    })
    
    const videoId = await saveImovelVideo(imovelId, videoSaveData)
    console.log('✅ Vídeo salvo com sucesso, ID:', videoId)
    
    return videoId
  } catch (error) {
    console.error('❌ Erro ao processar e salvar vídeo:', error)
    if (error instanceof Error) {
      console.error('❌ Stack trace:', error.stack)
    }
    throw error
  }
}




