import { MapPinIcon } from '@heroicons/react/24/outline'

// Função para retornar ícones por categoria
function getCategoriaIcon(categoria: string): JSX.Element {
  const icons: { [key: string]: string } = {
    'Comércio & Shopping': '🛍️',
    'Alimentação': '🍽️',
    'Saúde & Bem-estar': '🏥',
    'Educação': '📚',
    'Transporte': '🚌',
    'Lazer & Cultura': '🎭',
    'Serviços': '🛠️'
  }
  
  return <span className="text-xl mr-2">{icons[categoria] || '📍'}</span>
}

interface ProximidadesListaProps {
  proximidades: {
    por_categoria: Record<string, any[]>
    lista: any[]
  }
  loading: boolean
}

export default function ProximidadesLista({ 
  proximidades, 
  loading 
}: ProximidadesListaProps) {
  if (loading) {
    return <SkeletonProximidades />
  }

  return (
    <>
      {proximidades?.por_categoria && Object.keys(proximidades.por_categoria).length > 0 ? (
        <div className="space-y-6">
          {Object.entries(proximidades.por_categoria).map(([categoria, items]: [string, any]) => (
            <div key={categoria}>
              <h4 className="text-lg font-semibold text-gray-800 mb-3 border-b border-gray-200 pb-2 flex items-center">
                {getCategoriaIcon(categoria)}
                {categoria}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {items.map((item: any) => (
                  <div 
                    key={item.id} 
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{item.icone}</span>
                      <div className="flex-1 min-w-0">
                        {item.descricao && (
                          <p className="text-sm font-medium text-gray-700">
                            {item.descricao}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      {item.distancia_metros && item.distancia_metros > 0 && (
                        <p className="text-sm font-medium text-gray-900">
                          <span className="text-xs text-gray-500">Distância:</span> {item.distancia_metros}m
                        </p>
                      )}
                      {item.tempo_caminhada && item.tempo_caminhada > 0 && (
                        <p className="text-xs text-gray-500">
                          <span className="text-xs text-gray-400">Tempo de Caminhada:</span> {item.tempo_caminhada}min a pé
                        </p>
                      )}
                      {item.observacoes && (
                        <p className="text-xs text-blue-600 italic">
                          <span className="text-xs text-blue-500">Observações:</span> {item.observacoes}
                        </p>
                      )}
                      {item.popular && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                          Popular
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <MapPinIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">Nenhuma proximidade cadastrada</p>
          <p className="text-gray-400 text-sm mt-2">
            Este imóvel ainda não possui proximidades cadastradas
          </p>
        </div>
      )}
    </>
  )
}

// Componente de Skeleton para carregamento
function SkeletonProximidades() {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center mb-6">
        <div className="h-6 w-6 bg-gray-300 rounded animate-pulse mr-2"></div>
        <div className="h-8 bg-gray-300 rounded animate-pulse w-48"></div>
      </div>
      <div className="space-y-6">
        {[1, 2].map((categoria) => (
          <div key={categoria}>
            <div className="h-6 bg-gray-300 rounded animate-pulse w-32 mb-3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="flex items-center justify-between p-4 bg-gray-100 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="h-6 w-6 bg-gray-300 rounded animate-pulse"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-300 rounded animate-pulse w-24 mb-1"></div>
                      <div className="h-3 bg-gray-300 rounded animate-pulse w-20"></div>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="h-4 bg-gray-300 rounded animate-pulse w-12"></div>
                    <div className="h-3 bg-gray-300 rounded animate-pulse w-16"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
