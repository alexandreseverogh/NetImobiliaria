'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Imovel } from '@/lib/types/admin'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import ImagePrincipalSelector from './ImagePrincipalSelector'
import VideoUpload from './VideoUpload'
import VideoPreview from './VideoPreview'
import VideoModal from './VideoModal'
import { ImovelVideo, VideoUploadData } from '@/lib/types/video'
import { EyeIcon, TrashIcon } from '@heroicons/react/24/outline'
import { UPLOAD_CONFIG } from '@/lib/config/constants'

interface TipoDocumento {
  id: number
  descricao: string
  consulta_imovel_internauta: boolean
  ativo: boolean
}

interface MediaStepProps {
  data: Partial<Imovel>
  onUpdate: (data: Partial<Imovel>) => void
  mode: 'create' | 'edit'
  imovelId?: number
  registrarAlteracaoRascunho?: (tipo: 'imagem' | 'documento', acao: 'adicionar' | 'remover', id: string) => Promise<void>
  registrarVideoAlteracaoRascunho?: (acao: 'adicionar' | 'remover', dados?: any) => Promise<void>
  substituirVideoRascunho?: (novosDados: any) => Promise<void>
  registrarImagemPrincipalRascunho?: (imageId: string) => Promise<void>
  rascunho?: any // Dados do rascunho para verificar alterações pendentes
}

interface UploadedFile {
  id: string
  file: File
  preview: string
  progress: number
  status: 'uploading' | 'completed' | 'error'
  error?: string
  tipoDocumentoId?: number
  tipoDocumentoDescricao?: string
  url?: string
  principal?: boolean
  tipo?: string
  tamanhoBytes?: number
}

interface LoadedImage {
  id: string
  url: string
  nome: string
  descricao: string
  ordem: number
  principal: boolean
  dataUpload: string
  tamanho: number
  tipo: string
}

const MAX_IMAGES = UPLOAD_CONFIG.MAX_IMAGES_PER_IMOVEL

