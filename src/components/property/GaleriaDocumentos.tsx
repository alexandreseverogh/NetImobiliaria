import { 
  EyeIcon, 
  PhotoIcon, 
  VideoCameraIcon, 
  DocumentTextIcon,
  XCircleIcon,
  PlayIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline'
import { useState } from 'react'
import SafeImage from '@/components/common/SafeImage'

interface GaleriaDocumentosProps {
  imagens: any[]
  videos: any[]
  documentos: any[]
  consulta_imovel_internauta: boolean
  loading: boolean
}

export default function GaleriaDocumentos({ 
  imagens, 
  videos, 
  documentos, 
  consulta_imovel_internauta,
  loading 
}: GaleriaDocumentosProps) {
  const [imagemSelecionada, setImagemSelecionada] = useState<number | null>(null)

  if (loading) {
    return <SkeletonGaleriaDocumentos />
  }

  return (
    <div className="space-y-8">
      {/* Galeria de Imagens */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-6">
          <PhotoIcon className="h-6 w-6 text-blue-600 mr-2" />
          <h3 className="text-2xl font-bold text-gray-900">Galeria de Imagens</h3>
          <span className="ml-2 text-sm text-gray-500">({imagens.length} imagens)</span>
        </div>
        
        {imagens.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {imagens.map((imagem, index) => (
              <div 
                key={imagem.id} 
                className="relative group cursor-pointer"
                onClick={() => setImagemSelecionada(index)}
              >
                <div className="relative w-full h-48">
                  <SafeImage
                    src={imagem.url}
                    alt={`Imagem ${imagem.ordem || index + 1}`}
                    fill
                    className="object-cover rounded-lg shadow-md"
                    unoptimized
                  />
                </div>
                {imagem.principal && (
                  <div className="absolute top-2 left-2 bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium">
                    Principal
                  </div>
                )}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity rounded-lg flex items-center justify-center">
                  <EyeIcon className="h-8 w-8 text-blue-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                  {imagem.ordem || index + 1}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <PhotoIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">Nenhuma imagem disponível</p>
            <p className="text-gray-400 text-sm mt-2">
              Este imóvel ainda não possui imagens cadastradas
            </p>
          </div>
        )}
      </div>

      {/* Modal de Visualização de Imagem Ampliada */}
      {imagemSelecionada !== null && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 backdrop-blur-sm"
          onClick={(e) => {
            // Fechar apenas se clicar no fundo (não na imagem)
            if (e.target === e.currentTarget) {
              setImagemSelecionada(null)
            }
          }}
        >
          <div className="relative max-w-[95vw] max-h-[95vh] w-full h-full flex items-center justify-center">
            {/* Botão fechar */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                setImagemSelecionada(null)
              }}
              className="absolute top-4 right-4 bg-black bg-opacity-70 hover:bg-opacity-90 text-white p-3 rounded-full transition-all z-10 shadow-lg"
              aria-label="Fechar visualização"
            >
              <XCircleIcon className="h-6 w-6" />
            </button>
            
            {/* Contador de imagens */}
            <div className="absolute top-4 left-4 bg-black bg-opacity-70 text-white px-4 py-2 rounded-full text-sm font-medium z-10">
              {imagemSelecionada + 1} de {imagens.length}
            </div>
            
            {/* Container da imagem - ocupa quase toda a tela */}
            <div className="relative w-full h-full flex items-center justify-center">
              <img
                src={imagens[imagemSelecionada]?.url}
                alt={`Imagem ${imagemSelecionada + 1}`}
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                style={{ 
                  maxWidth: '95vw',
                  maxHeight: '95vh',
                  width: 'auto',
                  height: 'auto'
                }}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            
            {/* Navegação entre imagens (se houver mais de uma) */}
            {imagens.length > 1 && (
              <>
                {/* Botão anterior */}
                {imagemSelecionada > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setImagemSelecionada(imagemSelecionada - 1)
                    }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-70 hover:bg-opacity-90 text-white p-3 rounded-full transition-all z-10 shadow-lg"
                    aria-label="Imagem anterior"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                )}
                
                {/* Botão próximo */}
                {imagemSelecionada < imagens.length - 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setImagemSelecionada(imagemSelecionada + 1)
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-70 hover:bg-opacity-90 text-white p-3 rounded-full transition-all z-10 shadow-lg"
                    aria-label="Próxima imagem"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Vídeos */}
      {videos.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-6">
            <VideoCameraIcon className="h-6 w-6 text-red-600 mr-2" />
            <h3 className="text-2xl font-bold text-gray-900">Vídeos</h3>
            <span className="ml-2 text-sm text-gray-500">({videos.length} vídeos)</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {videos.map((video) => (
              <div key={video.id} className="relative group">
                <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                  <PlayIcon className="h-16 w-16 text-blue-300 opacity-80 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute bottom-4 left-4 text-white">
                    <p className="font-medium">{video.nome_arquivo}</p>
                    <p className="text-sm opacity-80">
                      {video.duracao_segundos}s • {video.resolucao} • {video.formato}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {video.nome_arquivo}
                    </p>
                    <p className="text-sm text-gray-500">
                      {Math.round(video.tamanho_bytes / (1024 * 1024))} MB
                    </p>
                  </div>
                  <button className="ml-4 p-2 text-gray-400 hover:text-gray-600 transition-colors">
                    <ArrowDownTrayIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Documentos */}
      {consulta_imovel_internauta && documentos.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-6">
            <DocumentTextIcon className="h-6 w-6 text-purple-600 mr-2" />
            <h3 className="text-2xl font-bold text-gray-900">Documentos</h3>
            <span className="ml-2 text-sm text-gray-500">({documentos.length} documentos)</span>
          </div>
          
          <div className="space-y-3">
            {documentos.map((documento) => (
              <div 
                key={documento.id} 
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
              >
                <div className="flex items-center space-x-3">
                  <DocumentTextIcon className="h-8 w-8 text-blue-600" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {documento.nome_arquivo}
                    </p>
                    <p className="text-sm text-gray-500">
                      {documento.tipo_documento}
                    </p>
                    <p className="text-xs text-gray-400">
                      Enviado em {new Date(documento.data_upload).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {Math.round(documento.tamanho_bytes / 1024)} KB
                    </p>
                    <p className="text-xs text-gray-500">
                      {documento.tipo_mime}
                    </p>
                  </div>
                  <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors group-hover:bg-white rounded-lg">
                    <ArrowDownTrayIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Aviso sobre documentos não disponíveis */}
      {!consulta_imovel_internauta && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-center">
            <XCircleIcon className="h-6 w-6 text-yellow-600 mr-3" />
            <div>
              <h4 className="text-lg font-medium text-yellow-800">
                Documentos não disponíveis
              </h4>
              <p className="text-yellow-700 mt-1">
                Os documentos deste imóvel não estão disponíveis para consulta pública.
                Entre em contato com o corretor para mais informações.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Componente de Skeleton para carregamento
function SkeletonGaleriaDocumentos() {
  return (
    <div className="space-y-8">
      {/* Skeleton para Galeria de Imagens */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-6">
          <div className="h-6 w-6 bg-gray-300 rounded animate-pulse mr-2"></div>
          <div className="h-8 bg-gray-300 rounded animate-pulse w-48"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-48 bg-gray-300 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>

      {/* Skeleton para Vídeos */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-6">
          <div className="h-6 w-6 bg-gray-300 rounded animate-pulse mr-2"></div>
          <div className="h-8 bg-gray-300 rounded animate-pulse w-32"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="aspect-video bg-gray-300 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>

      {/* Skeleton para Documentos */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-6">
          <div className="h-6 w-6 bg-gray-300 rounded animate-pulse mr-2"></div>
          <div className="h-8 bg-gray-300 rounded animate-pulse w-40"></div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-gray-100 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 bg-gray-300 rounded animate-pulse"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-300 rounded animate-pulse w-48"></div>
                  <div className="h-3 bg-gray-300 rounded animate-pulse w-32"></div>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right space-y-1">
                  <div className="h-4 bg-gray-300 rounded animate-pulse w-12"></div>
                  <div className="h-3 bg-gray-300 rounded animate-pulse w-16"></div>
                </div>
                <div className="h-8 w-8 bg-gray-300 rounded animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
