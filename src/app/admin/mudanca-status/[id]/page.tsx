'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  MapPinIcon, 
  HomeIcon, 
  CurrencyDollarIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  UserIcon,
  EyeIcon,
  StarIcon,
  CheckCircleIcon,
  XCircleIcon,
  BuildingOffice2Icon
} from '@heroicons/react/24/outline'
import { Square, Car } from 'lucide-react'
import useFichaCompleta from '@/hooks/useFichaCompleta'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import SafeImage from '@/components/common/SafeImage'

interface StatusImovel {
  id: number
  nome: string
  cor: string
}

export default function MudancaStatusImovel() {
  const { get, post, put, delete: del } = useAuthenticatedFetch()
  const params = useParams()
  const router = useRouter()
  const imovelId = params.id as string
  
  const {
    dadosBasicos,
    loading,
    error
  } = useFichaCompleta(imovelId)

  const [statusImovel, setStatusImovel] = useState<StatusImovel[]>([])
  const [statusSelecionado, setStatusSelecionado] = useState<string>('')
  const [salvando, setSalvando] = useState(false)

  // Carregar lista de status
  const carregarStatus = useCallback(async () => {
    try {
      const response = await get('/api/admin/status-imovel')
      const data = await response.json()
      if (data.success) {
        setStatusImovel(data.data)
      }
    } catch (error) {
      console.error('Erro ao carregar status:', error)
    }
  }, [get])

  useEffect(() => {
    carregarStatus()
  }, [carregarStatus])

  // Função para salvar o novo status
  const handleConfirmarStatus = async () => {
    if (!statusSelecionado) {
      alert('Por favor, selecione um status')
      return
    }

    setSalvando(true)
    try {
      const response = await put(`/api/admin/imoveis/${imovelId}`, {
          status_fk: parseInt(statusSelecionado)
      })

      if (response.ok) {
        alert('Status atualizado com sucesso!')
        router.push('/admin/imoveis')
      } else {
        alert('Erro ao atualizar status')
      }
    } catch (error) {
      console.error('Erro ao salvar status:', error)
      alert('Erro ao atualizar status')
    } finally {
      setSalvando(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded mb-6"></div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <XCircleIcon className="h-12 w-12 mx-auto" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Erro ao carregar imóvel</h2>
          <p className="text-gray-600 mb-4">{String(error)}</p>
          <button
            onClick={() => router.push('/admin/imoveis')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Voltar para Imóveis
          </button>
        </div>
      </div>
    )
  }

  if (!dadosBasicos) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Imóvel não encontrado</h2>
          <button
            onClick={() => router.push('/admin/imoveis')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Voltar para Imóveis
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Título e Código */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{dadosBasicos.titulo}</h1>
          <p className="text-lg text-gray-600">Código do Imóvel: {dadosBasicos.id}</p>
        </div>

        {/* Imagem Principal */}
        <div className="flex justify-center mb-8">
          <div className="relative max-w-xl w-full h-80 rounded-t-xl overflow-hidden shadow-2xl">
            <SafeImage
              src={typeof dadosBasicos.imagem_principal === 'string' ? dadosBasicos.imagem_principal : dadosBasicos.imagem_principal?.url || undefined}
              alt={dadosBasicos.titulo || 'Imagem do imóvel'}
              fill
              className="object-cover"
              unoptimized
            />
            
            {/* Badges dentro da imagem */}
            <div className="absolute top-4 left-4">
              <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                {dadosBasicos.tipo_nome}
              </span>
            </div>
            <div className="absolute top-4 right-4">
              <span className="bg-green-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                {dadosBasicos.finalidade_nome}
              </span>
            </div>
          </div>
        </div>

        {/* Informações do Imóvel */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            
            {/* Preço */}
            <div className="text-center mb-6">
              <div className="text-4xl font-bold text-blue-600 mb-2">
                {dadosBasicos.preco ? `R$ ${dadosBasicos.preco.toLocaleString('pt-BR')}` : 'Preço sob consulta'}
              </div>
            </div>

            {/* Descrição */}
            <div className="mb-6">
              <p className="text-gray-900 leading-relaxed">{dadosBasicos.descricao}</p>
            </div>

            {/* Localização */}
            <div className="flex items-center mb-4">
              <MapPinIcon className="w-5 h-5 mr-2 text-gray-400" />
              <span className="text-gray-700">
                {dadosBasicos.estado_fk}, {dadosBasicos.cidade_fk} - {dadosBasicos.endereco}
                {dadosBasicos.numero && `, ${dadosBasicos.numero}`}
                {dadosBasicos.cep && ` - CEP: ${dadosBasicos.cep}`}
                {dadosBasicos.complemento && `, ${dadosBasicos.complemento}`}
              </span>
            </div>

            {/* Características */}
            <div className="flex flex-wrap items-center gap-6 mb-4">
              <div className="flex items-center mr-1">
                <HomeIcon className="w-5 h-5 mr-2 text-gray-400" />
                <span className="text-gray-700">{dadosBasicos.quartos} quartos</span>
              </div>
              
              {dadosBasicos.suites > 0 && (
                <div className="flex items-center mr-1">
                  <StarIcon className="w-5 h-5 mr-2 text-gray-400" />
                  <span className="text-gray-700">{dadosBasicos.suites} suíte(s)</span>
                </div>
              )}
              
              <div className="flex items-center mr-1">
                <BuildingOfficeIcon className="w-5 h-5 mr-2 text-gray-400" />
                <span className="text-gray-700">{dadosBasicos.banheiros} banheiro(s)</span>
              </div>
              
              {dadosBasicos.varanda && (
                <div className="flex items-center mr-1">
                  <BuildingOffice2Icon className="w-5 h-5 mr-2 text-gray-400" />
                  <span className="text-gray-700">Varanda</span>
                </div>
              )}
              
              <div className="flex items-center mr-1">
                <Car className="w-6 h-6 mr-2 text-gray-400" />
                <span className="text-gray-700">{dadosBasicos.vagas_garagem} vaga(s)</span>
              </div>
            </div>

            {/* Áreas */}
            <div className="flex flex-wrap items-center gap-6 mb-4">
              {dadosBasicos.area_total > 0 && (
                <div className="flex items-center mr-1">
                  <Square className="w-5 h-5 mr-2 text-gray-400" />
                  <span className="text-gray-700">{dadosBasicos.area_total}m² total</span>
                </div>
              )}
              
              {(dadosBasicos.area_construida || 0) > 0 && (
                <div className="flex items-center mr-1">
                  <Square className="w-5 h-5 mr-2 text-gray-400" />
                  <span className="text-gray-700">{dadosBasicos.area_construida}m² construída</span>
                </div>
              )}
              
              {(dadosBasicos.andar || 0) > 0 && (
                <div className="flex items-center mr-1">
                  <BuildingOfficeIcon className="w-5 h-5 mr-2 text-gray-400" />
                  <span className="text-gray-700">{dadosBasicos.andar}° andar</span>
                </div>
              )}
              
              {(dadosBasicos.total_andares || 0) > 0 && (
                <div className="flex items-center mr-1">
                  <BuildingOfficeIcon className="w-5 h-5 mr-2 text-gray-400" />
                  <span className="text-gray-700">{dadosBasicos.total_andares} andares</span>
                </div>
              )}
            </div>

            {/* Aceita Permuta/Financiamento */}
            <div className="flex flex-wrap gap-2 mb-6">
              {dadosBasicos.aceita_permuta && (
                <span className="bg-gray-700 text-white px-3 py-1 rounded-full text-sm">
                  Aceita Permuta
                </span>
              )}
              {dadosBasicos.aceita_financiamento && (
                <span className="bg-gray-700 text-white px-3 py-1 rounded-full text-sm">
                  Aceita Financiamento
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Seção de Mudança de Status */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            
            {/* Status Atual */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Status Atual</h3>
              <div className="flex items-center">
                <div 
                  className="w-4 h-4 rounded-full mr-3"
                  style={{ backgroundColor: dadosBasicos.status_cor || '#6B7280' }}
                ></div>
                <span className="text-lg font-medium text-gray-900">
                  {dadosBasicos.status_nome || 'Status não definido'}
                </span>
              </div>
            </div>

            {/* Seleção de Novo Status */}
            <div className="mb-6">
              <label htmlFor="novoStatus" className="block text-sm font-medium text-gray-700 mb-2">
                Novo Status
              </label>
              <select
                id="novoStatus"
                value={statusSelecionado}
                onChange={(e) => setStatusSelecionado(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Selecione um novo status</option>
                {statusImovel.map((status) => (
                  <option key={status.id} value={status.id}>
                    {status.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* Botão Confirmar */}
            <div className="flex justify-center">
              <button
                onClick={handleConfirmarStatus}
                disabled={salvando || !statusSelecionado}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-colors flex items-center"
              >
                {salvando ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Salvando...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="w-5 h-5 mr-2" />
                    Confirmar Status
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Botão Voltar */}
        <div className="max-w-4xl mx-auto mt-8 text-center">
          <button
            onClick={() => router.push('/admin/imoveis')}
            className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg"
          >
            Voltar para Lista de Imóveis
          </button>
        </div>
      </div>
    </div>
  )
}
