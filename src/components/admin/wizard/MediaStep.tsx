'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Imovel } from '@/lib/types/admin'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import ImagePrincipalSelector from './ImagePrincipalSelector'
import VideoUpload from './VideoUpload'
import VideoPreview from './VideoPreview'
import VideoModal from './VideoModal'
import { ImovelVideo, VideoUploadData } from '@/lib/types/video'
import { EyeIcon, TrashIcon, ArrowsUpDownIcon } from '@heroicons/react/24/outline'
import { UPLOAD_CONFIG } from '@/lib/config/constants'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  TouchSensor,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

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

// Componente para cada item da lista ordenável
function SortableImageItem({ id, image, onRemove, isPrincipal, mode }: {
  id: string;
  image: any;
  onRemove: (id: string) => void;
  isPrincipal: boolean;
  mode: 'create' | 'edit';
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  };

  const imageUrl = mode === 'create' ? (image.preview || image.url) : image.url;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group ${isDragging ? 'shadow-2xl' : 'shadow-sm'}`}
    >
      <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
        <img
          src={imageUrl}
          alt={`Imagem ${id}`}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.src = 'https://via.placeholder.com/300x200?text=Erro'
          }}
        />

        {/* Alça de arraste (Drag Handle) */}
        <div
          {...attributes}
          {...listeners}
          className="absolute inset-0 cursor-move flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all"
        >
          <ArrowsUpDownIcon className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
        </div>

        {/* Indicador de imagem principal */}
        {isPrincipal && (
          <div className="absolute top-2 left-2 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm z-10">
            CAPA
          </div>
        )}

        {/* Botão de remover */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(id);
          }}
          className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 shadow-md z-20 group-hover:scale-110 transition-transform"
        >
          ×
        </button>
      </div>

      {/* Informações da imagem */}
      <div className="mt-1 flex flex-col">
        <span className="text-[10px] text-gray-500 truncate" title={image.nome || image.file?.name}>
          {image.nome || image.file?.name || `Foto ${id}`}
        </span>
      </div>
    </div>
  );
}

function MediaStep({ data, onUpdate, mode, imovelId, registrarAlteracaoRascunho, registrarVideoAlteracaoRascunho, substituirVideoRascunho, registrarImagemPrincipalRascunho, rascunho }: MediaStepProps) {
  const { fetch: authFetch, get, post, delete: del } = useAuthenticatedFetch()
  const [tiposDocumentos, setTiposDocumentos] = useState<TipoDocumento[]>([])
  const [selectedImages, setSelectedImages] = useState<UploadedFile[]>([])
  const [deletedImageIds, setDeletedImageIds] = useState<Set<string>>(new Set()) // IDs de imagens excluídas nesta sessão
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

  // Configuração dos sensores para DND
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Evita disparar o arraste ao apenas clicar para remover
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      if (mode === 'edit') {
        setLoadedImages((items) => {
          const oldIndex = items.findIndex((i) => i.id === active.id);
          const newIndex = items.findIndex((i) => i.id === over.id);
          const newOrderedItems = arrayMove(items, oldIndex, newIndex);

          // Sincronizar com o backend — envia array de { id, ordem } conforme esperado por updateImovelImagensOrdem
          const imagensComOrdem = newOrderedItems.map((img, index) => ({
            id: parseInt(img.id),
            ordem: index
          }));
          authFetch(`/api/admin/imoveis/${imovelId}/imagens`, {
            method: 'PUT',
            body: JSON.stringify({ imagens: imagensComOrdem })
          }).then(res => {
            if (res.ok) console.log('✅ Ordem sincronizada com sucesso');
            else console.error('❌ Erro ao sincronizar ordem das imagens');
          });

          return newOrderedItems;
        });
      } else {
        setSelectedImages((items) => {
          const oldIndex = items.findIndex((i) => i.id === active.id);
          const newIndex = items.findIndex((i) => i.id === over.id);
          return arrayMove(items, oldIndex, newIndex);
        });
      }
    }
  };


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
      const imagensFormatadas = data.imagens
        .filter((img: any) => !deletedImageIds.has(img.id?.toString())) // ignorar já excluídas
        .map((img: any) => {
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
  }, [mode, data.imagens, deletedImageIds]) // re-executa se deletedImageIds mudar

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
            file: img.file, // Preservar o arquivo original
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

      // Combinar imagens carregadas + novas imagens e marcar a principal
      // Se selectedPrincipalId está definido, ele tem precedência absoluta.
      // Se não está (estado inicial ou após remoção), preservar o campo 'principal' original.
      const hasPrincipalSelection = selectedPrincipalId && selectedPrincipalId !== ''
      const imagensData = [...loadedImages, ...novasImagensData].map(img => ({
        ...img,
        principal: hasPrincipalSelection
          ? (img.id === selectedPrincipalId || img.id.toString() === selectedPrincipalId?.toString())
          : (img.principal === true) // Preservar valor original se não há seleção explícita
      }))
      console.log('🔍 MediaStep - updateData - imagensData FINAL com principal marcada:', {
        total: imagensData.length,
        principalId: selectedPrincipalId,
        hasPrincipalSelection,
        hasPrincipal: imagensData.some(img => img.principal)
      })

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
            file: doc.file, // Preservar o arquivo original
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

  /**
   * Função para comprimir imagem no cliente (Browser)
   * Reduz largura/altura para no máximo 1920px e qualidade para 0.85
   * Isso reduz drasticamente o tempo de upload sem perda visível de qualidade.
   */
  const compressImage = async (file: File): Promise<File> => {
    // Se o arquivo for muito pequeno (menos de 300KB), não precisa comprimir
    if (file.size < 300 * 1024) return file;

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_SIZE = 1920; // Limite Full HD

          // Calcular novas dimensões mantendo o aspect ratio
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            resolve(file); // Fallback caso canvas falhe
            return;
          }

          // Desenhar imagem no canvas (isso já remove metadados pesados e aplica redimensionamento)
          ctx.drawImage(img, 0, 0, width, height);

          // Converter canvas para Blob (formato original ou JPEG por padrão para compressão)
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                resolve(file);
                return;
              }
              // Criar novo arquivo a partir do blob comprimido
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg', // Sempre JPEG para melhor compressão web
                lastModified: Date.now(),
              });

              console.log(`📊 Compressão: ${file.name} | Original: ${(file.size / 1024 / 1024).toFixed(2)}MB | Comprimido: ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);
              resolve(compressedFile);
            },
            'image/jpeg',
            0.85 // Qualidade profissional para web (quase imperceptível perda de detalhe)
          );
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

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

    // Detectar duplicatas por TAMANHO DE ARQUIVO para imagens já gravadas no banco
    // (seus nomes são gerados pelo sistema como 'imagem_123', não o nome original)
    const existingSizeSignatures = new Set<number>()
    loadedImages.forEach((img) => {
      if (img.tamanho && img.tamanho > 0) {
        existingSizeSignatures.add(img.tamanho)
      }
      addSignature(img.nome, img.tamanho)
    })

    // Para imagens já selecionadas nesta sessão, comparar por nome (nome original preservado)
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

      // Processar e comprimir imagens em paralelo
      const processedFiles = await Promise.all(
        Array.from(files).map(async (f) => {
          if (!f.type.startsWith('image/')) return f;
          try {
            return await compressImage(f);
          } catch (e) {
            console.error('Falha ao comprimir imagem:', f.name, e);
            return f; // Se falhar, usa original
          }
        })
      );

      processedFiles.forEach((file, index) => {
        if (!(file instanceof File) || !file.type.startsWith('image/')) {
          return
        }

        // Validação de tamanho com base no arquivo JÁ COMPRIMIDO
        if (file.size > UPLOAD_CONFIG.MAX_FILE_SIZE) {
          alert(`A imagem "${file.name}" é muito grande (${(file.size / 1024 / 1024).toFixed(2)} MB) após compressão. O limite máximo é 10MB.`)
          return
        }

        const signatureExact = makeSignature(file.name, file.size)
        const signatureAnyKey = anySignature(file.name)

        // Verificar duplicata por nome (sessão atual) OU por tamanho (imagens do banco)
        const isDuplicateByName = existingSignatures.has(signatureExact) || existingSignatures.has(signatureAnyKey)
        const isDuplicateBySize = existingSizeSignatures.has(file.size)

        if (isDuplicateByName || isDuplicateBySize) {
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
          `As imagens ${uniqueNames.join(', ')} já existem no imóvel (mesma imagem já cadastrada) e foram ignoradas.`
        )
      }
      if (limitReached) {
        messages.push(`O limite máximo de ${MAX_IMAGES} imagens foi atingido.`)
      }
      setDuplicateImageWarning(messages.length > 0 ? messages.join(' ') : null)
      return
    }

    // Modo edição: verificar duplicatas ANTES da compressão (usando tamanho original do disco)
    // O banco armazena o tamanho ANTES da compressão, então a comparação deve ser com o original
    const originalFilesForUpload: File[] = []

    Array.from(files).forEach((file) => {
      if (!(file instanceof File) || !file.type.startsWith('image/')) {
        return
      }

      const signatureExact = makeSignature(file.name, file.size)
      const signatureAnyKey = anySignature(file.name)

      // Verificar duplicata por nome (sessão atual) OU por tamanho original (imagens do banco)
      const isDuplicateByName = existingSignatures.has(signatureExact) || existingSignatures.has(signatureAnyKey)
      const isDuplicateBySize = existingSizeSignatures.has(file.size)

      if (isDuplicateByName || isDuplicateBySize) {
        duplicateNames.push(file.name)
        return
      }

      if (currentImageCount >= MAX_IMAGES) {
        limitReached = true
        return
      }

      currentImageCount += 1
      addSignature(file.name, file.size)
      originalFilesForUpload.push(file)
    })

    const messages: string[] = []
    if (duplicateNames.length > 0) {
      const uniqueNames = Array.from(new Set(duplicateNames))
      messages.push(
        `As imagens ${uniqueNames.join(', ')} já existem no imóvel (mesma imagem já cadastrada) e foram ignoradas.`
      )
    }
    if (limitReached) {
      messages.push(`O limite máximo de ${MAX_IMAGES} imagens foi atingido.`)
    }
    setDuplicateImageWarning(messages.length > 0 ? messages.join(' ') : null)

    if (originalFilesForUpload.length === 0) {
      return
    }

    // Comprimir apenas os arquivos que passaram no filtro de duplicatas
    const validFiles = await Promise.all(
      originalFilesForUpload.map(async (f) => {
        if (!f.type.startsWith('image/')) return f
        try {
          return await compressImage(f)
        } catch (e) {
          console.error('Falha ao comprimir imagem:', f.name, e)
          return f
        }
      })
    )

    // Filtrar arquivos muito grandes após compressão
    const validFilesFiltered = validFiles.filter((file): file is File => {
      if (!(file instanceof File)) return false
      if (file.size > UPLOAD_CONFIG.MAX_FILE_SIZE) {
        alert(`A imagem "${file.name}" é muito grande após compressão. O limite máximo é 10MB.`)
        return false
      }
      return true
    })

    if (validFilesFiltered.length === 0) {
      return
    }


    // Modo edição - Upload SEQUENCIAL para garantir ordem e evitar Payload Too Large
    try {
      console.log(`🚀 MediaStep - Iniciando upload sequencial de ${validFilesFiltered.length} imagens...`)

      for (let i = 0; i < validFilesFiltered.length; i++) {
        const file = validFilesFiltered[i]
        const formData = new FormData()
        formData.append('images', file)

        console.log(`📸 Enviando imagem ${i + 1}/${validFilesFiltered.length}: ${file.name}`)
        const uploadResponse = await authFetch(`/api/admin/imoveis/${imovelId}/imagens`, {
          method: 'POST',
          body: formData
        })

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json()
          console.error(`❌ Erro no upload da imagem ${i + 1}:`, errorData)
          // Opcional: alert(`Erro na imagem ${file.name}: ${errorData.error}`)
          // Continuamos com as próximas imagens
          continue
        }

        const uploadResult = await uploadResponse.json()
        console.log(`✅ Imagem ${i + 1} enviada com sucesso`)

        // Verificar se houve duplicata no backend
        const duplicata = uploadResult.data?.some((img: any) => img.duplicata === true)
        if (duplicata) {
          console.log(`⚠️ Imagem ${i + 1} identificada como duplicata pelo backend`)
        }
      }

      console.log('✅ MediaStep - Todos os uploads individuais concluídos')

      // Após TODOS os uploads individuais, recarregar TODAS as imagens da API de uma vez
      console.log('🔍 MediaStep - Recarregando lista completa de imagens da API')
      const imagesResponse = await get(`/api/admin/imoveis/${imovelId}/imagens`)
      if (imagesResponse.ok) {
        const data = await imagesResponse.json()
        const imagensDoBanco = data.data || []

        // Identificar IDs já presentes no estado para saber o que é novo
        const idsCarregados = new Set(loadedImages.map((img) => parseInt(img.id)))
        const novasImagens = imagensDoBanco.filter((img: any) =>
          !idsCarregados.has(img.id) && !deletedImageIds.has(img.id.toString())
        )

        // Registrar no rascunho apenas as novas imagens
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

        // Atualizar estado com as novas imagens, mantendo as antigas e re-ordenando
        setLoadedImages((prev) => {
          const imagensRemovidasRascunho = rascunho?.alteracoes?.imagens?.removidas || []
          const imagensAtivas = prev.filter(
            (img) => !imagensRemovidasRascunho.includes(img.id) && !deletedImageIds.has(img.id)
          )

          return [...imagensAtivas, ...novasImagensFormatadas].sort((a, b) => {
            if (a.ordem !== b.ordem) return a.ordem - b.ordem
            return parseInt(a.id) - parseInt(b.id)
          })
        })
      } else {
        console.error('❌ MediaStep - Erro ao recarregar imagens após upload:', imagesResponse.status)
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

      // Validação de tamanho (10MB)
      if (file.size > UPLOAD_CONFIG.MAX_FILE_SIZE) {
        alert(`O documento "${file.name}" é muito grande (${(file.size / 1024 / 1024).toFixed(2)} MB). O limite máximo é 10MB.`)
        return
      }

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

    // Após todos os uploads de documentos, recarregar a lista da API (Modo Edição)
    if (mode === 'edit' && imovelId && newDocuments.length > 0) {
      console.log('🔍 MediaStep - Todos os documentos enviados, recarregando da API...')
      try {
        const response = await get(`/api/admin/imoveis/${imovelId}/documentos`)
        if (response.ok) {
          const data = await response.json()
          const documentosDoBanco = data.data || []

          const idsCarregados = new Set(selectedDocuments.map(doc => parseInt(doc.id)))
          const novosDocumentos = documentosDoBanco.filter((doc: any) => !idsCarregados.has(doc.id))

          if (registrarAlteracaoRascunho && novosDocumentos.length > 0) {
            for (const doc of novosDocumentos) {
              await registrarAlteracaoRascunho('documento', 'adicionar', doc.id.toString())
            }
          }

          const novosDocumentosFormatados = novosDocumentos.map((doc: any) => {
            const nomeArquivo = doc.nome_arquivo || `documento_${doc.id}`
            const file = new File([], nomeArquivo, { type: doc.tipo_mime || 'application/octet-stream' })

            return {
              id: doc.id.toString(),
              file: file,
              preview: nomeArquivo,
              progress: 100,
              status: 'completed' as const,
              tipoDocumentoId: doc.id_tipo_documento,
              tipoDocumentoDescricao: doc.tipo_documento_descricao
            }
          })

          setSelectedDocuments(prev => {
            const documentosRemovidosRascunho = rascunho?.alteracoes?.documentos?.removidas || []
            const documentosAtivas = prev.filter(doc => !documentosRemovidosRascunho.includes(doc.id))
            return [...documentosAtivas, ...novosDocumentosFormatados]
          })
        }
      } catch (error) {
        console.error('Erro ao recarregar documentos:', error)
      }
    }
  }

  const removeImage = async (id: string) => {
    console.log('🔍 removeImage - ID:', id, 'Mode:', mode, 'ImovelId:', imovelId)

    // Adicionar ao Set de exclusões da sessão IMEDIATAMENTE (antes de qualquer await)
    setDeletedImageIds(prev => new Set([...Array.from(prev), id]))

    // Se a imagem é a principal atual, resetar seleção
    if (selectedPrincipalId === id) {
      setSelectedPrincipalId('')
    }

    // Se é uma imagem existente (não temporária)
    if (imovelId && !id.startsWith('temp-')) {
      // Registrar no rascunho se for modo de edição (NÃO excluir do banco ainda)
      if (mode === 'edit' && registrarAlteracaoRascunho) {
        console.log('🔍 removeImage - Registrando remoção no rascunho')
        await registrarAlteracaoRascunho('imagem', 'remover', id)

        // Remover imediatamente da interface para feedback visual
        setLoadedImages(prev => prev.filter(img => img.id !== id))
      } else {
        // Modo criação ou sem rascunho - excluir imediatamente
        try {
          const response = await del(`/api/admin/imoveis/${imovelId}/imagens?id=${id}`)
          if (!response.ok) {
            throw new Error('Erro ao excluir imagem')
          }
          console.log('✅ removeImage - Imagem deletada com sucesso')

          // Remover da interface após exclusão no banco
          setLoadedImages(prev => prev.filter(img => img.id !== id))
        } catch (error) {
          console.error('❌ removeImage - Erro ao deletar imagem:', error)
          // Reverter a exclusão do Set em caso de erro
          setDeletedImageIds(prev => {
            const next = new Set(prev)
            next.delete(id)
            return next
          })
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

          {/* Lista de Imagens com Drag and Drop */}
          {(selectedImages.length > 0 || loadedImages.length > 0) && (
            <div className="space-y-2">
              <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded border border-blue-100 flex items-center gap-2">
                <ArrowsUpDownIcon className="w-4 h-4" />
                Dica premium: Arraste as fotos para definir a ordem de exibição no site.
              </p>

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 py-2">
                  <SortableContext
                    items={mode === 'edit' ? loadedImages.map(img => img.id) : selectedImages.map(img => img.id)}
                    strategy={rectSortingStrategy}
                  >
                    {mode === 'edit' ? (
                      loadedImages.map((image) => (
                        <SortableImageItem
                          key={image.id}
                          id={image.id}
                          image={image}
                          onRemove={removeImage}
                          isPrincipal={image.principal}
                          mode="edit"
                        />
                      ))
                    ) : (
                      selectedImages.map((image) => (
                        <SortableImageItem
                          key={image.id}
                          id={image.id}
                          image={image}
                          onRemove={removeImage}
                          isPrincipal={image.principal}
                          mode="create"
                        />
                      ))
                    )}
                  </SortableContext>
                </div>
              </DndContext>
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

      {/* Observações Internas */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <span className="bg-blue-100 text-blue-600 p-2 rounded-lg mr-3">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </span>
          Observações Internas
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Espaço destinado para anotações internas sobre o imóvel. Este campo não será exibido no site público.
        </p>
        <textarea
          value={data.observacoes || ''}
          onChange={(e) => onUpdate({ observacoes: e.target.value })}
          rows={5}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
          placeholder="Digite aqui observações relevantes sobre o imóvel (ex: chaves com vizinho, urgência na venda, etc...)"
        />
      </div>

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





