import { 
  MapPinIcon, 
  HomeIcon, 
  CurrencyDollarIcon,
  CalendarIcon,
  StarIcon,
  CheckCircleIcon,
  XCircleIcon,
  PhotoIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'

interface ImovelBasico {
  id: number
  codigo: string
  titulo: string
  descricao: string
  preco: number
  area_total: number
  quartos: number
  banheiros: number
  suites: number
  vagas_garagem: number
  bairro: string
  endereco: string
  tipo_nome: string
  finalidade_nome: string
  status_nome: string
  status_cor: string
  imagem_principal: any
  total_imagens: number
  total_amenidades: number
  total_proximidades: number
  total_documentos: number
  consulta_imovel_internauta: boolean
}

interface DadosBasicosProps {
  imovel: ImovelBasico
  loading: boolean
  formatarPreco: (preco: number) => string
  formatarData: (data: string) => string
}

export default function DadosBasicos({ 
  imovel, 
  loading, 
  formatarPreco, 
  formatarData 
}: DadosBasicosProps) {
  if (loading) {
    return <SkeletonDadosBasicos />
  }

  return (
    <div className="space-y-8">
      {/* Informações principais */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Informações do Imóvel</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="flex items-center space-x-3">
            <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
            <div>
              <p className="text-sm text-gray-500">Preço</p>
              <p className="text-lg font-semibold text-gray-900">{formatarPreco(imovel.preco)}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <HomeIcon className="h-6 w-6 text-blue-600" />
            <div>
              <p className="text-sm text-gray-500">Tipo</p>
              <p className="text-lg font-semibold text-gray-900">{imovel.tipo_nome}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <MapPinIcon className="h-6 w-6 text-red-600" />
            <div>
              <p className="text-sm text-gray-500">Bairro</p>
              <p className="text-lg font-semibold text-gray-900">{imovel.bairro}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="h-6 w-6 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-sm font-bold text-purple-600">Q</span>
            </div>
            <div>
              <p className="text-sm text-gray-500">Quartos</p>
              <p className="text-lg font-semibold text-gray-900">{imovel.quartos}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="h-6 w-6 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-sm font-bold text-blue-600">B</span>
            </div>
            <div>
              <p className="text-sm text-gray-500">Banheiros</p>
              <p className="text-lg font-semibold text-gray-900">{imovel.banheiros}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="h-6 w-6 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-sm font-bold text-green-600">A</span>
            </div>
            <div>
              <p className="text-sm text-gray-500">Área Total</p>
              <p className="text-lg font-semibold text-gray-900">{imovel.area_total} m²</p>
            </div>
          </div>
        </div>
      </div>

      {/* Descrição */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Descrição</h3>
        <p className="text-gray-700 leading-relaxed">{imovel.descricao}</p>
      </div>

      {/* Status e finalidade */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Status e Finalidade</h3>
        <div className="flex items-center space-x-4">
          <span 
            className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
            style={{ backgroundColor: imovel.status_cor + '20', color: imovel.status_cor }}
          >
            <CheckCircleIcon className="h-4 w-4 mr-1" />
            {imovel.status_nome}
          </span>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
            {imovel.finalidade_nome}
          </span>
        </div>
      </div>

      {/* Contadores para carregamento progressivo */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">Conteúdo Disponível</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <PhotoIcon className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <p className="text-sm text-blue-700">{imovel.total_imagens} Imagens</p>
          </div>
          <div className="text-center">
            <StarIcon className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className="text-sm text-green-700">{imovel.total_amenidades} Amenidades</p>
          </div>
          <div className="text-center">
            <MapPinIcon className="h-8 w-8 text-red-600 mx-auto mb-2" />
            <p className="text-sm text-red-700">{imovel.total_proximidades} Proximidades</p>
          </div>
          <div className="text-center">
            <DocumentTextIcon className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <p className="text-sm text-purple-700">{imovel.total_documentos} Documentos</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Componente de Skeleton para carregamento
function SkeletonDadosBasicos() {
  return (
    <div className="space-y-8">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="h-8 bg-gray-300 rounded animate-pulse w-1/3 mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center space-x-3">
              <div className="h-6 w-6 bg-gray-300 rounded animate-pulse"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-300 rounded animate-pulse w-16"></div>
                <div className="h-6 bg-gray-300 rounded animate-pulse w-24"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <div className="h-6 bg-gray-300 rounded animate-pulse w-1/4 mb-4"></div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-300 rounded animate-pulse w-full"></div>
          <div className="h-4 bg-gray-300 rounded animate-pulse w-3/4"></div>
          <div className="h-4 bg-gray-300 rounded animate-pulse w-1/2"></div>
        </div>
      </div>
    </div>
  )
}







