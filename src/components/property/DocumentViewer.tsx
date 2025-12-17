import { 
  DocumentTextIcon,
  PhotoIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
  EyeIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import SafeImage from '@/components/common/SafeImage'

interface DocumentViewerProps {
  documento: {
    id: string
    nome_arquivo: string
    tipo_documento: string
    tipo_mime: string
    tamanho_bytes: number
    data_upload: string
    url?: string
  }
  onClose: () => void
  imovelId?: string // Adicionar ID do imóvel para navegação correta
}

export default function DocumentViewer({ documento, onClose, imovelId }: DocumentViewerProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Determinar tipo de visualização baseado no MIME type
  const getViewerType = (mimeType: string) => {
    if (mimeType.includes('pdf')) return 'pdf'
    if (mimeType.includes('image/')) return 'image'
    if (mimeType.includes('text/')) return 'text'
    return 'download'
  }

  const viewerType = getViewerType(documento.tipo_mime)

  // Função para download
  const handleDownload = () => {
    if (documento.url) {
      const link = document.createElement('a')
      link.href = documento.url
      link.download = documento.nome_arquivo
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  // Debug: verificar URL do documento
  console.log('🔍 DocumentViewer - documento recebido:', {
    id: documento.id,
    nome_arquivo: documento.nome_arquivo,
    url: documento.url,
    tipo_mime: documento.tipo_mime
  })
  
  // Debug: verificar imovelId
  console.log('🔍 DocumentViewer - imovelId prop:', imovelId)

  // Auto-carregar quando o modal abrir
  useEffect(() => {
    if (documento.url) {
      console.log('🔍 DocumentViewer - Iniciando carregamento:', documento.url)
      // Simular carregamento por 1 segundo para mostrar o loading
      const timer = setTimeout(() => {
        setIsLoading(false)
      }, 1000)
      
      return () => clearTimeout(timer)
    }
  }, [documento.url])

  // Remover interceptação do DocumentViewer - agora é feita no DocumentosLista

  // Função para fechar com ESC
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }

  // Função para fechar o modal
  const handleClose = () => {
    console.log('🔍 DocumentViewer - Fechando modal manualmente')
    onClose()
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className="bg-white w-full h-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-3">
            {viewerType === 'pdf' ? (
              <DocumentTextIcon className="h-6 w-6 text-red-600" />
            ) : viewerType === 'image' ? (
              <PhotoIcon className="h-6 w-6 text-blue-600" />
            ) : (
              <DocumentTextIcon className="h-6 w-6 text-gray-600" />
            )}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 truncate max-w-md">
                {documento.nome_arquivo}
              </h3>
              <p className="text-sm text-gray-500">
                {documento.tipo_documento} • {Math.round(documento.tamanho_bytes / 1024)} KB
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownload}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              title="Download"
            >
              <ArrowDownTrayIcon className="h-5 w-5" />
            </button>
            <button
              onClick={handleClose}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              title="Fechar"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {isLoading && (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Carregando documento...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <XMarkIcon className="h-6 w-6 text-red-600" />
                </div>
                <p className="text-red-600 font-medium">Erro ao carregar documento</p>
                <p className="text-red-500 text-sm mt-1">{error}</p>
                <button
                  onClick={handleDownload}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Baixar Documento
                </button>
              </div>
            </div>
          )}

          {!isLoading && !error && documento.url && (
            <div className="w-full h-full">
              {viewerType === 'pdf' && (
                <iframe
                  src={documento.url}
                  className="w-full h-full border-0"
                  title={documento.nome_arquivo}
                  onLoad={() => {
                    console.log('🔍 DocumentViewer - PDF carregado com sucesso')
                    setIsLoading(false)
                  }}
                  onError={(e) => {
                    console.error('❌ DocumentViewer - Erro ao carregar PDF:', e)
                    setError('Erro ao carregar PDF')
                    setIsLoading(false)
                  }}
                />
              )}

              {viewerType === 'image' && (
                <div className="w-full h-full flex items-center justify-center p-4">
                  <div className="relative w-full h-full min-h-[300px]">
                    <SafeImage
                      src={documento.url}
                      alt={documento.nome_arquivo}
                      fill
                      className="object-contain shadow-lg"
                      unoptimized
                      onLoadingComplete={() => setIsLoading(false)}
                    />
                  </div>
                </div>
              )}

              {viewerType === 'text' && (
                <div className="w-full h-full">
                  <iframe
                    src={documento.url}
                    className="w-full h-full border-0"
                    title={documento.nome_arquivo}
                    onLoad={() => setIsLoading(false)}
                    onError={() => {
                      setError('Erro ao carregar texto')
                      setIsLoading(false)
                    }}
                  />
                </div>
              )}

              {viewerType === 'download' && (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <DocumentTextIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 text-lg mb-2">Visualização não disponível</p>
                    <p className="text-gray-500 text-sm mb-4">
                      Este tipo de arquivo não pode ser visualizado diretamente
                    </p>
                    <button
                      onClick={handleDownload}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 mx-auto"
                    >
                      <ArrowDownTrayIcon className="h-5 w-5" />
                      <span>Baixar Arquivo</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-500">
            Enviado em {new Date(documento.data_upload).toLocaleDateString('pt-BR')}
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              <span>Download</span>
            </button>
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
