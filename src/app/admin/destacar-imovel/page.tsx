'use client'

import { useState, useEffect } from 'react'
import {
  MagnifyingGlassIcon,
  EyeIcon,
  MapPinIcon,
  HomeIcon,
  BuildingOfficeIcon,
  StarIcon,
  BuildingOffice2Icon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'
import { Square, Car } from 'lucide-react'
import { useEstadosCidades } from '@/hooks/useEstadosCidades'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import SafeImage from '@/components/common/SafeImage'

export default function DestacarImovelPage() {
  const { get, put } = useAuthenticatedFetch()
  const [codigo, setCodigo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  // Estados para controle da busca
  const [dadosBasicos, setDadosBasicos] = useState<any>(null)
  const [loadingImovel, setLoadingImovel] = useState(false)
  const [errorImovel, setErrorImovel] = useState<string | null>(null)

  // Estado para destaque
  const [destaque, setDestaque] = useState<boolean>(false)
  const [destaqueNacional, setDestaqueNacional] = useState<boolean>(false)

  // Hook para estados e cidades
  const { estados } = useEstadosCidades()

  // Função auxiliar para validar se tipo_destaque permite destacar
  const tipoDestaquePermiteDestaque = (tipoDestaque: any): boolean => {
    // Se não existe ou é null/undefined, não permite
    if (!tipoDestaque || tipoDestaque === null || tipoDestaque === undefined) {
      return false
    }

    // Se é string vazia, não permite
    if (tipoDestaque === '') {
      return false
    }

    // Se é string com apenas espaços (incluindo '  '), não permite
    if (typeof tipoDestaque === 'string') {
      const trimmed = tipoDestaque.trim()
      if (trimmed === '' || trimmed.length === 0) {
        return false
      }
      // Se após trim ainda é '  ' ou vazio, não permite
      if (tipoDestaque === '  ' || trimmed === '  ') {
        return false
      }
    }

    // Se chegou aqui, permite (tem valor válido como 'DV' ou 'DA')
    return true
  }

  const handleSearch = async () => {
    if (!codigo.trim()) {
      setError('Por favor, informe o código do imóvel')
      return
    }

    setError(null)
    setErrorImovel(null)
    setDadosBasicos(null)
    setDestaque(false)
    setDestaqueNacional(false)
    setLoadingImovel(true)

    try {
      console.log('🔍 Buscando imóvel com código:', codigo)
      const response = await get(`/api/admin/imoveis/by-codigo/${codigo}`)
      const result = await response.json()

      if (response.ok && result.success) {
        console.log('✅ Imóvel encontrado:', result.imovel)
        console.log('🔍 finalidade_tipo_destaque:', result.imovel.finalidade_tipo_destaque)
        console.log('🔍 finalidade_nome:', result.imovel.finalidade_nome)
        console.log('🔍 finalidade_fk:', result.imovel.finalidade_fk)
        setDadosBasicos(result.imovel)

        // Validar se pode ter destaque antes de definir o estado
        const podeTerDestaque = tipoDestaquePermiteDestaque(result.imovel.finalidade_tipo_destaque)
        const destaqueAtual = result.imovel.destaque || false

        console.log('🔍 Carregando imóvel - podeTerDestaque:', podeTerDestaque)
        console.log('🔍 Carregando imóvel - destaqueAtual:', destaqueAtual)

        // Se o imóvel está marcado como destaque mas não pode ter destaque, desmarcar e alertar
        if (destaqueAtual && !podeTerDestaque) {
          console.log('⚠️ Imóvel está marcado como destaque mas não pode ter destaque - desmarcando')
          alert(`Esse Imóvel não poderá receber destaque em função da Finalidade ${result.imovel.finalidade_nome || 'não identificada'} cadastrada. O destaque será removido automaticamente.`)
          setDestaque(false)

          // Remover destaque do banco automaticamente
          setTimeout(async () => {
            try {
              const updateResponse = await put(`/api/admin/imoveis/${result.imovel.id}`, {
                destaque: false
              })
              if (updateResponse.ok) {
                console.log('✅ Destaque removido automaticamente do banco de dados')
              }
            } catch (error) {
              console.error('❌ Erro ao remover destaque automaticamente:', error)
            }
          }, 100)
        } else {
          setDestaque(destaqueAtual)
        }

        setDestaqueNacional(result.imovel.destaque_nacional || false)
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

  // Função para salvar destaque
  const handleConfirmarDestaque = async () => {
    // Validar se tipo_destaque está preenchido quando tentar marcar destaque
    const tipoDestaque = dadosBasicos?.finalidade_tipo_destaque
    console.log('🔍 Validando destaque - tipoDestaque:', tipoDestaque)
    console.log('🔍 Validando destaque - tipoDestaque tipo:', typeof tipoDestaque)
    console.log('🔍 Validando destaque - tipoDestaque length:', tipoDestaque?.length)
    console.log('🔍 Validando destaque - tipoDestaque permite destaque:', tipoDestaquePermiteDestaque(tipoDestaque))

    // Verificar se permite destacar
    if (destaque && !tipoDestaquePermiteDestaque(tipoDestaque)) {
      alert(`Esse Imóvel não poderá receber destaque em função da Finalidade ${dadosBasicos?.finalidade_nome || 'não identificada'} cadastrada`)
      return
    }

    setSalvando(true)
    try {
      const dadosAtualizacao = {
        destaque: destaque,
        destaque_nacional: destaqueNacional
      }

      console.log('📤 Atualizando destaque para:', dadosAtualizacao)

      const response = await put(`/api/admin/imoveis/${dadosBasicos.id}`, dadosAtualizacao)

      if (response.ok) {
        alert('Destaque atualizado com sucesso!')
        // Limpar campos para novo input
        handleClear()
      } else {
        const errorData = await response.text()
        console.error('Erro na resposta:', errorData)
        alert('Erro ao atualizar destaque')
      }
    } catch (error) {
      console.error('Erro ao salvar destaque:', error)
      alert('Erro ao atualizar destaque')
    } finally {
      setSalvando(false)
    }
  }

  const handleClear = () => {
    setCodigo('')
    setError(null)
    setErrorImovel(null)
    setDadosBasicos(null)
    setDestaque(false)
    setDestaqueNacional(false)
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
          <h1 className="text-3xl font-bold text-gray-900">Destacar Imóvel</h1>
          <p className="text-gray-600 mt-2">
            Defina se o imóvel será destacado no sistema.
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
                disabled={loadingImovel}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 flex items-center"
              >
                {loadingImovel ? (
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

              {/* Dois Containers Lado a Lado */}
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
                    </div>
                  </div>

                  {/* Status Atual */}
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex items-center">
                      <span className="text-xs font-medium text-gray-600 mr-2">Status Atual:</span>
                      <span
                        className="px-2 py-1 rounded-full text-xs font-medium text-white"
                        style={{ backgroundColor: dadosBasicos.status_cor || '#6B7280' }}
                      >
                        {dadosBasicos.status_nome}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Campo Destacar */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6" style={{ maxWidth: '1400px', margin: '0 auto' }}>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Destacar Imóvel</h2>

                <div className="mb-6">
                  {(() => {
                    const tipoDestaque = dadosBasicos?.finalidade_tipo_destaque
                    const podeTerDestaque = tipoDestaquePermiteDestaque(tipoDestaque)

                    return (
                      <>
                        <label className={`flex items-center space-x-3 ${podeTerDestaque ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}>
                          <input
                            type="checkbox"
                            checked={destaque}
                            disabled={!podeTerDestaque}
                            onChange={(e) => {
                              // Validar antes de marcar
                              console.log('🔍 onChange destaque - tipoDestaque:', tipoDestaque)
                              console.log('🔍 onChange destaque - tipoDestaque permite destaque:', podeTerDestaque)
                              console.log('🔍 onChange destaque - e.target.checked:', e.target.checked)

                              if (e.target.checked && !podeTerDestaque) {
                                alert(`Esse Imóvel não poderá receber destaque em função da Finalidade ${dadosBasicos?.finalidade_nome || 'não identificada'} cadastrada`)
                                return
                              }
                              setDestaque(e.target.checked)
                            }}
                            className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                          <span className="text-gray-700 font-medium">
                            {destaque ? 'Imóvel está em destaque Local' : 'Imóvel não está em destaque Local'}
                          </span>
                        </label>
                        <p className="text-sm text-gray-500 mt-2 ml-8">
                          Imóveis em destaque aparecem com prioridade na consulta pública.
                        </p>
                        {!podeTerDestaque && (
                          <p className="text-sm text-red-600 mt-2 ml-8 font-medium">
                            ⚠️ Este imóvel não pode receber destaque devido à finalidade &quot;{dadosBasicos?.finalidade_nome || 'não identificada'}&quot; cadastrada.
                          </p>
                        )}
                      </>
                    )
                  })()}
                </div>

                <div className="mb-6">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={destaqueNacional}
                      onChange={(e) => setDestaqueNacional(e.target.checked)}
                      className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    />
                    <span className="text-gray-700 font-medium">
                      {destaqueNacional ? 'Imóvel está em destaque nacional' : 'Imóvel não está em destaque nacional'}
                    </span>
                  </label>
                  <p className="text-sm text-gray-500 mt-2 ml-8">
                    Imóveis em destaque nacional aparecem quando não há imóveis locais em destaque.
                  </p>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={handleConfirmarDestaque}
                    disabled={salvando}
                    className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400 font-medium"
                  >
                    {salvando ? 'Salvando...' : 'Salvar Destaque'}
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Mensagem de erro */}
        {errorImovel && !dadosBasicos && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-600 font-medium">{errorImovel}</p>
          </div>
        )}
      </div>
    </div>
  )
}

