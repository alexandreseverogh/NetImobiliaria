/* eslint-disable */
'use client'

import { useState, useEffect, useRef } from 'react'
import { Imovel } from '@/lib/types/admin'
import { useImageUpload } from '@/hooks/useImageUpload'
import ImagePrincipalSelector from './ImagePrincipalSelector'
import VideoUpload from './VideoUpload'
import VideoPreview from './VideoPreview'
import VideoModal from './VideoModal'
import { ImovelVideo, VideoUploadData } from '@/lib/types/video'

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
  registrarImagemPrincipalRascunho?: (imageId: string) => Promise<void>
  rascunho?: any // Dados do rascunho para verificar alteraÃ§Ãµes pendentes
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

export default function MediaStep({ data, onUpdate, mode, imovelId, registrarAlteracaoRascunho, registrarVideoAlteracaoRascunho, registrarImagemPrincipalRascunho, rascunho }: MediaStepProps) {
  const [tiposDocumentos, setTiposDocumentos] = useState<TipoDocumento[]>([])
  const [selectedImages, setSelectedImages] = useState<UploadedFile[]>([])
  const [video, setVideo] = useState<ImovelVideo | null>(null)
  const [selectedVideo, setSelectedVideo] = useState<VideoUploadData | null>(null)
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false)
  const [selectedDocuments, setSelectedDocuments] = useState<UploadedFile[]>([])
  const [loadedImages, setLoadedImages] = useState<LoadedImage[]>([])
  const [loading, setLoading] = useState(true)
  const [dragActive, setDragActive] = useState(false)
  const [selectedTipoDocumento, setSelectedTipoDocumento] = useState<number | null>(null)
  const [selectedPrincipalId, setSelectedPrincipalId] = useState<string>('')
  
  
  console.log('ðŸ” MediaStep - Props recebidas:', { mode, imovelId, hasData: !!data, dataKeys: Object.keys(data || {}) })
  console.log('ðŸ” MediaStep - Dados de imagens:', data?.imagens)
  console.log('ðŸ” MediaStep - Dados de documentos:', data?.documentos)
  console.log('ðŸ” MediaStep - Dados completos recebidos:', data)
  
  // Hook de upload de imagens
  const {
    imagens: uploadedImages,
    isLoading: imagesLoading,
    error: imagesError,
    uploadImages,
    deleteImage,
    loadImages,
    clearError
  } = useImageUpload()
  
  const imageInputRef = useRef<HTMLInputElement>(null)
  const documentInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadTiposDocumentos()
  }, [])

  // Scroll para o topo quando o componente Ã© montado
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  // Definir imagem principal quando imagens sÃ£o carregadas
  useEffect(() => {
    if (loadedImages.length > 0) {
      const principalImage = loadedImages.find(img => img.principal)
      if (principalImage) {
        setSelectedPrincipalId(principalImage.id)
      } else if (loadedImages.length === 1) {
        // Se hÃ¡ apenas uma imagem, definir como principal automaticamente
        setSelectedPrincipalId(loadedImages[0].id)
      }
    }
  }, [loadedImages])

  // Carregar imagens existentes no modo de ediÃ§Ã£o
  useEffect(() => {
    if (mode === 'edit' && data.imagens && data.imagens.length > 0) {
      console.log('ðŸ” MediaStep - Carregando imagens dos dados recebidos:', data.imagens.length)
      
      // Converter imagens dos dados para o formato esperado pelo hook
      const imagensFormatadas = data.imagens.map((img: any) => {
        console.log('ðŸ” MediaStep - Processando imagem:', {
          id: img.id,
          tipo_mime: img.tipo_mime,
          tem_imagem: !!img.imagem,
          tipo_imagem: typeof img.imagem,
          tamanho_imagem: img.imagem ? img.imagem.length : 0
        })
        
        // Converter Buffer para base64
        let base64String = ''
        if (img.imagem && Buffer.isBuffer(img.imagem)) {
          base64String = img.imagem.toString('base64')
        } else if (img.imagem && typeof img.imagem === 'object' && img.imagem.data) {
          // Se for um objeto com propriedade data (formato PostgreSQL)
          base64String = Buffer.from(img.imagem.data).toString('base64')
        }
        
        return {
          id: img.id.toString(),
          url: `data:${img.tipo_mime};base64,${base64String}`,
          nome: `imagem_${img.id}`,
          descricao: '',
          ordem: img.ordem,
          principal: img.principal,
          dataUpload: img.created_at,
          tamanho: img.tamanho_bytes,
          tipo: img.tipo_mime
        }
      })
      
      console.log('ðŸ” MediaStep - Imagens formatadas:', imagensFormatadas)
      
      // Atualizar o estado das imagens carregadas
      setLoadedImages(imagensFormatadas)
    }
  }, [mode, imovelId, data.imagens, loadImages])

  // Carregar documentos existentes no modo de ediÃ§Ã£o
  useEffect(() => {
    console.log('ðŸ” MediaStep - useEffect documentos:', { 
      mode, 
      hasDocumentos: !!data.documentos, 
      documentosLength: data.documentos?.length,
      imovelId,
      dataKeys: Object.keys(data || {}),
      dataDocumentos: data?.documentos
    })
    
    if (mode === 'edit' && data.documentos && data.documentos.length > 0) {
      console.log('ðŸ” MediaStep - Carregando documentos existentes:', data.documentos)
      console.log('ðŸ” MediaStep - Estrutura do primeiro documento:', data.documentos[0])
      
      const documentosExistentes = data.documentos.map((doc: any, index: number) => {
        console.log('ðŸ” MediaStep - Processando documento:', {
          id: doc.id,
          nome_arquivo: doc.nome_arquivo,
          tipo_mime: doc.tipo_mime,
          id_tipo_documento: doc.id_tipo_documento,
          tipo_documento_descricao: doc.tipo_documento_descricao,
          docCompleto: doc
        })
        
        // Criar um arquivo vazio para representar o documento existente
        const nomeArquivo = doc.nome_arquivo || `documento_${doc.id}`
        const file = new File([], nomeArquivo, { type: doc.tipo_mime || 'application/octet-stream' })
        
        const documentoFormatado = {
          id: doc.id.toString(),
          file: file,
          preview: nomeArquivo,
          progress: 100,
          status: 'completed' as const,
          tipoDocumentoId: doc.id_tipo_documento,
          tipoDocumentoDescricao: doc.tipo_documento_descricao
        }
        
        console.log('ðŸ” MediaStep - Documento formatado:', documentoFormatado)
        return documentoFormatado
      })
      
      console.log('ðŸ” MediaStep - Documentos processados:', documentosExistentes)
      console.log('ðŸ” MediaStep - Primeiro documento detalhado:', documentosExistentes[0])
      setSelectedDocuments(documentosExistentes)
    } else if (mode === 'edit' && imovelId) {
      console.log('ðŸ” MediaStep - Nenhum documento encontrado em data.documentos, mas imovelId existe:', imovelId)
    }
  }, [mode, data.documentos, imovelId])

  // Carregar vÃ­deo existente no modo de ediÃ§Ã£o
  useEffect(() => {
    if (mode === 'edit' && (data as any).video) {
      console.log('ðŸ” MediaStep - Carregando vÃ­deo existente:', (data as any).video)
      setVideo((data as any).video)
    }
  }, [mode, (data as any).video])

  useEffect(() => {
    // Atualizar dados quando arquivos mudarem
    // SÃ³ executar se nÃ£o estivermos no modo de ediÃ§Ã£o ou se nÃ£o houver documentos carregados
    if (mode === 'edit' && selectedDocuments.length > 0 && selectedDocuments[0].tipoDocumentoDescricao) {
      console.log('ðŸ” MediaStep - Pulando updateData no modo de ediÃ§Ã£o com documentos carregados')
      return
    }
    
    const updateData = async () => {
      // Converter imagens para base64
      const imagensData = await Promise.all(
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
      
      // Converter documentos para base64
      const documentosData = await Promise.all(
        selectedDocuments.filter(doc => doc.status === 'completed').map(async (doc) => {
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.readAsDataURL(doc.file)
          })
          
          return {
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
        })
      )
      
      console.log('ðŸ” MediaStep - Imagens atualizadas:', imagensData.length)
      console.log('ðŸ” MediaStep - Documentos atualizados:', documentosData.length)
      console.log('ðŸ” MediaStep - Documentos detalhados:', documentosData)
      console.log('ðŸ” MediaStep - Imagem principal selecionada:', selectedPrincipalId)
      
    onUpdate({
        imagens: imagensData,
        documentos: documentosData
      })
      
      // Notificar sobre mudanÃ§a de imagem principal separadamente
      console.log('ðŸ” MediaStep - Imagem principal selecionada:', selectedPrincipalId)
    }
    
    updateData()
  }, [selectedImages, selectedDocuments, selectedPrincipalId])

  const loadTiposDocumentos = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/tipos-documentos')
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
  }

  const handleImageUpload = async (files: FileList) => {
    if (!imovelId) {
      // Modo criaÃ§Ã£o - salvar temporariamente para upload posterior
    const newImages: UploadedFile[] = []
    
    Array.from(files).forEach((file, index) => {
      if (file.type.startsWith('image/') && selectedImages.length + newImages.length < 10) {
          const id = `temp-img-${Date.now()}-${index}`
        const preview = URL.createObjectURL(file)
        
        newImages.push({
          id,
          file,
          preview,
            progress: 100,
            status: 'completed' // TemporÃ¡rio, serÃ¡ processado depois
        })
      }
    })

    setSelectedImages(prev => [...prev, ...newImages])
      return
    }

    // Modo ediÃ§Ã£o - upload direto
    try {
      const filesArray = Array.from(files).filter(file => 
        file.type.startsWith('image/') && 
        (loadedImages.length + selectedImages.length) < 10
      )
      
      if (filesArray.length > 0) {
        await uploadImages(imovelId, filesArray)
        
        // ApÃ³s upload bem-sucedido, recarregar APENAS as novas imagens da API
        console.log('ðŸ” MediaStep - Upload concluÃ­do, recarregando imagens da API')
        try {
          const response = await fetch(`/api/admin/imoveis/${imovelId}/imagens`)
          if (response.ok) {
            const data = await response.json()
            const imagensDoBanco = data.data || []
            
            // Encontrar apenas as imagens que nÃ£o estÃ£o jÃ¡ carregadas
            const idsCarregados = loadedImages.map(img => parseInt(img.id))
            const novasImagens = imagensDoBanco.filter((img: any) => !idsCarregados.includes(img.id))
            
            console.log('ðŸ” MediaStep - Imagens jÃ¡ carregadas:', idsCarregados)
            console.log('ðŸ” MediaStep - Novas imagens encontradas:', novasImagens.map((img: any) => img.id))
            
            // Verificar se hÃ¡ imagens marcadas para remoÃ§Ã£o no rascunho
            const imagensRemovidasRascunho = rascunho?.alteracoes?.imagens?.removidas || []
            console.log('ðŸ” MediaStep - Imagens removidas no rascunho:', imagensRemovidasRascunho)
            
            // Registrar no rascunho apenas as novas imagens adicionadas
            if (registrarAlteracaoRascunho && novasImagens.length > 0) {
              for (const img of novasImagens) {
                await registrarAlteracaoRascunho('imagem', 'adicionar', img.id.toString())
              }
            }
            
            const novasImagensFormatadas = novasImagens.map((img: any) => {
              console.log('ðŸ” MediaStep - Processando nova imagem da API:', {
                id: img.id,
                tipo_mime: img.tipo_mime,
                tamanho_imagem: img.imagem?.length || 0,
                tipo_imagem: typeof img.imagem,
                isBuffer: Buffer.isBuffer(img.imagem)
              })
              
              const base64String = Buffer.from(img.imagem).toString('base64')
              console.log('ðŸ” MediaStep - Base64 gerado:', base64String.substring(0, 50) + '...')
              
              return {
                id: img.id.toString(),
                url: `data:${img.tipo_mime};base64,${base64String}`,
                nome: `imagem_${img.id}`,
                descricao: '',
                ordem: img.ordem,
                principal: img.principal,
                dataUpload: img.created_at,
                tamanho: img.tamanho_bytes,
                tipo: img.tipo_mime
              }
            })
            
            // Adicionar apenas as novas imagens ao estado existente
            setLoadedImages(prev => {
              // Filtrar imagens que foram removidas no rascunho
              const imagensAtivas = prev.filter(img => !imagensRemovidasRascunho.includes(img.id))
              const todasImagens = [...imagensAtivas, ...novasImagensFormatadas]
              
              console.log('ðŸ” MediaStep - Imagens ativas apÃ³s filtrar removidas:', imagensAtivas.map((img: LoadedImage) => img.id))
              console.log('ðŸ” MediaStep - Novas imagens formatadas:', novasImagensFormatadas.map((img: any) => img.id))
              
              return todasImagens.sort((a, b) => {
                if (a.ordem !== b.ordem) {
                  return a.ordem - b.ordem
                }
                return parseInt(a.id) - parseInt(b.id)
              })
            })
            
            console.log('ðŸ” MediaStep - Novas imagens adicionadas:', novasImagensFormatadas.length)
          }
      } catch (error) {
          console.error('Erro ao recarregar imagens apÃ³s upload:', error)
        }
      }
    } catch (error) {
      console.error('Erro no upload de imagens:', error)
    }
  }

  const handleDocumentUpload = async (files: FileList) => {
    if (!selectedTipoDocumento) {
      alert('Por favor, selecione um tipo de documento primeiro.')
      return
    }

    const tipoDocumento = tiposDocumentos.find(t => t.id === selectedTipoDocumento)
    if (!tipoDocumento) {
      alert('Tipo de documento nÃ£o encontrado.')
      return
    }

    // Comentado temporariamente para permitir mÃºltiplos documentos do mesmo tipo
    // const jaExisteDocumentoTipo = selectedDocuments.some(doc => doc.tipoDocumentoId === selectedTipoDocumento)
    // if (jaExisteDocumentoTipo) {
    //   alert('JÃ¡ existe um documento deste tipo. Remova o documento existente antes de adicionar um novo.')
    //   return
    // }

    const newDocuments: UploadedFile[] = []
    
    Array.from(files).forEach((file, index) => {
      // Verificar se o arquivo jÃ¡ nÃ£o foi adicionado
      const arquivoJaExiste = selectedDocuments.some(doc => 
        doc.file.name === file.name && doc.file.size === file.size
      )
      
      if (arquivoJaExiste) {
        console.log('ðŸ” Documento jÃ¡ existe, pulando:', file.name)
        return
      }
      
      const id = `doc-${Date.now()}-${index}`
      const preview = URL.createObjectURL(file)
      
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

    if (newDocuments.length === 0) {
      alert('Nenhum documento novo para adicionar.')
      return
    }

    setSelectedDocuments(prev => [...prev, ...newDocuments])

    // Upload real dos documentos para o servidor
    for (const document of newDocuments) {
      try {
        console.log('ðŸ” handleDocumentUpload - Fazendo upload real do documento:', document.id, 'para imÃ³vel:', imovelId)
        
        if (mode === 'edit' && imovelId) {
          // Modo ediÃ§Ã£o - upload direto para o servidor
          const formData = new FormData()
          formData.append('documento', document.file)
          formData.append('tipo_documento_id', document.tipoDocumentoId!.toString())
          
          const response = await fetch(`/api/admin/imoveis/${imovelId}/documentos`, {
            method: 'POST',
            body: formData
          })
          
          if (!response.ok) {
            const errorText = await response.text()
            console.error('âŒ handleDocumentUpload - Erro no upload:', errorText)
            throw new Error(errorText)
          }
          
          const result = await response.json()
          console.log('âœ… handleDocumentUpload - Upload realizado com sucesso:', result)
          
          // ApÃ³s upload bem-sucedido, recarregar documentos da API
          console.log('ðŸ” MediaStep - Upload de documento concluÃ­do, recarregando documentos da API')
          try {
            const response = await fetch(`/api/admin/imoveis/${imovelId}/documentos`)
            if (response.ok) {
              const data = await response.json()
              const documentosDoBanco = data.data || []
              
              // Encontrar apenas os documentos que nÃ£o estÃ£o jÃ¡ carregados
              const idsCarregados = selectedDocuments.map(doc => parseInt(doc.id))
              const novosDocumentos = documentosDoBanco.filter((doc: any) => !idsCarregados.includes(doc.id))
              
              console.log('ðŸ” MediaStep - Documentos jÃ¡ carregados:', idsCarregados)
              console.log('ðŸ” MediaStep - Novos documentos encontrados:', novosDocumentos.map((doc: any) => doc.id))
              
              // Verificar se hÃ¡ documentos marcados para remoÃ§Ã£o no rascunho
              const documentosRemovidosRascunho = rascunho?.alteracoes?.documentos?.removidos || []
              console.log('ðŸ” MediaStep - Documentos removidos no rascunho:', documentosRemovidosRascunho)
              
              // Registrar no rascunho apenas os novos documentos adicionados
              if (registrarAlteracaoRascunho && novosDocumentos.length > 0) {
                for (const doc of novosDocumentos) {
                  await registrarAlteracaoRascunho('documento', 'adicionar', doc.id.toString())
                }
              }
              
              const novosDocumentosFormatados = novosDocumentos.map((doc: any) => {
                console.log('ðŸ” MediaStep - Processando novo documento da API:', {
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
                
                console.log('ðŸ” MediaStep - Documentos ativos apÃ³s filtrar removidos:', documentosAtivos.map((doc: any) => doc.id))
                console.log('ðŸ” MediaStep - Novos documentos formatados:', novosDocumentosFormatados.map((doc: any) => doc.id))
                
                return todosDocumentos
              })
              
              console.log('ðŸ” MediaStep - Novos documentos adicionados:', novosDocumentosFormatados.length)
            }
          } catch (error) {
            console.error('Erro ao recarregar documentos apÃ³s upload:', error)
          }
        } else {
          // Modo criaÃ§Ã£o - apenas simular (serÃ¡ processado depois)
        await new Promise(resolve => setTimeout(resolve, 1000))
        }
        
        setSelectedDocuments(prev => prev.map(doc => 
          doc.id === document.id 
            ? { ...doc, status: 'completed' as const, progress: 100 }
            : doc
        ))
      } catch (error) {
        console.error('âŒ handleDocumentUpload - Erro no upload do documento:', error)
        console.error('âŒ handleDocumentUpload - Detalhes do erro:', {
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
    console.log('ðŸ” removeImage - ID:', id, 'Mode:', mode, 'ImovelId:', imovelId)
    
    // Se Ã© uma imagem existente (nÃ£o temporÃ¡ria)
    if (imovelId && !id.startsWith('temp-')) {
      // Registrar no rascunho se for modo de ediÃ§Ã£o (NÃƒO excluir do banco ainda)
      if (mode === 'edit' && registrarAlteracaoRascunho) {
        console.log('ðŸ” removeImage - Registrando remoÃ§Ã£o no rascunho')
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
        // Modo criaÃ§Ã£o ou sem rascunho - excluir imediatamente
        try {
          await deleteImage(imovelId, parseInt(id))
          console.log('âœ… removeImage - Imagem deletada com sucesso')
          
          // Remover da interface apÃ³s exclusÃ£o no banco
          setLoadedImages(prev => {
            const image = prev.find(img => img.id === id)
            if (image) {
              URL.revokeObjectURL(image.url)
            }
            return prev.filter(img => img.id !== id)
          })
        } catch (error) {
          console.error('âŒ removeImage - Erro ao deletar imagem:', error)
        }
      }
    } else {
      // Imagem temporÃ¡ria - remover apenas da interface
    setSelectedImages(prev => {
      const image = prev.find(img => img.id === id)
      if (image) {
        URL.revokeObjectURL(image.preview)
      }
      return prev.filter(img => img.id !== id)
    })
  }

    console.log('âœ… removeImage - Imagem removida da interface')
  }

  const removeDocument = async (id: string) => {
    console.log('ðŸ” removeDocument - ID:', id, 'Tipo:', typeof id, 'imovelId:', imovelId)
    
    // Se Ã© um documento existente (nÃ£o temporÃ¡rio)
    if (imovelId && typeof id === 'string' && !id.startsWith('temp-')) {
      // Registrar no rascunho se for modo de ediÃ§Ã£o (NÃƒO excluir do banco ainda)
      if (mode === 'edit' && registrarAlteracaoRascunho) {
        console.log('ðŸ” removeDocument - Registrando remoÃ§Ã£o no rascunho')
        await registrarAlteracaoRascunho('documento', 'remover', id)
      } else {
        // Modo criaÃ§Ã£o ou sem rascunho - excluir imediatamente
        try {
          console.log('ðŸ” removeDocument - Fazendo chamada para API DELETE:', `/api/admin/imoveis/${imovelId}/documentos/${id}`)
          
          const response = await fetch(`/api/admin/imoveis/${imovelId}/documentos/${id}`, {
            method: 'DELETE'
          })
          
          console.log('ðŸ” removeDocument - Resposta da API:', response.status, response.statusText)
          
          if (!response.ok) {
            const errorText = await response.text()
            console.error('âŒ removeDocument - Erro ao deletar documento:', errorText)
          } else {
            console.log('âœ… removeDocument - Documento deletado com sucesso')
          }
        } catch (error) {
          console.error('âŒ removeDocument - Erro ao deletar documento:', error)
        }
      }
    } else {
      console.log('ðŸ” removeDocument - Documento temporÃ¡rio, removendo apenas da interface')
    }
    
    // Remover da interface local
    console.log('ðŸ” removeDocument - Removendo da interface local')
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
    console.log('ðŸ” MediaStep - Imagem principal alterada para:', imageId)
    
    // Registrar no rascunho se for modo de ediÃ§Ã£o
    if (mode === 'edit' && registrarImagemPrincipalRascunho) {
      console.log('ðŸ” MediaStep - Registrando mudanÃ§a de imagem principal no rascunho')
      await registrarImagemPrincipalRascunho(imageId)
    }
  }

  // FunÃ§Ãµes para manipular vÃ­deo
  const handleVideoSelect = (videoData: VideoUploadData) => {
    console.log('ðŸ” MediaStep - VÃ­deo selecionado:', videoData)
    console.log('ðŸ” MediaStep - Estado atual selectedVideo:', selectedVideo)
    setSelectedVideo(videoData)
    console.log('ðŸ” MediaStep - Novo selectedVideo definido:', videoData)
    
    // Se estiver em modo de ediÃ§Ã£o, registrar no rascunho
    if (mode === 'edit' && registrarVideoAlteracaoRascunho) {
      registrarVideoAlteracaoRascunho('adicionar', videoData)
    }
  }

  const handleVideoRemove = () => {
    console.log('ðŸ” MediaStep - Removendo vÃ­deo')
    setSelectedVideo(null)
    setVideo(null)
    
    // Se estiver em modo de ediÃ§Ã£o, registrar no rascunho
    if (mode === 'edit' && registrarVideoAlteracaoRascunho) {
      registrarVideoAlteracaoRascunho('remover')
    }
  }

  const handleVideoPreview = () => {
    console.log('ðŸ” MediaStep - Abrindo preview do vÃ­deo')
    setIsVideoModalOpen(true)
  }

  const handleVideoReplace = () => {
    console.log('ðŸ” MediaStep - Substituindo vÃ­deo')
    // Trigger file input
    document.getElementById('video-upload')?.click()
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
        <h2 className="text-2xl font-bold text-gray-900 mb-2">MÃ­dia do ImÃ³vel</h2>
        <p className="text-gray-600">
          Adicione imagens e documentos do imÃ³vel. VocÃª pode fazer upload de atÃ© 10 imagens.
        </p>
      </div>

      {/* Container 1: Imagens do ImÃ³vel */}
      <div className="bg-white border border-gray-400 rounded-lg p-6 shadow-sm">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Imagens do ImÃ³vel</h3>
          <span className="text-sm text-gray-500">
              {loadedImages.length + selectedImages.filter(img => img.status === 'completed').length}/10 imagens
          </span>
        </div>

        {/* Ãrea de Upload de Imagens */}
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={(e) => handleDrop(e, 'images')}
        >
          <div className="space-y-4">
            <div className="text-4xl">ðŸ“¸</div>
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
                PNG, JPG, JPEG atÃ© 10MB cada. MÃ¡ximo 10 imagens.
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

        {/* Lista de Imagens */}
        {(uploadedImages.length > 0 || selectedImages.length > 0 || loadedImages.length > 0) && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Imagens carregadas do servidor via hook (apenas no modo criaÃ§Ã£o) */}
            {(() => {
              console.log('ðŸ” MediaStep - Renderizando uploadedImages:', uploadedImages.length, 'loadedImages:', loadedImages.length)
              return null
            })()}
            {mode === 'create' && uploadedImages.map((image) => (
              <div key={image.id} className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                  <img
                    src={image.url}
                    alt={`Imagem ${image.id}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.log('ðŸ” MediaStep - Erro ao carregar imagem:', image.id)
                      e.currentTarget.src = 'https://via.placeholder.com/300x200?text=Imagem+NÃ£o+Encontrada'
                    }}
                  />
                  
                  {/* Indicador de imagem principal */}
                  {image.principal && (
                    <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                      Principal
                    </div>
                  )}
                </div>
                
                {/* BotÃ£o de remover */}
                <button
                  onClick={() => removeImage(image.id)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Ã—
                </button>
                
                {/* Tipo do arquivo */}
                <p className="text-xs text-gray-600 mt-1 truncate">
                  {image.tipo}
                </p>
              </div>
            ))}
            
            {/* Imagens carregadas dos dados do imÃ³vel */}
            {(() => {
              console.log('ðŸ” MediaStep - Renderizando loadedImages:', loadedImages.length, loadedImages.map(img => ({ id: img.id, url: img.url?.substring(0, 50) + '...' })))
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
                      console.log('ðŸ” MediaStep - Erro ao carregar imagem:', image.id)
                      e.currentTarget.src = 'https://via.placeholder.com/300x200?text=Imagem+NÃ£o+Encontrada'
                    }}
                  />
                  
                  {/* Indicador de imagem principal */}
                  {image.principal && (
                    <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                      Principal
                    </div>
                  )}
                </div>
                
                {/* BotÃ£o de remover */}
                <button
                  onClick={() => removeImage(image.id)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Ã—
                </button>
                
                {/* Tipo do arquivo */}
                <p className="text-xs text-gray-600 mt-1 truncate">
                  {image.tipo}
                </p>
              </div>
            ))}
            
            {/* Imagens temporÃ¡rias (modo criaÃ§Ã£o) */}
            {selectedImages.map((image) => (
              <div key={image.id} className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                  <img
                    src={image.preview}
                    alt={image.file.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.log('ðŸ” MediaStep - Erro ao carregar imagem:', image.preview)
                      e.currentTarget.src = 'https://via.placeholder.com/300x200?text=Imagem+NÃ£o+Encontrada'
                    }}
                  />
                </div>
                
                {/* BotÃ£o de remover */}
                <button
                  onClick={() => removeImage(image.id)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Ã—
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

      {/* Container 2: VÃ­deo do ImÃ³vel */}
      <div className="bg-white border border-gray-400 rounded-lg p-6 shadow-sm">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">VÃ­deo do ImÃ³vel</h3>
            <span className="text-sm text-gray-500">
              {video || selectedVideo || (rascunho?.alteracoes?.video?.dados) ? '1 vÃ­deo' : '0 vÃ­deos'}
            </span>
          </div>

          {/* Componente de Upload/Preview de VÃ­deo */}
          {(() => {
            // Verificar se hÃ¡ vÃ­deo no rascunho
            const videoFromRascunho = rascunho?.alteracoes?.video?.dados
            
            const hasVideo = video || selectedVideo || videoFromRascunho
            const videoToPass = selectedVideo ? {
              id: 0, // ID temporÃ¡rio para vÃ­deos nÃ£o salvos
              imovel_id: imovelId || 0,
              video: Buffer.from(''), // Buffer vazio para vÃ­deos nÃ£o salvos
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
            
            console.log('ðŸ” MediaStep - Renderizando vÃ­deo:', { 
              hasVideo, 
              video, 
              selectedVideo, 
              videoFromRascunho,
              videoToPass,
              rascunhoVideo: rascunho?.alteracoes?.video
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

      {/* Container 3: Documentos do ImÃ³vel */}
      <div className="bg-white border border-gray-400 rounded-lg p-6 shadow-sm">
      {/* Upload de Documentos */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Documentos do ImÃ³vel</h3>
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

        {/* Ãrea de Upload de Documentos */}
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragActive && selectedTipoDocumento ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
          } ${!selectedTipoDocumento ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''}`}
          onDragEnter={selectedTipoDocumento ? handleDrag : undefined}
          onDragLeave={selectedTipoDocumento ? handleDrag : undefined}
          onDragOver={selectedTipoDocumento ? handleDrag : undefined}
          onDrop={selectedTipoDocumento ? (e) => handleDrop(e, 'documents') : undefined}
        >
          <div className="space-y-4">
            <div className="text-4xl">ðŸ“„</div>
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
                    PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, GIF atÃ© 50MB cada.
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
              console.log('ðŸ” ANTES DA RENDERIZAÃ‡ÃƒO - selectedDocuments:', selectedDocuments)
              return null
            })()}
            {selectedDocuments.map((document) => {
              console.log('ðŸ” Renderizando documento:', {
                id: document.id,
                tipoDocumentoDescricao: document.tipoDocumentoDescricao,
                preview: document.preview,
                file: document.file.name
              })
              return (
              <div key={document.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">
                    {document.file.type.includes('pdf') ? 'ðŸ“„' : 
                     document.file.type.includes('word') ? 'ðŸ“' :
                       document.file.type.includes('excel') ? 'ðŸ“Š' :
                       document.file.type.includes('image') ? 'ðŸ–¼ï¸' : 'ðŸ“Ž'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                        {document.tipoDocumentoDescricao || 'Documento'}
                    </p>
                    <p className="text-xs text-gray-500">
                        {document.preview && `${document.preview} â€¢ `}
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
                    <span className="text-xs text-green-500">âœ“</span>
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
              <strong>Debug:</strong> {data.documentos.length} documento(s) encontrado(s) mas nÃ£o carregado(s) na interface.
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

      {/* Tipos de Documentos DisponÃ­veis */}
      {tiposDocumentos.length > 0 && (
        <div className="bg-blue-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">
            Tipos de Documentos DisponÃ­veis
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
        <h4 className="text-sm font-medium text-gray-900 mb-2">Resumo da MÃ­dia</h4>
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

      {/* Modal de Preview do VÃ­deo */}
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






