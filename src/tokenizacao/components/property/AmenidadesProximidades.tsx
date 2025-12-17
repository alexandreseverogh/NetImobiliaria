import { StarIcon, MapPinIcon } from '@heroicons/react/24/outline'

interface AmenidadesProximidadesProps {
  amenidades?: {
    por_categoria?: Record<string, any[]>
    lista?: any[]
  }
  proximidades?: {
    por_categoria?: Record<string, any[]>
    lista?: any[]
  }
  loading: boolean
}

export default function AmenidadesProximidades({ 
  amenidades, 
  proximidades, 
  loading 
}: AmenidadesProximidadesProps) {
  if (loading) {
    return <SkeletonAmenidadesProximidades />
  }

  // Verificações de segurança para evitar erros de undefined
  const amenidadesData = amenidades?.por_categoria || {}
  const proximidadesData = proximidades?.por_categoria || {}

  return (
    <div className="space-y-8">
      {/* Amenidades */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-6">
          <StarIcon className="h-6 w-6 text-green-600 mr-2" />
          <h3 className="text-2xl font-bold text-gray-900">Amenidades</h3>
        </div>
        
        {Object.keys(amenidadesData).length > 0 ? (
          <div className="space-y-6">
            {Object.entries(amenidadesData).map(([categoria, items]: [string, any]) => (
              <div key={categoria}>
                <h4 className="text-lg font-semibold text-gray-800 mb-3 border-b border-gray-200 pb-2">
                  {categoria}
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {items.map((item: any) => (
                    <div 
                      key={item.id} 
                      className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <span className="text-2xl">{item.icone}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-700 truncate">
                          {item.nome}
                        </p>
                        {item.descricao && (
                          <p className="text-xs text-gray-500 truncate">
                            {item.descricao}
                          </p>
                        )}
                      </div>
                      {item.popular && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                          Popular
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <StarIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">Nenhuma amenidade cadastrada</p>
            <p className="text-gray-400 text-sm mt-2">
              Este imóvel ainda não possui amenidades cadastradas
            </p>
          </div>
        )}
      </div>

      {/* Proximidades */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-6">
          <MapPinIcon className="h-6 w-6 text-red-600 mr-2" />
          <h3 className="text-2xl font-bold text-gray-900">Proximidades</h3>
        </div>
        
        {Object.keys(proximidadesData).length > 0 ? (
          <div className="space-y-6">
            {Object.entries(proximidadesData).map(([categoria, items]: [string, any]) => (
              <div key={categoria}>
                <h4 className="text-lg font-semibold text-gray-800 mb-3 border-b border-gray-200 pb-2">
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
                          <p className="text-sm font-medium text-gray-700">
                            {item.nome}
                          </p>
                          {item.descricao && (
                            <p className="text-xs text-gray-500">
                              {item.descricao}
                            </p>
                          )}
                          {item.observacoes && (
                            <p className="text-xs text-blue-600 mt-1">
                              {item.observacoes}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        {item.distancia_metros && (
                          <p className="text-sm font-medium text-gray-900">
                            {item.distancia_metros}m
                          </p>
                        )}
                        {item.tempo_caminhada && (
                          <p className="text-xs text-gray-500">
                            {item.tempo_caminhada}min a pé
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
      </div>
    </div>
  )
}

// Componente de Skeleton para carregamento
function SkeletonAmenidadesProximidades() {
  return (
    <div className="space-y-8">
      {/* Skeleton para Amenidades */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-6">
          <div className="h-6 w-6 bg-gray-300 rounded animate-pulse mr-2"></div>
          <div className="h-8 bg-gray-300 rounded animate-pulse w-48"></div>
        </div>
        <div className="space-y-6">
          {[1, 2].map((categoria) => (
            <div key={categoria}>
              <div className="h-6 bg-gray-300 rounded animate-pulse w-32 mb-3"></div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {[1, 2, 3, 4].map((item) => (
                  <div key={item} className="flex items-center space-x-3 p-3 bg-gray-100 rounded-lg">
                    <div className="h-6 w-6 bg-gray-300 rounded animate-pulse"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-300 rounded animate-pulse w-20 mb-1"></div>
                      <div className="h-3 bg-gray-300 rounded animate-pulse w-16"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Skeleton para Proximidades */}
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
    </div>
  )
}