function MediaStep({ data, onUpdate, mode, imovelId, registrarAlteracaoRascunho, registrarVideoAlteracaoRascunho, substituirVideoRascunho, registrarImagemPrincipalRascunho, rascunho }: MediaStepProps) {
  const { fetch: authFetch, get, post, delete: del } = useAuthenticatedFetch()
  const [tiposDocumentos, setTiposDocumentos] = useState<TipoDocumento[]>([])
  const [selectedImages, setSelectedImages] = useState<UploadedFile[]>([])
  const [duplicateImageWarning, setDuplicateImageWarning] = useState<string | null>(null)
  const [video, setVideo] = useState<ImovelVideo | null>(null)
  const [selectedVideo, setSelectedVideo] = useState<VideoUploadData | null>(null)
  const [videoRemovido, setVideoRemovido] = useState(false)
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false)
  const [isLoadingVideo, setIsLoadingVideo] = useState(false) // Flag para evitar chamadas automáticas ao rascunho
  const [selectedDocuments, setSelectedDocuments] = useState<UploadedFile[]>([])

  // Função para limpar a tabela imovel_rascunho
  const limparRascunhos = useCallback(async () => {
    try {
      console.log('🧹 MediaStep - Limpando tabela imovel_rascunho...')
      const response = await del('/api/admin/limpar-rascunhos')

      if (response.ok) {
        console.log('✅ MediaStep - Tabela imovel_rascunho limpa com sucesso')
      } else {
        console.error('❌ MediaStep - Erro ao limpar tabela imovel_rascunho:', response.status)
      }
    } catch (error) {
      console.error('❌ MediaStep - Erro ao limpar rascunhos:', error)
    }
  }, [])
  const [loadedImages, setLoadedImages] = useState<LoadedImage[]>([])
  const [loading, setLoading] = useState(true)
  const [dragActive, setDragActive] = useState(false)
  const [selectedTipoDocumento, setSelectedTipoDocumento] = useState<number | null>(null)
  const [selectedPrincipalId, setSelectedPrincipalId] = useState<string>('')
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)
  const [selectedImageForPreview, setSelectedImageForPreview] = useState<string>('')


  console.log('🔍 MediaStep - Props recebidas:', { mode, imovelId, hasData: !!data, dataKeys: Object.keys(data || {}) })
  console.log('🔍 MediaStep - Dados de imagens:', data?.imagens)
  console.log('🔍 MediaStep - Dados de documentos:', data?.documentos)
  console.log('🔍 MediaStep - Dados completos recebidos:', data)

  // Removido useImageUpload - usando authFetch diretamente

  const imageInputRef = useRef<HTMLInputElement>(null)
  const documentInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadTiposDocumentos()
  }, [])

  // REMOVIDO: Limpeza automática de rascunhos - deve ser feita na página pai
  // useEffect(() => {
  //   limparRascunhos()
  // }, [])

  // Scroll para o topo quando o componente é montado
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  // Definir imagem principal quando imagens são carregadas
  useEffect(() => {
    if (loadedImages.length > 0) {
      const principalImage = loadedImages.find(img => img.principal)
      if (principalImage) {
        setSelectedPrincipalId(principalImage.id)
      } else if (loadedImages.length === 1) {
        // Se há apenas uma imagem, definir como principal automaticamente
        setSelectedPrincipalId(loadedImages[0].id)
      }
    }
  }, [loadedImages])

  // Carregar imagens existentes no modo de edição
  useEffect(() => {
    if (mode === 'edit' && data.imagens && data.imagens.length > 0 && loadedImages.length === 0) {
      console.log('🔍 MediaStep - Carregando imagens dos dados recebidos:', data.imagens.length)


      // Converter imagens dos dados para o formato esperado pelo hook
      const imagensFormatadas = data.imagens.map((img: any) => {
        console.log('🔍 MediaStep - Processando imagem:', {
          id: img.id,
          tipo_mime: img.tipo_mime,
          tem_url: !!img.url,
          tem_imagem: !!img.imagem,
          tipo_imagem: typeof img.imagem,
          tamanho_imagem: img.imagem ? img.imagem.length : 0
        })

        // Se a imagem já vem com URL (da API), usar direto
        let imageUrl = ''
        if (img.url) {
          imageUrl = img.url
        } else if (img.imagem) {
          // Converter Buffer para base64 (fallback)
          let base64String = ''
          if (Buffer.isBuffer(img.imagem)) {
            base64String = img.imagem.toString('base64')
          } else if (typeof img.imagem === 'object' && img.imagem.data) {
            base64String = Buffer.from(img.imagem.data).toString('base64')
          }
          imageUrl = `data:${img.tipo_mime};base64,${base64String}`
        }

        return {
          id: img.id.toString(),
          url: imageUrl,
          nome: `imagem_${img.id}`,
          descricao: '',
          ordem: img.ordem,
          principal: img.principal || img.is_principal,
          dataUpload: img.created_at,
          tamanho: img.tamanho_bytes,
          tipo: img.tipo_mime
        }
      })

      console.log('🔍 MediaStep - Imagens formatadas:', imagensFormatadas)

      // Atualizar o estado das imagens carregadas
      setLoadedImages(imagensFormatadas)
    }
  }, [mode, data.imagens]) // Incluído data.imagens mas com verificação loadedImages.length === 0 para evitar loop

  // Carregar documentos existentes no modo de edição
  useEffect(() => {
    console.log('🔍 MediaStep - useEffect documentos:', {
      mode,
      hasDocumentos: !!data.documentos,
      documentosLength: data.documentos?.length,
      imovelId,
      dataKeys: Object.keys(data || {}),
      dataDocumentos: data?.documentos
    })

    if (mode === 'edit' && data.documentos && data.documentos.length > 0) {

      console.log('🔍 MediaStep - Carregando documentos existentes:', data.documentos)
      console.log('🔍 MediaStep - Estrutura do primeiro documento:', data.documentos[0])

      const documentosExistentes = data.documentos.map((doc: any, index: number) => {
        console.log('🔍 MediaStep - Processando documento:', {
          id: doc.id,
          nome_arquivo: doc.nome_arquivo,
          tipo_mime: doc.tipo_mime,
          id_tipo_documento: doc.id_tipo_documento,
          tipo_documento_descricao: doc.tipo_documento_descricao,
          docCompleto: doc
        })

        // Verificar se tipo_documento_descricao está presente
        if (!doc.tipo_documento_descricao) {
          console.error('❌ MediaStep - tipo_documento_descricao está ausente para documento:', doc.id)
          console.error('❌ MediaStep - Estrutura completa do documento:', doc)
        }

        // Criar um arquivo vazio para representar o documento existente
        // Se nome_arquivo for um blob URL, usar descrição do tipo de documento
        let nomeArquivo = doc.nome_arquivo || `documento_${doc.id}`
        if (nomeArquivo.startsWith('blob:')) {
          nomeArquivo = `${doc.tipo_documento_descricao || 'Documento'}.${doc.tipo_mime?.split('/')[1] || 'pdf'}`
        }

        // Criar um File com o tamanho real do documento
        const tamanhoBytes = parseInt(doc.tamanho_bytes) || 0
        // Criar um Blob com dados dummy para preservar o tamanho
        const dummyData = new Uint8Array(tamanhoBytes)
        const blob = new Blob([dummyData], { type: doc.tipo_mime || 'application/octet-stream' })
        const file = new File([blob], nomeArquivo, {
          type: doc.tipo_mime || 'application/octet-stream',
          lastModified: Date.now()
        })

        const documentoFormatado = {
          id: doc.id.toString(),
          file: file,
          preview: nomeArquivo,
          progress: 100,
          status: 'completed' as const,
          tipoDocumentoId: doc.id_tipo_documento,
          tipoDocumentoDescricao: doc.tipo_documento_descricao || 'Tipo não encontrado'
        }

        console.log('🔍 MediaStep - Documento formatado:', documentoFormatado)
        return documentoFormatado
      })

      console.log('🔍 MediaStep - Documentos processados:', documentosExistentes)
      console.log('🔍 MediaStep - Primeiro documento detalhado:', documentosExistentes[0])
      setSelectedDocuments(documentosExistentes)
    } else if (mode === 'edit' && imovelId) {
      console.log('🔍 MediaStep - Nenhum documento encontrado em data.documentos, mas imovelId existe:', imovelId)
    }
  }, [mode, imovelId]) // Removido data.documentos para evitar loop

  // Removido useEffect duplicado que carrega vídeo - substituído por um mais simples abaixo

  // Monitorar mudanças no rascunho para atualizar estado local do vídeo
  useEffect(() => {
    console.log('🔍 MediaStep - useEffect rascunho EXECUTADO:', {
      rascunho: !!rascunho,
      rascunhoVideo: rascunho?.alteracoes?.video,
      videoRemovido: rascunho?.alteracoes?.video?.removido,
      videoAdicionado: rascunho?.alteracoes?.video?.adicionado
    })

    if (rascunho?.alteracoes?.video) {
      const { video: videoAlteracao } = rascunho.alteracoes

      if (videoAlteracao.removido && !videoAlteracao.adicionado) {
        console.log('🔍 MediaStep - Vídeo foi removido no rascunho, limpando estado local')
        setVideo(null)
        setSelectedVideo(null)
      } else if (videoAlteracao.adicionado && videoAlteracao.dados) {
        console.log('🔍 MediaStep - Vídeo foi adicionado no rascunho, atualizando estado local')
        // O selectedVideo já deve estar definido, mas vamos garantir
        if (!selectedVideo) {
          setSelectedVideo(videoAlteracao.dados)
        }
      }
    }
  }, [rascunho?.alteracoes?.video]) // Dependência mais específica para evitar loop

  // Removido useEffect que monitora mudanças nos dados do imóvel para evitar loop infinito

  // Log adicional para debug
  console.log('🔍 MediaStep - RENDERIZAÇÃO - data.video:', data.video)
  console.log('🔍 MediaStep - RENDERIZAÇÃO - data completo:', data)

  // useEffect com dependências mínimas para evitar loop infinito - CORREÇÃO HOLÍSTICA
  useEffect(() => {
    // Atualizar dados quando arquivos mudarem
    console.log('🔍 MediaStep - useEffect executado:', {
      mode,
      selectedVideo: !!selectedVideo,
      selectedImages: selectedImages.length,
      selectedDocuments: selectedDocuments.length,
      selectedPrincipalId,
      hasVideo: !!video,
      hasDataVideo: !!data.video,
      isLoadingVideo
    })

    // LOG CRÍTICO: Verificar se todos os documentos estão sendo processados
    console.log('🔍 MediaStep - useEffect - selectedDocuments detalhados:', selectedDocuments.map((doc, index) => ({
      index: index + 1,
      id: doc.id,
      nome: doc.file.name,
      status: doc.status,
      tipoDocumentoId: doc.tipoDocumentoId
    })))

    console.log('🔍 MediaStep - isLoadingVideo:', isLoadingVideo)

    // CORREÇÃO HOLÍSTICA: Só executar updateData quando documentos estiverem carregados no modo edição
    if (mode === 'edit' && data.documentos && data.documentos.length > 0 && selectedDocuments.length === 0) {
      console.log('🔍 MediaStep - Pulando updateData - documentos ainda sendo carregados')
      return
    }

    console.log('🔍 MediaStep - Executando updateData SEMPRE')

    const updateData = async () => {
      // LOG CRÍTICO: Verificar selectedImages
      console.log('🔍 MediaStep - updateData - selectedImages TOTAL:', selectedImages.length)
      console.log('🔍 MediaStep - updateData - selectedImages detalhado:', selectedImages.map(img => ({
        id: img.id,
        status: img.status,
        hasFile: !!img.file,
        fileName: img.file?.name
      })))
      console.log('🔍 MediaStep - updateData - selectedImages COM status completed:', selectedImages.filter(img => img.status === 'completed').length)

      // Unir imagens carregadas (do banco) com novas imagens (sendo enviadas)
      const novasImagensData = await Promise.all(
        selectedImages.filter(img => img.status === 'completed').map(async (img) => {
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.readAsDataURL(img.file)
          })

          return {
            id: img.id,
            url: base64,
            nome: img.file.name,
            descricao: '',
            ordem: selectedImages.indexOf(img) + 1,
            principal: false,
            dataUpload: new Date().toISOString(),
            tamanho: img.file.size,
            tipo: img.file.type
          }
        })
      )

      console.log('🔍 MediaStep - updateData - novasImagensData processadas:', novasImagensData.length)
      console.log('🔍 MediaStep - updateData - novasImagensData detalhado:', novasImagensData.map(img => ({
        id: img.id,
        nome: img.nome,
        hasUrl: !!img.url,
        urlLength: img.url?.length || 0
      })))

      // Combinar imagens carregadas + novas imagens
      const imagensData = [...loadedImages, ...novasImagensData]
      console.log('🔍 MediaStep - updateData - imagensData FINAL:', imagensData.length)

      // Converter documentos para base64
      console.log('🔍 MediaStep - Documentos selecionados:', selectedDocuments.length)
      console.log('🔍 MediaStep - Documentos com status completed:', selectedDocuments.filter(doc => doc.status === 'completed').length)
      console.log('🔍 MediaStep - Todos os status dos documentos:', selectedDocuments.map(doc => ({ id: doc.id, status: doc.status })))

      // No modo de criação, processar todos os documentos independente do status
      // No modo de edição, processar apenas os com status 'completed'
      const documentosParaProcessar = mode === 'create'
        ? selectedDocuments
        : selectedDocuments.filter(doc => doc.status === 'completed')

      console.log('🔍 MediaStep - Documentos para processar:', documentosParaProcessar.length)
      console.log('🔍 MediaStep - TOTAL selectedDocuments:', selectedDocuments.length)
      console.log('🔍 MediaStep - MODE:', mode)
      console.log('🔍 MediaStep - Documentos com status completed:', selectedDocuments.filter(doc => doc.status === 'completed').length)
      console.log('🔍 MediaStep - Detalhes dos documentos para processar:', documentosParaProcessar.map((doc, index) => ({
        index: index + 1,
        id: doc.id,
        nome: doc.file.name,
        status: doc.status,
        tipoDocumentoId: doc.tipoDocumentoId,
        tipoArquivo: doc.file.type,
        isPDF: doc.file.type === 'application/pdf',
        isImage: doc.file.type.startsWith('image/')
      })))

      // VERIFICAÇÃO CRÍTICA: Contar documentos por tipo
      const documentosPorTipo = documentosParaProcessar.reduce((acc, doc) => {
        const tipo = doc.file.type
        acc[tipo] = (acc[tipo] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      console.log('🔍 MediaStep - Documentos por tipo MIME:', documentosPorTipo)

      const documentosData = await Promise.all(
        documentosParaProcessar.map(async (doc, index) => {
          console.log(`🔍 MediaStep - Processando documento ${index + 1}/${documentosParaProcessar.length}:`, {
            id: doc.id,
            nome: doc.file.name,
            tipo: doc.file.type,
            tamanho: doc.file.size,
            status: doc.status,
            tipoDocumentoId: doc.tipoDocumentoId
          })

          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.readAsDataURL(doc.file)
          })

          const documentoProcessado = {
            id: parseInt(doc.id) || 0,
            imovelId: imovelId || 0,
            tipoDocumentoId: doc.tipoDocumentoId || 0,
            tipoDocumentoDescricao: doc.tipoDocumentoDescricao || '',
            nomeArquivo: doc.preview || doc.file.name,
            arquivo: base64, // Enviar como base64
            tipoMime: doc.file.type,
            tamanhoBytes: doc.file.size,
            dataUpload: new Date().toISOString()
          }

          console.log(`✅ MediaStep - Documento ${index + 1} processado com sucesso:`, {
            id: documentoProcessado.id,
            tipoDocumentoId: documentoProcessado.tipoDocumentoId,
            nomeArquivo: documentoProcessado.nomeArquivo,
            tipoMime: documentoProcessado.tipoMime,
            tamanhoBytes: documentoProcessado.tamanhoBytes
          })

          return documentoProcessado
        })
      )

      console.log('🔍 MediaStep - Imagens atualizadas:', imagensData.length)
      console.log('🔍 MediaStep - Imagens atualizadas DETALHADAS:', imagensData.map(img => ({
        id: img.id,
        nome: img.nome,
        hasUrl: !!img.url,
        urlSubstring: img.url?.substring(0, 50)
      })))
      console.log('🔍 MediaStep - Documentos atualizados:', documentosData.length)
      console.log('🔍 MediaStep - Documentos detalhados:', documentosData)
      console.log('🔍 MediaStep - Imagem principal selecionada:', selectedPrincipalId)
      console.log('🔍 MediaStep - Vídeo selecionado:', selectedVideo)
      console.log('🔍 MediaStep - Vídeo foi removido?', videoRemovido)

      // LÓGICA CORRIGIDA: Detectar remoção explícita de vídeo
      const videoData = videoRemovido ? null : (
        selectedVideo ? {
          arquivo: selectedVideo.arquivo,
          nomeArquivo: selectedVideo.nomeArquivo,
          tipoMime: selectedVideo.tipoMime,
          tamanhoBytes: selectedVideo.tamanhoBytes,
          duracaoSegundos: selectedVideo.duracaoSegundos,
          resolucao: selectedVideo.resolucao,
          formato: selectedVideo.formato
        } : (video ? {
          id: video.id,
          nomeArquivo: video.nome_arquivo,
          tipoMime: video.tipo_mime,
          tamanhoBytes: video.tamanho_bytes,
          duracaoSegundos: video.duracao_segundos,
          resolucao: video.resolucao,
          formato: video.formato
        } : (data.video ? {
          id: data.video.id,
          nomeArquivo: data.video.nome_arquivo,
          tipoMime: data.video.tipo_mime,
          tamanhoBytes: data.video.tamanho_bytes,
          duracaoSegundos: data.video.duracao_segundos,
          resolucao: data.video.resolucao,
          formato: data.video.formato
        } : null))
      )

      console.log('🔍 MediaStep - Dados do vídeo para onUpdate:', videoData)

      const dataParaOnUpdate = {
        imagens: imagensData,
        documentos: documentosData,
        video: videoData
      }

      console.log('🔍 MediaStep - CHAMANDO onUpdate com dados:', {
        imagens_count: dataParaOnUpdate.imagens?.length || 0,
        documentos_count: dataParaOnUpdate.documentos?.length || 0,
        tem_video: !!dataParaOnUpdate.video
      })
      console.log('🔍 MediaStep - IMAGENS sendo enviadas para onUpdate:', dataParaOnUpdate.imagens)

      onUpdate(dataParaOnUpdate)

      console.log('🔍 MediaStep - onUpdate chamado com vídeo:', !!videoData)

      // Notificar sobre mudança de imagem principal separadamente
      console.log('🔍 MediaStep - Imagem principal selecionada:', selectedPrincipalId)
    }

    updateData()
  }, [selectedImages.length, selectedDocuments.length, selectedPrincipalId, selectedVideo, videoRemovido, loadedImages.length, mode]) // Incluído loadedImages.length

  // useEffect simples apenas para carregar vídeo existente sem causar loop
  useEffect(() => {
    console.log('🔍 MediaStep - useEffect vídeo EXECUTADO:', {
      mode,
      hasDataVideo: !!data.video,
      dataVideoId: data.video?.id,
      currentVideo: !!video,
      currentVideoId: video?.id
    })

    if (mode === 'edit' && data.video) {
      console.log('🔍 MediaStep - Carregando vídeo existente (useEffect simples):', data.video)
      setIsLoadingVideo(true) // Marcar como carregamento automático
      setVideo(data.video)
      setIsLoadingVideo(false)
    } else if (mode === 'edit' && !data.video) {
      console.log('🔍 MediaStep - Nenhum vídeo encontrado para carregar')
      setVideo(null)
    }
  }, [mode, data.video?.id]) // Apenas quando o ID do vídeo muda

  const loadTiposDocumentos = useCallback(async () => {
    try {
      setLoading(true)
      const response = await get('/api/admin/tipos-documentos')
      if (response.ok) {
        const data = await response.json()
        // A API retorna { success: true, tiposDocumentos: [...] }
        const tiposAtivos = data.tiposDocumentos?.filter((t: any) => t.ativo === true) || []
        setTiposDocumentos(tiposAtivos)
      }
    } catch (error) {
      console.error('Erro ao carregar tipos de documentos:', error)
    } finally {
      setLoading(false)
    }
  }, [get])

  const handleImageUpload = async (files: FileList) => {
    if (!files || files.length === 0) {
      return
    }

    const normalizeName = (name: string) => name.trim().toLowerCase()
    const makeSignature = (name: string, size?: number | string) =>
      `${normalizeName(name)}::${size ?? 'unknown'}`
    const anySignature = (name: string) => makeSignature(name, 'any')

    const existingSignatures = new Set<string>()
    const addSignature = (name?: string | null, size?: number) => {
      if (!name) return
      existingSignatures.add(makeSignature(name, size))
      existingSignatures.add(anySignature(name))
    }

    loadedImages.forEach((img) => addSignature(img.nome, img.tamanho))
    selectedImages.forEach((img) => {
      if (img.file) {
        addSignature(img.file.name, img.file.size)
      } else if (img.preview) {
        addSignature(img.preview, undefined)
      }
    })

    let currentImageCount =
      loadedImages.length + selectedImages.filter((img) => img.status !== 'error').length

    if (currentImageCount >= MAX_IMAGES) {
      setDuplicateImageWarning(`O limite máximo de ${MAX_IMAGES} imagens foi atingido.`)
      return
    }

    const duplicateNames: string[] = []
    let limitReached = false

    if (!imovelId) {
      const newImages: UploadedFile[] = []

      Array.from(files).forEach((file, index) => {
        if (!file.type.startsWith('image/')) {
          return
        }

        const signatureExact = makeSignature(file.name, file.size)
        const signatureAnyKey = anySignature(file.name)

        if (existingSignatures.has(signatureExact) || existingSignatures.has(signatureAnyKey)) {
          duplicateNames.push(file.name)
          return
        }

        if (currentImageCount >= MAX_IMAGES) {
          limitReached = true
          return
        }

        currentImageCount += 1
        addSignature(file.name, file.size)

        const id = `temp-img-${Date.now()}-${index}`
        const preview = URL.createObjectURL(file)

        newImages.push({
          id,
          file,
          preview,
          progress: 100,
          status: 'completed'
        })
      })

      if (newImages.length > 0) {
        setSelectedImages((prev) => {
          const updated = [...prev, ...newImages]
          return updated
        })
      }

      const messages: string[] = []
      if (duplicateNames.length > 0) {
        const uniqueNames = Array.from(new Set(duplicateNames))
        messages.push(
          `As imagens ${uniqueNames.join(', ')} já estavam adicionadas e foram ignoradas.`
        )
      }
      if (limitReached) {
        messages.push(`O limite máximo de ${MAX_IMAGES} imagens foi atingido.`)
      }
      setDuplicateImageWarning(messages.length > 0 ? messages.join(' ') : null)
      return
    }

    const validFiles: File[] = []

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) {
        return
      }

      const signatureExact = makeSignature(file.name, file.size)
      const signatureAnyKey = anySignature(file.name)

      if (existingSignatures.has(signatureExact) || existingSignatures.has(signatureAnyKey)) {
        duplicateNames.push(file.name)
        return
      }

      if (currentImageCount >= MAX_IMAGES) {
        limitReached = true
        return
      }

      currentImageCount += 1
      addSignature(file.name, file.size)
      validFiles.push(file)
    })

    const messages: string[] = []
    if (duplicateNames.length > 0) {
      const uniqueNames = Array.from(new Set(duplicateNames))
      messages.push(
        `As imagens ${uniqueNames.join(', ')} já estavam adicionadas e foram ignoradas.`
      )
    }
    if (limitReached) {
      messages.push(`O limite máximo de ${MAX_IMAGES} imagens foi atingido.`)
    }
    setDuplicateImageWarning(messages.length > 0 ? messages.join(' ') : null)

    if (validFiles.length === 0) {
      return
    }

    // Modo edição - upload direto com authFetch
    try {
      const formData = new FormData()
      validFiles.forEach((file) => {
        formData.append('images', file)
      })

      const uploadResponse = await authFetch(`/api/admin/imoveis/${imovelId}/imagens`, {
        method: 'POST',
        body: formData
      })

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json()
        throw new Error(errorData.error || 'Erro ao fazer upload das imagens')
      }

      console.log('✅ MediaStep - Upload concluído com sucesso')

      // Após upload bem-sucedido, recarregar TODAS as imagens da API
      console.log('🔍 MediaStep - Recarregando imagens da API após upload')
      const response = await get(`/api/admin/imoveis/${imovelId}/imagens`)
      if (response.ok) {
        const data = await response.json()
        const imagensDoBanco = data.data || []

        // Encontrar apenas as imagens que não estão já carregadas
        const idsCarregados = loadedImages.map((img) => parseInt(img.id))
        const novasImagens = imagensDoBanco.filter((img: any) => !idsCarregados.includes(img.id))

        console.log('🔍 MediaStep - Imagens já carregadas:', idsCarregados)
        console.log('🔍 MediaStep - Novas imagens encontradas:', novasImagens.map((img: any) => img.id))

        // Verificar se há imagens marcadas para remoção no rascunho
        const imagensRemovidasRascunho = rascunho?.alteracoes?.imagens?.removidas || []
        console.log('🔍 MediaStep - Imagens removidas no rascunho:', imagensRemovidasRascunho)

        // Registrar no rascunho apenas as novas imagens adicionadas
        if (registrarAlteracaoRascunho && novasImagens.length > 0) {
          for (const img of novasImagens) {
            await registrarAlteracaoRascunho('imagem', 'adicionar', img.id.toString())
          }
        }

        const novasImagensFormatadas = novasImagens.map((img: any) => ({
          id: img.id.toString(),
          url: img.url || '',
          nome: `imagem_${img.id}`,
          descricao: '',
          ordem: img.ordem,
          principal: img.principal || img.is_principal,
          dataUpload: img.created_at,
          tamanho: img.tamanho_bytes,
          tipo: img.tipo_mime
        }))

        // Adicionar apenas as novas imagens ao estado existente
        setLoadedImages((prev) => {
          const imagensAtivas = prev.filter((img) => !imagensRemovidasRascunho.includes(img.id))
          const todasImagens = [...imagensAtivas, ...novasImagensFormatadas]
          return todasImagens.sort((a, b) => {
            if (a.ordem !== b.ordem) {
              return a.ordem - b.ordem
            }
            return parseInt(a.id) - parseInt(b.id)
          })
        })
      } else {
        console.error('❌ MediaStep - Erro ao recarregar imagens após upload:', response.status)
      }
    } catch (error) {
      console.error('❌ MediaStep - Erro no upload de imagens:', error)
      alert('Erro ao fazer upload das imagens. Por favor, tente novamente.')
    }
  }

  const handleDocumentUpload = async (files: FileList) => {
    if (!selectedTipoDocumento) {
      alert('Por favor, selecione um tipo de documento primeiro.')
      return
    }

    const tipoDocumento = tiposDocumentos.find(t => t.id === selectedTipoDocumento)
    if (!tipoDocumento) {
      alert('Tipo de documento não encontrado.')
      return
    }

    console.log('🔍 handleDocumentUpload - Arquivos recebidos:', files.length)
    console.log('🔍 handleDocumentUpload - Arquivos detalhados:', Array.from(files).map(f => ({ name: f.name, size: f.size })))

    // Comentado temporariamente para permitir múltiplos documentos do mesmo tipo
    // const jaExisteDocumentoTipo = selectedDocuments.some(doc => doc.tipoDocumentoId === selectedTipoDocumento)
    // if (jaExisteDocumentoTipo) {
    //   alert('Já existe um documento deste tipo. Remova o documento existente antes de adicionar um novo.')
    //   return
    // }

    const newDocuments: UploadedFile[] = []
    let documentosFiltrados = 0

    Array.from(files).forEach((file, index) => {
      console.log(`🔍 handleDocumentUpload - Processando arquivo ${index + 1}:`, {
        name: file.name,
        size: file.size,
        type: file.type,
        isPDF: file.type === 'application/pdf',
        isImage: file.type.startsWith('image/')
      })

      // TEMPORARIAMENTE DESABILITADO: Verificar se o arquivo já não foi adicionado
      // const arquivoJaExiste = selectedDocuments.some(doc => 
      //   doc.file.name === file.name && doc.file.size === file.size
      // )

      // if (arquivoJaExiste) {
      //   console.log('❌ Documento já existe, pulando:', file.name)
      //   documentosFiltrados++
      //   return
      // }

      const id = `doc-${Date.now()}-${index}`
      const preview = URL.createObjectURL(file)

      console.log(`✅ handleDocumentUpload - Adicionando documento ${index + 1}:`, { id, name: file.name, size: file.size })

      newDocuments.push({
        id,
        file,
        preview,
        progress: 0,
        status: 'uploading',
        tipoDocumentoId: selectedTipoDocumento,
        tipoDocumentoDescricao: tipoDocumento.descricao
      })
    })

    console.log('🔍 handleDocumentUpload - Resumo:', {
      arquivosRecebidos: files.length,
      documentosNovos: newDocuments.length,
      documentosFiltrados: documentosFiltrados,
      documentosExistentes: selectedDocuments.length,
      totalFinal: selectedDocuments.length + newDocuments.length
    })

    // LOG CRÍTICO: Detalhes dos novos documentos
    console.log('🔍 handleDocumentUpload - Novos documentos detalhados:', newDocuments.map((doc, index) => ({
      index: index + 1,
      id: doc.id,
      nome: doc.file.name,
      tipo: doc.file.type,
      tamanho: doc.file.size,
      tipoDocumentoId: doc.tipoDocumentoId,
      status: doc.status
    })))

    if (newDocuments.length === 0) {
      alert('Nenhum documento novo para adicionar.')
      return
    }

    setSelectedDocuments(prev => [...prev, ...newDocuments])

    // Limpar o campo de seleção de tipo de documento para o próximo documento
    setSelectedTipoDocumento(null)

    // Upload real dos documentos para o servidor
    for (const document of newDocuments) {
      try {
        console.log('🔍 handleDocumentUpload - Fazendo upload real do documento:', document.id, 'para imóvel:', imovelId)

        if (mode === 'edit' && imovelId) {
          // Modo edição - upload direto para o servidor
          const formData = new FormData()
          formData.append('documento', document.file)
          formData.append('tipo_documento_id', document.tipoDocumentoId!.toString())

          const response = await authFetch(`/api/admin/imoveis/${imovelId}/documentos`, {
            method: 'POST',
            body: formData,
            headers: {}
          })

          if (!response.ok) {
            const errorText = await response.text()
            console.error('❌ handleDocumentUpload - Erro no upload:', errorText)
            throw new Error(errorText)
          }

          const result = await response.json()
          console.log('✅ handleDocumentUpload - Upload realizado com sucesso:', result)

          // Após upload bem-sucedido, recarregar documentos da API
          console.log('🔍 MediaStep - Upload de documento concluído, recarregando documentos da API')
          try {
            const response = await get(`/api/admin/imoveis/${imovelId}/documentos`)
            if (response.ok) {
              const data = await response.json()
              const documentosDoBanco = data.data || []

              // Encontrar apenas os documentos que não estão já carregados
              const idsCarregados = selectedDocuments.map(doc => parseInt(doc.id))
              const novosDocumentos = documentosDoBanco.filter((doc: any) => !idsCarregados.includes(doc.id))

              console.log('🔍 MediaStep - Documentos já carregados:', idsCarregados)
              console.log('🔍 MediaStep - Novos documentos encontrados:', novosDocumentos.map((doc: any) => doc.id))

              // Verificar se há documentos marcados para remoção no rascunho
              const documentosRemovidosRascunho = rascunho?.alteracoes?.documentos?.removidos || []
              console.log('🔍 MediaStep - Documentos removidos no rascunho:', documentosRemovidosRascunho)

              // Registrar no rascunho apenas os novos documentos adicionados
              if (registrarAlteracaoRascunho && novosDocumentos.length > 0) {
                for (const doc of novosDocumentos) {
                  await registrarAlteracaoRascunho('documento', 'adicionar', doc.id.toString())
                }
              }

              const novosDocumentosFormatados = novosDocumentos.map((doc: any) => {
                console.log('🔍 MediaStep - Processando novo documento da API:', {
                  id: doc.id,
                  nome_arquivo: doc.nome_arquivo,
                  tipo_documento_descricao: doc.tipo_documento_descricao
                })

                const nomeArquivo = doc.nome_arquivo || `documento_${doc.id}`
                const file = new File([], nomeArquivo, { type: doc.tipo_mime || 'application/octet-stream' })

                return {
                  id: doc.id.toString(),
                  file: file,
                  preview: nomeArquivo,
                  progress: 100,
                  status: 'completed' as const,
                  tipoDocumentoId: doc.tipo_documento_id,
                  tipoDocumentoDescricao: doc.tipo_documento_descricao
                }
              })

              // Adicionar apenas os novos documentos ao estado existente
              setSelectedDocuments(prev => {
                // Filtrar documentos que foram removidos no rascunho
                const documentosAtivos = prev.filter(doc => !documentosRemovidosRascunho.includes(doc.id))
                const todosDocumentos = [...documentosAtivos, ...novosDocumentosFormatados]

                console.log('🔍 MediaStep - Documentos ativos após filtrar removidos:', documentosAtivos.map((doc: any) => doc.id))
                console.log('🔍 MediaStep - Novos documentos formatados:', novosDocumentosFormatados.map((doc: any) => doc.id))

                return todosDocumentos
              })

              console.log('🔍 MediaStep - Novos documentos adicionados:', novosDocumentosFormatados.length)
            }
          } catch (error) {
            console.error('Erro ao recarregar documentos após upload:', error)
          }
        } else {
          // Modo criação - apenas simular (será processado depois)
          console.log('🔍 handleDocumentUpload - Modo criação: marcando documento como concluído:', document.id)
        }

        setSelectedDocuments(prev => prev.map(doc =>
          doc.id === document.id
            ? { ...doc, status: 'completed' as const, progress: 100 }
            : doc
        ))
      } catch (error) {
        console.error('❌ handleDocumentUpload - Erro no upload do documento:', error)
        console.error('❌ handleDocumentUpload - Detalhes do erro:', {
          documentId: document.id,
          fileName: document.file.name,
          fileSize: document.file.size,
          fileType: document.file.type,
          tipoDocumentoId: document.tipoDocumentoId,
          imovelId: imovelId
        })
        setSelectedDocuments(prev => prev.map(doc =>
          doc.id === document.id
            ? { ...doc, status: 'error' as const, error: error instanceof Error ? error.message : 'Erro no upload' }
            : doc
        ))
      }
    }
  }

  const removeImage = async (id: string) => {
    console.log('🔍 removeImage - ID:', id, 'Mode:', mode, 'ImovelId:', imovelId)

    // Se é uma imagem existente (não temporária)
    if (imovelId && !id.startsWith('temp-')) {
      // Registrar no rascunho se for modo de edição (NÃO excluir do banco ainda)
      if (mode === 'edit' && registrarAlteracaoRascunho) {
        console.log('🔍 removeImage - Registrando remoção no rascunho')
        await registrarAlteracaoRascunho('imagem', 'remover', id)

        // Remover imediatamente da interface para feedback visual
        setLoadedImages(prev => {
          const image = prev.find(img => img.id === id)
          if (image) {
            URL.revokeObjectURL(image.url)
          }
          return prev.filter(img => img.id !== id)
        })
      } else {
        // Modo criação ou sem rascunho - excluir imediatamente
        try {
          const response = await del(`/api/admin/imoveis/${imovelId}/imagens?id=${id}`)
          if (!response.ok) {
            throw new Error('Erro ao excluir imagem')
          }
          console.log('✅ removeImage - Imagem deletada com sucesso')

          // Remover da interface após exclusão no banco
          setLoadedImages(prev => {
            const image = prev.find(img => img.id === id)
            if (image) {
              URL.revokeObjectURL(image.url)
            }
            return prev.filter(img => img.id !== id)
          })
        } catch (error) {
          console.error('❌ removeImage - Erro ao deletar imagem:', error)
        }
      }
    } else {
      // Imagem temporária - remover apenas da interface
      setSelectedImages(prev => {
        const image = prev.find(img => img.id === id)
        if (image) {
          URL.revokeObjectURL(image.preview)
        }
        return prev.filter(img => img.id !== id)
      })
    }

    console.log('✅ removeImage - Imagem removida da interface')
  }

  const removeDocument = async (id: string) => {
    console.log('🔍 removeDocument - ID:', id, 'Tipo:', typeof id, 'imovelId:', imovelId)

    // Se é um documento existente (não temporário)
    if (imovelId && typeof id === 'string' && !id.startsWith('temp-')) {
      // Registrar no rascunho se for modo de edição (NÃO excluir do banco ainda)
      if (mode === 'edit' && registrarAlteracaoRascunho) {
        console.log('🔍 removeDocument - Registrando remoção no rascunho')
        await registrarAlteracaoRascunho('documento', 'remover', id)
      } else {
        // Modo criação ou sem rascunho - excluir imediatamente
        try {
          console.log('🔍 removeDocument - Fazendo chamada para API DELETE:', `/api/admin/imoveis/${imovelId}/documentos/${id}`)

          const response = await del(`/api/admin/imoveis/${imovelId}/documentos/${id}`)

          console.log('🔍 removeDocument - Resposta da API:', response.status, response.statusText)

          if (!response.ok) {
            const errorText = await response.text()
            console.error('❌ removeDocument - Erro ao deletar documento:', errorText)
          } else {
            console.log('✅ removeDocument - Documento deletado com sucesso')
          }
        } catch (error) {
          console.error('❌ removeDocument - Erro ao deletar documento:', error)
        }
      }
    } else {
      console.log('🔍 removeDocument - Documento temporário, removendo apenas da interface')
    }

    // Remover da interface local
    console.log('🔍 removeDocument - Removendo da interface local')
    setSelectedDocuments(prev => {
      const document = prev.find(doc => doc.id === id)
      if (document) {
        URL.revokeObjectURL(document.preview)
      }
      return prev.filter(doc => doc.id !== id)
    })
  }


  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent, type: 'images' | 'documents') => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      if (type === 'images') {
        handleImageUpload(e.dataTransfer.files)
      } else {
        handleDocumentUpload(e.dataTransfer.files)
      }
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handlePrincipalChange = async (imageId: string) => {
    setSelectedPrincipalId(imageId)
    console.log('🔍 MediaStep - Imagem principal alterada para:', imageId)

    // Registrar no rascunho se for modo de edição
    if (mode === 'edit' && registrarImagemPrincipalRascunho) {
      console.log('🔍 MediaStep - Registrando mudança de imagem principal no rascunho')
      await registrarImagemPrincipalRascunho(imageId)
    }
  }

  // Funções para manipular vídeo
  const handleVideoSelect = (videoData: VideoUploadData) => {
    console.log('🔍 MediaStep - Vídeo selecionado:', videoData)
    console.log('🔍 MediaStep - Estado atual selectedVideo:', selectedVideo)
    console.log('🔍 MediaStep - Vídeo existente:', video)

    setSelectedVideo(videoData)
    setVideoRemovido(false)
    console.log('🔍 MediaStep - Novo selectedVideo definido:', videoData)

    // Se estiver em modo de edição, registrar no rascunho (apenas se não for carregamento automático)
    if (mode === 'edit' && !isLoadingVideo) {
      console.log('🔍 MediaStep - Registrando vídeo no rascunho (ação do usuário)')

      // Verificar se é uma substituição: se havia um vídeo original mas foi removido
      const isSubstituicao = rascunho?.alteracoes?.video?.removido === true

      if (isSubstituicao && substituirVideoRascunho) {
        console.log('🔍 MediaStep - Detectada substituição: vídeo foi removido e novo está sendo adicionado')
        substituirVideoRascunho(videoData)
      } else if (video && substituirVideoRascunho) {
        console.log('🔍 MediaStep - Substituindo vídeo existente diretamente')
        substituirVideoRascunho(videoData)
      } else if (registrarVideoAlteracaoRascunho) {
        console.log('🔍 MediaStep - Adicionando novo vídeo')
        registrarVideoAlteracaoRascunho('adicionar', videoData)
      }
    }
  }

  const handleVideoRemove = () => {
    console.log('🔍 MediaStep - Removendo vídeo')
    setSelectedVideo(null)
    setVideo(null)
    setVideoRemovido(true)

    // Se estiver em modo de edição, registrar no rascunho
    if (mode === 'edit' && registrarVideoAlteracaoRascunho) {
      console.log('🔍 MediaStep - Registrando remoção no rascunho')
      registrarVideoAlteracaoRascunho('remover')
    }
  }

  const handleVideoPreview = () => {
    console.log('🔍 MediaStep - Abrindo preview do vídeo')
    setIsVideoModalOpen(true)
  }

  const handleVideoReplace = (videoData: VideoUploadData) => {
    console.log('🔍 MediaStep - Substituindo vídeo com dados:', videoData)
    // Chamar handleVideoSelect que já tem a lógica de substituição
    handleVideoSelect(videoData)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Mídia do Imóvel</h2>
        <p className="text-gray-600">
          Adicione imagens e documentos do imóvel. Você pode fazer upload de até {MAX_IMAGES} imagens.
        </p>
      </div>

      {/* Container 1: Imagens do Imóvel */}
      <div className="bg-white border border-gray-400 rounded-lg p-6 shadow-sm">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Imagens do Imóvel</h3>
            <span className="text-sm text-gray-500">
              {loadedImages.length + selectedImages.filter(img => img.status === 'completed').length}/{MAX_IMAGES} imagens
            </span>
          </div>

          {/* Área de Upload de Imagens */}
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
              }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={(e) => handleDrop(e, 'images')}
          >
            <div className="space-y-4">
              <div className="text-4xl">📸</div>
              <div>
                <p className="text-sm text-gray-600">
                  Arraste e solte imagens aqui ou{' '}
                  <button
                    onClick={() => imageInputRef.current?.click()}
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    clique para selecionar
                  </button>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  PNG, JPG, JPEG até 10MB cada. Máximo {MAX_IMAGES} imagens.
                </p>
              </div>
            </div>

            <input
              ref={imageInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
              className="hidden"
            />
          </div>

          {duplicateImageWarning && (
            <div className="rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
              {duplicateImageWarning}
            </div>
          )}

          {/* Lista de Imagens */}
          {(selectedImages.length > 0 || loadedImages.length > 0) && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {/* Imagens temporárias (apenas no modo criação) */}
              {(() => {
                console.log('🔍 MediaStep - Renderizando selectedImages:', selectedImages.length, 'loadedImages:', loadedImages.length)
                return null
              })()}
              {mode === 'create' && selectedImages.map((image) => (
                <div key={image.id} className="relative group">
                  <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                    <img
                      src={image.preview || image.url}
                      alt={`Imagem ${image.id}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        console.log('🔍 MediaStep - Erro ao carregar imagem:', image.id)
                        e.currentTarget.src = 'https://via.placeholder.com/300x200?text=Imagem+Não+Encontrada'
                      }}
                    />

                    {/* Indicador de imagem principal */}
                    {image.principal && (
                      <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                        Principal
                      </div>
                    )}
                  </div>

                  {/* Botão de remover */}
                  <button
                    onClick={() => removeImage(image.id)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>

                  {/* Tipo do arquivo */}
                  <p className="text-xs text-gray-600 mt-1 truncate">
                    {image.tipo}
                  </p>
                </div>
              ))}

              {/* Imagens carregadas dos dados do imóvel */}
              {(() => {
                console.log('🔍 MediaStep - Renderizando loadedImages:', loadedImages.length, loadedImages.map(img => ({ id: img.id, url: img.url?.substring(0, 50) + '...' })))
                return null
              })()}
              {loadedImages.map((image) => (
                <div key={image.id} className="relative group">
                  <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                    <img
                      src={image.url}
                      alt={`Imagem ${image.id}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        console.log('🔍 MediaStep - Erro ao carregar imagem:', image.id)
                        e.currentTarget.src = 'https://via.placeholder.com/300x200?text=Imagem+Não+Encontrada'
                      }}
                    />

                    {/* Indicador de imagem principal */}
                    {image.principal && (
                      <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                        Principal
                      </div>
                    )}
                  </div>

                  {/* Botão de remover */}
                  <button
                    onClick={() => removeImage(image.id)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>

                  {/* Tipo do arquivo */}
                  <p className="text-xs text-gray-600 mt-1 truncate">
                    {image.tipo}
                  </p>
                </div>
              ))}

              {/* Imagens temporárias (modo edição - novas uploads) */}
              {mode === 'edit' && selectedImages.map((image) => (
                <div key={image.id} className="relative group">
                  <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                    <img
                      src={image.preview}
                      alt={image.file.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        console.log('🔍 MediaStep - Erro ao carregar imagem:', image.preview)
                        e.currentTarget.src = 'https://via.placeholder.com/300x200?text=Imagem+Não+Encontrada'
                      }}
                    />
                  </div>

                  {/* Botão de remover */}
                  <button
                    onClick={() => removeImage(image.id)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>

                  {/* Nome do arquivo */}
                  <p className="text-xs text-gray-600 mt-1 truncate">
                    {image.file.name}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Seletor de Imagem Principal */}
          <ImagePrincipalSelector
            loadedImages={loadedImages}
            selectedImages={selectedImages}
            selectedPrincipalId={selectedPrincipalId}
            onPrincipalChange={handlePrincipalChange}
            mode={mode}
          />
        </div>
      </div>

      {/* Container 2: Vídeo do Imóvel */}
      <div className="bg-white border border-gray-400 rounded-lg p-6 shadow-sm">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Vídeo do Imóvel</h3>
            <span className="text-sm text-gray-500">
              {video || selectedVideo || (rascunho?.alteracoes?.video?.dados) ? '1 vídeo' : '0 vídeos'}
            </span>
          </div>

          {/* Componente de Upload/Preview de Vídeo */}
          {(() => {
            // Verificar se há vídeo no rascunho
            const videoFromRascunho = rascunho?.alteracoes?.video?.dados

            const hasVideo = (video && video.id && video.id > 0) || selectedVideo || videoFromRascunho

            console.log('🔍 MediaStep - hasVideo calculado:', {
              videoExists: !!video,
              videoId: video?.id,
              videoIdGreaterThan0: (video?.id || 0) > 0,
              selectedVideoExists: !!selectedVideo,
              videoFromRascunhoExists: !!videoFromRascunho,
              hasVideo: hasVideo
            })
            const videoToPass = selectedVideo ? {
              id: 0, // ID temporário para vídeos não salvos
              imovel_id: imovelId || 0,
              video: Buffer.from(''), // Buffer vazio para vídeos não salvos
              nome_arquivo: selectedVideo.nomeArquivo,
              tipo_mime: selectedVideo.tipoMime,
              tamanho_bytes: selectedVideo.tamanhoBytes,
              duracao_segundos: selectedVideo.duracaoSegundos,
              resolucao: selectedVideo.resolucao,
              formato: selectedVideo.formato,
              ativo: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            } : video

            console.log('🔍 MediaStep - Renderizando vídeo:', {
              hasVideo,
              video,
              selectedVideo,
              videoFromRascunho,
              videoToPass,
              rascunhoVideo: rascunho?.alteracoes?.video
            })

            console.log('🔍 MediaStep - Detalhes do selectedVideo:', {
              nomeArquivo: selectedVideo?.nomeArquivo,
              tipoMime: selectedVideo?.tipoMime,
              tamanhoBytes: selectedVideo?.tamanhoBytes,
              keys: selectedVideo ? Object.keys(selectedVideo) : 'no selectedVideo'
            })

            console.log('🔍 MediaStep - Detalhes do videoToPass:', {
              nome_arquivo: videoToPass?.nome_arquivo,
              tipo_mime: videoToPass?.tipo_mime,
              tamanho_bytes: videoToPass?.tamanho_bytes,
              keys: videoToPass ? Object.keys(videoToPass) : 'no videoToPass'
            })

            console.log('🔍 MediaStep - Decisão de renderização:', {
              hasVideo,
              willRenderVideoPreview: hasVideo,
              willRenderVideoUpload: !hasVideo
            })

            return hasVideo ? (
              <VideoPreview
                video={videoToPass}
                onReplace={handleVideoReplace}
                onRemove={handleVideoRemove}
                onPreview={handleVideoPreview}
                mode={mode}
                rascunho={rascunho}
              />
            ) : (
              <VideoUpload
                onVideoSelect={handleVideoSelect}
                onVideoRemove={handleVideoRemove}
                mode={mode}
              />
            )
          })()}
        </div>
      </div>

      {/* Container 3: Documentos do Imóvel */}
      <div className="bg-white border border-gray-400 rounded-lg p-6 shadow-sm">
        {/* Upload de Documentos */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Documentos do Imóvel</h3>
            <span className="text-sm text-gray-500">
              {mode === 'create'
                ? selectedDocuments.length
                : selectedDocuments.length
              } documentos
            </span>
          </div>

          {/* Seletor de Tipo de Documento */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Tipo de Documento
            </label>
            <select
              value={selectedTipoDocumento || ''}
              onChange={(e) => setSelectedTipoDocumento(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione um tipo de documento</option>
              {tiposDocumentos.map((tipo) => (
                <option key={tipo.id} value={tipo.id}>
                  {tipo.descricao}
                </option>
              ))}
            </select>
          </div>

          {/* Área de Upload de Documentos */}
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${dragActive && selectedTipoDocumento ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
              } ${!selectedTipoDocumento ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''}`}
            onDragEnter={selectedTipoDocumento ? handleDrag : undefined}
            onDragLeave={selectedTipoDocumento ? handleDrag : undefined}
            onDragOver={selectedTipoDocumento ? handleDrag : undefined}
            onDrop={selectedTipoDocumento ? (e) => handleDrop(e, 'documents') : undefined}
          >
            <div className="space-y-4">
              <div className="text-4xl">📄</div>
              <div>
                {!selectedTipoDocumento ? (
                  <p className="text-sm text-gray-500">
                    Selecione um tipo de documento acima para fazer upload
                  </p>
                ) : (
                  <>
                    <p className="text-sm text-gray-600">
                      Arraste e solte documentos aqui ou{' '}
                      <button
                        onClick={() => selectedTipoDocumento && documentInputRef.current?.click()}
                        className={`${selectedTipoDocumento ? 'text-blue-600 hover:text-blue-800 underline' : 'text-gray-400 cursor-not-allowed'}`}
                        disabled={!selectedTipoDocumento}
                      >
                        clique para selecionar
                      </button>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, GIF até 50MB cada.
                    </p>
                  </>
                )}
              </div>
            </div>

            <input
              ref={documentInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.bmp,.tiff,.webp"
              onChange={(e) => e.target.files && selectedTipoDocumento && handleDocumentUpload(e.target.files)}
              className="hidden"
              disabled={!selectedTipoDocumento}
            />
          </div>

          {/* Lista de Documentos */}
          {selectedDocuments.length > 0 && (
            <div className="space-y-3">
              {(() => {
                console.log('🔍 ANTES DA RENDERIZAÇÃO - selectedDocuments:', selectedDocuments)
                return null
              })()}
              {selectedDocuments.map((document) => {
                console.log('🔍 Renderizando documento:', {
                  id: document.id,
                  tipoDocumentoDescricao: document.tipoDocumentoDescricao,
                  tipoDocumentoId: document.tipoDocumentoId,
                  preview: document.preview,
                  file: document.file.name,
                  status: document.status,
                  documentCompleto: document
                })

                // Verificar se tipoDocumentoDescricao está presente na renderização
                if (!document.tipoDocumentoDescricao) {
                  console.error('❌ MediaStep - tipoDocumentoDescricao está ausente na renderização para documento:', document.id)
                }
                return (
                  <div key={document.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">
                        {document.file.type.includes('pdf') ? '📄' :
                          document.file.type.includes('word') ? '📝' :
                            document.file.type.includes('excel') ? '📊' :
                              document.file.type.includes('image') ? '🖼️' : '📎'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {document.tipoDocumentoDescricao || 'Documento'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {document.preview && `${document.preview} • `}
                          {formatFileSize(document.file.size)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {document.status === 'uploading' && (
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          <span className="text-xs text-gray-500">{document.progress}%</span>
                        </div>
                      )}

                      {document.status === 'error' && (
                        <span className="text-xs text-red-500">Erro</span>
                      )}

                      {document.status === 'completed' && (
                        <span className="text-xs text-green-500">✓</span>
                      )}

                      <button
                        onClick={() => removeDocument(document.id)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Debug: Mostrar documentos carregados */}
          {mode === 'edit' && selectedDocuments.length === 0 && data.documentos && data.documentos.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Debug:</strong> {data.documentos.length} documento(s) encontrado(s) mas não carregado(s) na interface.
              </p>
              <details className="mt-2">
                <summary className="text-xs text-yellow-700 cursor-pointer">Ver dados dos documentos</summary>
                <pre className="text-xs text-yellow-700 mt-2 bg-yellow-100 p-2 rounded overflow-auto">
                  {JSON.stringify(data.documentos, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </div>
      </div>

      {/* Tipos de Documentos Disponíveis */}
      {tiposDocumentos.length > 0 && (
        <div className="bg-blue-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">
            Tipos de Documentos Disponíveis
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {tiposDocumentos.map((tipo) => (
              <div key={tipo.id} className="flex items-center space-x-2">
                <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-800">
                  Opcional
                </span>
                <span className="text-sm text-blue-800">{tipo.descricao}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resumo */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Resumo da Mídia</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Imagens:</span>
            <span className="ml-2 font-medium">
              {loadedImages.length + selectedImages.filter(img => img.status === 'completed').length} de {loadedImages.length + selectedImages.length}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Documentos:</span>
            <span className="ml-2 font-medium">
              {selectedDocuments.filter(doc => doc.status === 'completed').length} de {selectedDocuments.length}
            </span>
          </div>
        </div>
      </div>

      {/* Modal de Preview do Vídeo */}
      <VideoModal
        video={video}
        selectedVideo={selectedVideo}
        rascunho={rascunho}
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
      />
    </div>
  )
}

export default MediaStep





