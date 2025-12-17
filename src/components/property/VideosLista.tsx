import { 
  VideoCameraIcon,
  PlayIcon
} from '@heroicons/react/24/outline'
import { useState } from 'react'
import SafeImage from '@/components/common/SafeImage'

interface VideosListaProps {
  videos: any[]
  loading: boolean
}

export default function VideosLista({ 
  videos, 
  loading 
}: VideosListaProps) {
  const [videoSelecionado, setVideoSelecionado] = useState<number | null>(null)

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Carregando vídeos...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {videos.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {videos.map((video, index) => (
            <div
              key={video.id}
              className="relative group cursor-pointer bg-black rounded-lg overflow-hidden"
              onClick={() => setVideoSelecionado(index)}
            >
              <div className="aspect-video relative">
                <SafeImage
                  src={video.thumbnail || video.url}
                  alt={`Vídeo ${index + 1}`}
                  fill
                  className="object-cover"
                  unoptimized
                />
                <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
                  <div className="bg-white bg-opacity-90 rounded-full p-4 group-hover:bg-opacity-100 transition-all">
                    <PlayIcon className="h-8 w-8 text-gray-800" />
                  </div>
                </div>
                <div className="absolute bottom-4 left-4 text-white">
                  <p className="font-medium">{video.nome_arquivo || `Vídeo ${index + 1}`}</p>
                  <p className="text-sm opacity-75">
                    {video.duracao_segundos}s • {video.resolucao} • {video.formato}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <VideoCameraIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">Nenhum vídeo disponível</p>
          <p className="text-gray-400 text-sm mt-2">
            Este imóvel ainda não possui vídeos cadastrados
          </p>
        </div>
      )}

      {/* Modal de Visualização de Vídeo */}
      {videoSelecionado !== null && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
          onClick={() => setVideoSelecionado(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full">
            <video
              src={videos[videoSelecionado].url}
              controls
              className="w-full h-full rounded-lg"
              autoPlay
            >
              Seu navegador não suporta a reprodução de vídeo.
            </video>
            <button
              onClick={() => setVideoSelecionado(null)}
              className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}




