'use client'

import { useState, useCallback, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { 
  DocumentIcon, 
  XMarkIcon, 
  EyeIcon,
  TrashIcon,
  CloudArrowUpIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

interface DocumentoCarregado {
  id?: number
  tipo_documento_id: number
  tipo_documento_descricao: string
  nome_arquivo: string
  tipo_arquivo: string
  tamanho: number
  data_url?: string
  file?: File
}

interface TipoDocumento {
  id: number
  descricao: string
}

interface DocumentUploadProps {
  imovelId: number
  onDocumentsChange?: (documentos: DocumentoCarregado[]) => void
  className?: string
}

export default function DocumentUpload({ 
  imovelId, 
  onDocumentsChange, 
  className = '' 
}: DocumentUploadProps) {
  const [documentos, setDocumentos] = useState<DocumentoCarregado[]>([])
  const [tiposDocumentos, setTiposDocumentos] = useState<TipoDocumento[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedTipo, setSelectedTipo] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Carregar tipos de documentos disponíveis
  const loadTiposDocumentos = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/tipos-documentos')
      if (response.ok) {
        const data = await response.json()
        setTiposDocumentos(data.tiposDocumentos || [])
      }
    } catch (error) {
      console.error('Erro ao carregar tipos de documentos:', error)
    }
  }, [])

  // Carregar documentos existentes do imóvel
  const loadDocumentos = useCallback(async () => {
    if (!imovelId) return
    
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/imoveis/${imovelId}/documentos`)
      if (response.ok) {
        const data = await response.json()
        setDocumentos(data.documentos || [])
      }
    } catch (error) {
      console.error('Erro ao carregar documentos:', error)
    } finally {
      setLoading(false)
    }
  }, [imovelId])

  // Inicializar dados
  useState(() => {
    loadTiposDocumentos()
    if (imovelId) {
      loadDocumentos()
    }
  })

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return
    
    const file = acceptedFiles[0] // Apenas um arquivo por vez
    
    // Validar tipo de arquivo
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif'
    ]

    if (!allowedTypes.includes(file.type)) {
      setError('Tipo de arquivo não permitido. Use PDF, JPG, PNG ou GIF')
      return
    }

    // Validar tamanho (máximo 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      setError('Arquivo muito grande. Máximo 10MB permitido')
      return
    }

    setError(null)
    setShowUploadModal(true)
    
    // Armazenar arquivo temporariamente
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      // O tipo será selecionado no modal
    }
    reader.readAsDataURL(file)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.jpg', '.jpeg', '.png', '.gif']
    },
    multiple: false,
    maxFiles: 1
  })

  const handleUploadDocument = async (tipoDocumentoId: number, file: File) => {
    try {
      setLoading(true)
      setError(null)

      const formData = new FormData()
      formData.append('documento', file)
      formData.append('tipo_documento_id', tipoDocumentoId.toString())

      const response = await fetch(`/api/admin/imoveis/${imovelId}/documentos`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao fazer upload')
      }

      // Recarregar documentos
      await loadDocumentos()
      setShowUploadModal(false)
      setSelectedTipo(null)
      
      if (onDocumentsChange) {
        onDocumentsChange(documentos)
      }

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteDocument = async (documentoId: number) => {
    if (!confirm('Tem certeza que deseja excluir este documento?')) {
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`/api/admin/imoveis/${imovelId}/documentos/${documentoId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao excluir documento')
      }

      // Recarregar documentos
      await loadDocumentos()
      
      if (onDocumentsChange) {
        onDocumentsChange(documentos)
      }

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  const handleViewDocument = async (documentoId: number) => {
    try {
      const response = await fetch(`/api/admin/imoveis/${imovelId}/documentos/${documentoId}`)
      if (response.ok) {
        const data = await response.json()
        if (data.documento?.data_url) {
          // Abrir documento em nova aba
          window.open(data.documento.data_url, '_blank')
        }
      }
    } catch (error) {
      setError('Erro ao abrir documento')
    }
  }

  const getFileIcon = (tipoArquivo: string) => {
    if (tipoArquivo === 'application/pdf') {
      return '📄'
    } else if (tipoArquivo.startsWith('image/')) {
      return '🖼️'
    }
    return '📎'
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Documentos do Imóvel
          </h3>
          <p className="text-sm text-gray-600">
            Faça upload de documentos relacionados ao imóvel
          </p>
        </div>
      </div>

      {/* Área de Upload */}
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
          }
        `}
      >
        <input {...getInputProps()} ref={fileInputRef} />
        
        <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        
        <div className="space-y-2">
          <p className="text-lg font-medium text-gray-900">
            {isDragActive ? 'Solte o arquivo aqui' : 'Clique para selecionar ou arraste um arquivo'}
          </p>
          <p className="text-sm text-gray-600">
            Formatos aceitos: PDF, JPG, PNG, GIF
          </p>
          <p className="text-sm text-gray-500">
            Tamanho máximo: 10MB
          </p>
        </div>
      </div>

      {/* Erro */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Lista de Documentos */}
      {documentos.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-md font-medium text-gray-900">
            Documentos Carregados ({documentos.length})
          </h4>
          
          <div className="grid gap-3">
            {documentos.map((documento) => (
              <div
                key={documento.id}
                className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">
                      {getFileIcon(documento.tipo_arquivo)}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">
                        {documento.tipo_documento_descricao}
                      </p>
                      <p className="text-sm text-gray-600">
                        {documento.nome_arquivo} • {formatFileSize(documento.tamanho)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleViewDocument(documento.id!)}
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Visualizar documento"
                    >
                      <EyeIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteDocument(documento.id!)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      title="Excluir documento"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de Seleção de Tipo */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Selecionar Tipo de Documento
            </h3>
            
            <div className="space-y-3 mb-6">
              {tiposDocumentos.map((tipo) => (
                <button
                  key={tipo.id}
                  onClick={() => setSelectedTipo(tipo.id)}
                  className={`
                    w-full text-left p-3 rounded-lg border transition-colors
                    ${selectedTipo === tipo.id
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                >
                  {tipo.descricao}
                </button>
              ))}
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowUploadModal(false)
                  setSelectedTipo(null)
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  // Implementar upload com tipo selecionado
                  setShowUploadModal(false)
                }}
                disabled={!selectedTipo || loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}






