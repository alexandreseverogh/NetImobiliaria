import { StarIcon } from '@heroicons/react/24/outline'

// Função para retornar ícones por categoria
function getCategoriaIcon(categoria: string): JSX.Element {
  const icons: { [key: string]: string } = {
    'Lazer & Entretenimento': '🎉',
    'Esporte & Saúde': '🏃‍♂️',
    'Segurança': '🛡️',
    'Conveniência & Serviços': '🛎️',
    'Verde & Sustentabilidade': '🌿',
    'Tecnologia & Conectividade': '📱',
    'Bem-estar & Relaxamento': '🧘‍♀️',
    'Públicos Especiais': '👥',
    'Estrutura & Arquitetura': '🏗️'
  }

  return <span className="text-xl mr-2">{icons[categoria] || '🏠'}</span>
}

interface AmenidadesListaProps {
  amenidades: {
    por_categoria: Record<string, any[]>
    lista: any[]
  }
  loading: boolean
}

export default function AmenidadesLista({
  amenidades,
  loading
}: AmenidadesListaProps) {
  if (loading) {
    return <SkeletonAmenidades />
  }

  return (
    <>
      {amenidades?.por_categoria && Object.keys(amenidades.por_categoria).length > 0 ? (
        <div className="space-y-2">
          {Object.entries(amenidades.por_categoria).map(([categoria, items]: [string, any]) => (
            <div key={categoria}>
              <h4 className="text-lg font-semibold text-gray-800 mb-1 border-b border-gray-200 pb-1 flex items-center">
                {getCategoriaIcon(categoria)}
                {categoria}
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1">
                {items.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex items-center space-x-2 p-1.5 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <span className="text-xl">{item.icone}</span>
                    <div className="flex-1 min-w-0">
                      {item.descricao && (
                        <p className="text-sm font-medium text-gray-700 truncate leading-tight">
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
    </>
  )
}

// Componente de Skeleton para carregamento
function SkeletonAmenidades() {
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
  )
}
