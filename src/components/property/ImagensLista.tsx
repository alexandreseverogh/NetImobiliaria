import { 
  EyeIcon, 
  PhotoIcon
} from '@heroicons/react/24/outline'
import { useState } from 'react'
import SafeImage from '@/components/common/SafeImage'

interface ImagensListaProps {
  imagens: any[]
  loading: boolean
}

export default function ImagensLista({ 
  imagens, 
  loading 
}: ImagensListaProps) {
  const [imagemSelecionada, setImagemSelecionada] = useState<number | null>(null)

  // Filtrar imagens excluindo a principal (que já é exibida no topo da página)
  const imagensSecundarias = imagens.filter(imagem => !imagem.principal)

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Carregando imagens...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {imagensSecundarias.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {imagensSecundarias.map((imagem, index) => (
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
          <p className="text-gray-500 text-lg">Nenhuma imagem adicional disponível</p>
          <p className="text-gray-400 text-sm mt-2">
            Este imóvel possui apenas a imagem principal exibida acima
          </p>
        </div>
      )}

      {/* Modal de Visualização de Imagem Ampliada */}
      {imagemSelecionada !== null && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
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
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            {/* Contador de imagens */}
            <div className="absolute top-4 left-4 bg-black bg-opacity-70 text-white px-4 py-2 rounded-full text-sm font-medium z-10">
              {imagemSelecionada + 1} de {imagensSecundarias.length}
            </div>
            
            {/* Container da imagem - ocupa quase toda a tela */}
            <div className="relative w-full h-full flex items-center justify-center">
              <img
                src={imagensSecundarias[imagemSelecionada].url}
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
            {imagensSecundarias.length > 1 && (
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
                {imagemSelecionada < imagensSecundarias.length - 1 && (
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
    </div>
  )
}
