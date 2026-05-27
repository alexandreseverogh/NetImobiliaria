'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { 
  MagnifyingGlassIcon, 
  EyeIcon, 
  PencilIcon,
  MapPinIcon,
  HomeIcon,
  BuildingOfficeIcon,
  StarIcon,
  BuildingOffice2Icon,
  CheckCircleIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'
import { Square, Car } from 'lucide-react'
import { useEstadosCidades } from '@/hooks/useEstadosCidades'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import SafeImage from '@/components/common/SafeImage'

interface Imovel {
  id: number
  codigo: string
  titulo: string
  status_fk: number
  status_nome: string
  status_cor: string
  tipo_nome: string
  finalidade_nome: string
  preco: number
  cidade_fk: string
  estado_fk: string
  created_at: string
}


interface StatusImovel {
  id: number
  nome: string
  cor: string
}

export default function MudancasStatusPage() {
  const router = useRouter()
  const { get, put } = useAuthenticatedFetch()
  const [codigo, setCodigo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusImovel, setStatusImovel] = useState<StatusImovel[]>([])
  const [statusSelecionado, setStatusSelecionado] = useState<string>('')
  const [salvando, setSalvando] = useState(false)
  
  // Estados para controle da busca
  const [dadosBasicos, setDadosBasicos] = useState<any>(null)
  const [loadingImovel, setLoadingImovel] = useState(false)
  const [errorImovel, setErrorImovel] = useState<string | null>(null)
  
  // Estados para histórico de status
  const [historicoStatus, setHistoricoStatus] = useState<any[]>([])
  const [loadingHistorico, setLoadingHistorico] = useState(false)
  
  // Hook para estados e cidades
  const { getEstadoNome, estados } = useEstadosCidades()

  // Carregar lista de status
  const carregarStatus = useCallback(async () => {
    try {
      console.log('📡 Fazendo requisição para /api/admin/status-imovel...')
      const response = await get('/api/admin/status-imovel')
      console.log('📡 Response status:', response.status, response.ok)
      
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('📡 Dados recebidos:', data)
      
      // A API retorna um objeto com 'value' contendo o array
      const statusList = data.value || data
      console.log('📡 StatusList extraído:', statusList)
      console.log('📡 É array?', Array.isArray(statusList))
      console.log('📡 Length:', statusList?.length)
      
      // Verificar se é um array válido
      if (Array.isArray(statusList)) {
        setStatusImovel(statusList)
      } else {
        console.error('❌ ERRO: Dados de status não são um array válido:', statusList)
        setStatusImovel([])
      }
    } catch (error) {
      console.error('❌ ERRO ao carregar status:', error)
      setStatusImovel([])
    }
  }, [get])

  useEffect(() => {
    console.log('🚀 INICIANDO CARREGAMENTO DE STATUS...')
    carregarStatus()
  }, [carregarStatus])

  const handleSearch = async () => {
    if (!codigo.trim()) {
      setError('Por favor, informe o código do imóvel')
      return
    }

    setError(null)
    setErrorImovel(null)
    setDadosBasicos(null)
    setStatusSelecionado('')
    setLoadingImovel(true)

    try {
      console.log('🔍 Buscando imóvel com código:', codigo)
      const response = await get(`/api/admin/imoveis/by-codigo/${codigo}`)
      const result = await response.json()
      
      if (response.ok && result.success) {
        console.log('✅ Imóvel encontrado:', result.imovel)
        setDadosBasicos(result.imovel)
        
        // Carregar histórico de status
        await carregarHistoricoStatus(result.imovel.id)
      } else {
        console.error('❌ Imóvel não encontrado - Status:', response.status)
        setErrorImovel('Imóvel não encontrado com o código informado')
      }
    } catch (error) {
      console.error('❌ Erro ao buscar imóvel:', error)
      setErrorImovel('Erro ao buscar imóvel')
    } finally {
      setLoadingImovel(false)
    }
  }
  
  // Função para carregar histórico de status
  const carregarHistoricoStatus = async (imovelId: number) => {
    setLoadingHistorico(true)
    try {
      console.log('🔍 Buscando histórico de status para imóvel:', imovelId)
      const response = await get(`/api/admin/imoveis/historico-status/${imovelId}`)
      const result = await response.json()
      
      console.log('📡 Resposta da API de histórico:', result)
      
      if (response.ok && result.success) {
        console.log('✅ Histórico carregado:', result.historico)
        setHistoricoStatus(result.historico)
        console.log('📊 Total de registros no histórico:', result.historico.length)
      } else {
        console.error('❌ Erro na resposta da API:', result)
        setHistoricoStatus([])
      }
    } catch (error) {
      console.error('❌ Erro ao carregar histórico:', error)
      setHistoricoStatus([])
    } finally {
      setLoadingHistorico(false)
    }
  }


  // Função para salvar o novo status
  const handleConfirmarStatus = async () => {
    if (!statusSelecionado) {
      alert('Por favor, selecione um status')
      return
    }

    setSalvando(true)
    try {
      // Debug: verificar dados do imóvel
      console.log('🔍 Dados do imóvel:', dadosBasicos)
      console.log('🔍 tipo_fk:', dadosBasicos?.tipo_fk)
      console.log('🔍 finalidade_fk:', dadosBasicos?.finalidade_fk)
      console.log('🔍 estado_fk:', dadosBasicos?.estado_fk)

      // Preparar dados para atualizar apenas o status_fk
      const dadosAtualizacao = {
        status_fk: parseInt(statusSelecionado)
      }

      console.log('📤 Enviando apenas status_fk:', dadosAtualizacao)

      const response = await put(`/api/admin/imoveis/${dadosBasicos.id}`, dadosAtualizacao)
      
      console.log('📡 Resposta da API - Status:', response.status)
      console.log('📡 Resposta da API - OK?:', response.ok)
      
      const responseData = await response.json()
      console.log('📡 Resposta da API - Dados:', responseData)

      if (response.ok) {
        alert('Status atualizado com sucesso!')
        // Recarregar histórico de status
        console.log('🔄 Recarregando histórico após salvar...')
        await carregarHistoricoStatus(dadosBasicos.id)
        // Limpar seleção
        setStatusSelecionado('')
      } else {
        console.error('❌ Erro na resposta da API:', responseData)
        alert('Erro ao atualizar status: ' + (responseData.error || 'Erro desconhecido'))
      }
    } catch (error) {
      console.error('Erro ao salvar status:', error)
      alert('Erro ao atualizar status')
    } finally {
      setSalvando(false)
    }
  }

  const handleClear = () => {
    setCodigo('')
    setError(null)
    setErrorImovel(null)
    setDadosBasicos(null)
    setStatusSelecionado('')
  }


  if (loadingImovel) {
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

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Cabeçalho */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Mudança de Status</h1>
          <p className="text-gray-600 mt-2">
            Gerencie o status dos imóveis do sistema.
          </p>
        </div>


        {/* Busca por Código */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Buscar Imóvel por Código</h2>
          <div className="flex gap-4 items-end">
            <div className="w-48">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Código do Imóvel
              </label>
              <input
                type="text"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="Digite o código..."
                maxLength={10}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleSearch}
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 flex items-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Buscando...
                  </>
                ) : (
                  <>
                    <MagnifyingGlassIcon className="h-4 w-4 mr-2" />
                    Buscar
                  </>
                )}
              </button>
              <button
                onClick={handleClear}
                className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
              >
                Limpar
              </button>
            </div>
          </div>
          
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Visualização do Imóvel */}
        {dadosBasicos && (
          <div className="bg-white min-h-screen">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              
              {/* Título e Código */}
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{dadosBasicos.titulo}</h1>
                <p className="text-lg text-gray-600">Código do Imóvel: {dadosBasicos.id}</p>
              </div>

              {/* Dois Containers Lado a Lado (igual à página pública) */}
              <div className="grid grid-cols-2 gap-6 mb-10" style={{ maxWidth: '1400px', margin: '0 auto' }}>
                {/* Container Esquerdo - Imagem */}
                <div className="relative bg-white rounded-xl shadow-lg border-2 border-gray-400 p-6 overflow-hidden" style={{ height: '350px' }}>
                  <div className="relative w-full h-full rounded-lg overflow-hidden">
                    {dadosBasicos.imagem_principal?.url ? (
                      <SafeImage
                        src={dadosBasicos.imagem_principal.url}
                        alt={dadosBasicos.titulo || 'Imagem do imóvel'}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                        <div className="text-center">
                          <EyeIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-500 font-medium">Imagem Principal</p>
                          <p className="text-gray-400 text-sm">Não disponível</p>
                        </div>
                      </div>
                    )}
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

                {/* Container Direito - Informações */}
                <div className="bg-white rounded-xl shadow-lg border-2 border-gray-400 p-6 overflow-y-auto" style={{ height: '350px' }}>
                  {/* Preço */}
                  <div className="mb-2">
                    <span className="text-2xl font-bold text-blue-600">
                      {dadosBasicos.preco ? `R$ ${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(dadosBasicos.preco))}` : 'Preço sob consulta'}
                    </span>
                  </div>

                  {/* Descrição */}
                  {dadosBasicos.descricao && (
                    <div className="mb-2">
                      <p className="text-gray-900 leading-tight text-sm">{dadosBasicos.descricao}</p>
                    </div>
                  )}

                  {/* Localização */}
                  <div className="mb-2 flex items-center text-sm">
                    <MapPinIcon className="w-5 h-5 mr-2 text-gray-400" />
                    <span className="text-gray-700">
                      {(() => {
                        const estado = estados.find(e => e.sigla === dadosBasicos.estado_fk)
                        const estadoNome = estado?.nome || ''
                        return estadoNome
                      })()} • {dadosBasicos.cidade_fk} • {dadosBasicos.endereco}, {dadosBasicos.numero} • CEP: {dadosBasicos.cep}
                      {dadosBasicos.complemento && ` • ${dadosBasicos.complemento}`}
                    </span>
                  </div>

                  {/* Características, Custos e Áreas em Grid */}
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    {/* Coluna 1 - Características */}
                    <div className="space-y-1">
                      {dadosBasicos.quartos !== null && dadosBasicos.quartos !== undefined && (
                        <div className="flex items-center text-xs">
                          <HomeIcon className="w-3.5 h-3.5 mr-1 text-blue-500 flex-shrink-0" />
                          <span className="text-gray-700 truncate">{dadosBasicos.quartos} quartos</span>
                        </div>
                      )}
                      {dadosBasicos.suites !== null && dadosBasicos.suites !== undefined && dadosBasicos.suites > 0 && (
                        <div className="flex items-center text-xs">
                          <StarIcon className="w-3.5 h-3.5 mr-1 text-purple-500 flex-shrink-0" />
                          <span className="text-gray-700 truncate">{dadosBasicos.suites} suítes</span>
                        </div>
                      )}
                      {dadosBasicos.banheiros !== null && dadosBasicos.banheiros !== undefined && (
                        <div className="flex items-center text-xs">
                          <BuildingOfficeIcon className="w-3.5 h-3.5 mr-1 text-cyan-500 flex-shrink-0" />
                          <span className="text-gray-700 truncate">{dadosBasicos.banheiros} banheiros</span>
                        </div>
                      )}
                      {dadosBasicos.varanda !== null && dadosBasicos.varanda !== undefined && dadosBasicos.varanda > 0 && (
                        <div className="flex items-center text-xs">
                          <BuildingOffice2Icon className="w-3.5 h-3.5 mr-1 text-green-500 flex-shrink-0" />
                          <span className="text-gray-700 truncate">Varanda</span>
                        </div>
                      )}
                      {dadosBasicos.vagas_garagem !== null && dadosBasicos.vagas_garagem !== undefined && (
                        <div className="flex items-center text-xs">
                          <Car className="w-3.5 h-3.5 mr-1 text-orange-500 flex-shrink-0" />
                          <span className="text-gray-700 truncate">{dadosBasicos.vagas_garagem} garagem</span>
                        </div>
                      )}
                    </div>

                    {/* Coluna 2 - Custos */}
                    <div className="space-y-1">
                      {dadosBasicos.preco_condominio && (
                        <div className="flex items-center text-xs">
                          <DocumentTextIcon className="w-3.5 h-3.5 mr-1 text-emerald-500 flex-shrink-0" />
                          <span className="text-gray-700 truncate">Condomínio: R$ {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(Number(dadosBasicos.preco_condominio))}</span>
                        </div>
                      )}
                      {dadosBasicos.preco_iptu && (
                        <div className="flex items-center text-xs">
                          <DocumentTextIcon className="w-3.5 h-3.5 mr-1 text-emerald-600 flex-shrink-0" />
                          <span className="text-gray-700 truncate">IPTU: R$ {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(Number(dadosBasicos.preco_iptu))}</span>
                        </div>
                      )}
                      {dadosBasicos.taxa_extra && (
                        <div className="flex items-center text-xs">
                          <DocumentTextIcon className="w-3.5 h-3.5 mr-1 text-emerald-700 flex-shrink-0" />
                          <span className="text-gray-700 truncate">Taxa Extra: R$ {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(Number(dadosBasicos.taxa_extra))}</span>
                        </div>
                      )}
                    </div>

                    {/* Coluna 3 - Áreas e Andares */}
                    <div className="space-y-1">
                      {dadosBasicos.area_total !== null && dadosBasicos.area_total !== undefined && dadosBasicos.area_total > 0 && (
                        <div className="flex items-center text-xs">
                          <Square className="w-3.5 h-3.5 mr-1 text-indigo-500 flex-shrink-0" />
                          <span className="text-gray-700 truncate">{dadosBasicos.area_total}m² total</span>
                        </div>
                      )}
                      {dadosBasicos.area_construida !== null && dadosBasicos.area_construida !== undefined && dadosBasicos.area_construida > 0 && (
                        <div className="flex items-center text-xs">
                          <Square className="w-3.5 h-3.5 mr-1 text-indigo-600 flex-shrink-0" />
                          <span className="text-gray-700 truncate">{dadosBasicos.area_construida}m² const.</span>
                        </div>
                      )}
                      {dadosBasicos.andar !== null && dadosBasicos.andar !== undefined && dadosBasicos.andar > 0 && (
                        <div className="flex items-center text-xs">
                          <BuildingOfficeIcon className="w-3.5 h-3.5 mr-1 text-pink-500 flex-shrink-0" />
                          <span className="text-gray-700 truncate">Andar: {dadosBasicos.andar}</span>
                        </div>
                      )}
                      {dadosBasicos.total_andares !== null && dadosBasicos.total_andares !== undefined && dadosBasicos.total_andares > 0 && (
                        <div className="flex items-center text-xs">
                          <BuildingOfficeIcon className="w-3.5 h-3.5 mr-1 text-rose-500 flex-shrink-0" />
                          <span className="text-gray-700 truncate">{dadosBasicos.total_andares} andares</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Badges com fundo discreto */}
                  {(dadosBasicos.aceita_permuta || dadosBasicos.aceita_financiamento) && (
                    <div className="bg-gray-50 rounded-lg p-2 flex flex-wrap gap-2 mt-1">
                      {dadosBasicos.aceita_permuta && (
                        <span className="bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full text-xs font-medium">
                          ✓ Aceita Permuta
                        </span>
                      )}
                      {dadosBasicos.aceita_financiamento && (
                        <span className="bg-green-100 text-green-800 px-3 py-1.5 rounded-full text-xs font-medium">
                          ✓ Aceita Financiamento
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Espaçamento */}
              <div className="w-full mb-8" style={{ maxWidth: '1400px', margin: '0 auto', height: '40px' }}></div>

              {/* Grid de Histórico de Status (ANTES da seleção) */}
              <div className="max-w-4xl mx-auto mb-8">
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Histórico de Mudanças de Status</h3>
                  {loadingHistorico ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-2 text-sm text-gray-500">Carregando histórico...</p>
                    </div>
                  ) : historicoStatus.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data/Hora</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuário</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {historicoStatus.map((item) => (
                            <tr key={item.id}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div 
                                    className="w-4 h-4 rounded-full mr-2"
                                    style={{ backgroundColor: item.status_cor || '#6B7280' }}
                                  ></div>
                                  <span className="text-sm font-medium text-gray-900">{item.status_nome}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(item.created_at).toLocaleString('pt-BR')}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {item.usuario_nome || '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-sm text-gray-500">Nenhum histórico de mudanças de status encontrado.</p>
                    </div>
                  )}
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
                      {statusImovel
                        .filter(status => !historicoStatus.some(h => h.status_fk === status.id))
                        .map((status) => (
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
            </div>
          </div>
        )}

        {/* Mensagem de erro */}
        {errorImovel && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="text-center py-12">
              <div className="mx-auto h-12 w-12 text-gray-400">
                <EyeIcon className="h-full w-full" />
              </div>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Imóvel não encontrado</h3>
              <p className="mt-1 text-sm text-gray-500">
                Verifique se o código informado está correto.
              </p>
            </div>
          </div>
        )}

        {/* Mensagem inicial */}
        {!dadosBasicos && !errorImovel && !loadingImovel && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="text-center py-12">
              <div className="mx-auto h-12 w-12 text-gray-400">
                <EyeIcon className="h-full w-full" />
              </div>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Digite um código para buscar o imóvel</h3>
              <p className="mt-1 text-sm text-gray-500">
                Informe o código do imóvel no campo acima e clique em &quot;Buscar&quot; para visualizar suas informações.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
