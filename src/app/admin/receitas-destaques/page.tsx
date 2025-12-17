'use client'

import { useState, useEffect } from 'react'
import PermissionGuard from '@/components/admin/PermissionGuard'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { usePermissions } from '@/hooks/usePermissions'
import { 
  CurrencyDollarIcon, 
  MapPinIcon,
  ChartBarIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'

interface ReceitaPorFinalidade {
  finalidade: string
  total_imoveis: number
  receita_total: number
}

interface ReceitaNacional {
  total_imoveis: number
  valor_unitario: number
  receita_total: number
  por_finalidade: ReceitaPorFinalidade[]
}

interface ReceitaEstado {
  estado: string
  estado_nome: string
  total_imoveis: number
  valor_unitario: number
  receita_total: number
  por_finalidade: ReceitaPorFinalidade[]
}

interface ReceitasData {
  receita_nacional: ReceitaNacional
  receitas_por_estado: ReceitaEstado[]
  total_geral: number
  total_imoveis_destaque: number // Total de anúncios em destaque (nacional + local)
}

export default function ReceitasDestaquesPage() {
  const { get } = useAuthenticatedFetch()
  const { hasPermission, userPermissions } = usePermissions()
  const [data, setData] = useState<ReceitasData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Debug: verificar permissões
  useEffect(() => {
    console.log('🔍 ReceitasDestaquesPage - Permissões do usuário:', userPermissions)
    console.log('🔍 Tem permissão EXECUTE em receitas-destaques?', hasPermission('receitas-destaques', 'EXECUTE'))
  }, [hasPermission, userPermissions])

  useEffect(() => {
    loadReceitas()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadReceitas = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await get('/api/admin/receitas-destaques')
      
      if (response.ok) {
        const result = await response.json()
        setData(result.data)
      } else {
        const errorData = await response.json().catch(() => ({}))
        setError(errorData.error || 'Erro ao carregar receitas')
      }
    } catch (err) {
      console.error('Erro ao carregar receitas:', err)
      setError('Erro ao carregar receitas de destaque')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number): string => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
  })
}

  const formatNumber = (value: number): string => {
    return value.toLocaleString('pt-BR')
  }

  return (
    <PermissionGuard 
      resource="receitas-destaques" 
      action="EXECUTE"
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6 flex items-center justify-center">
          <div className="bg-white shadow rounded-lg p-8 max-w-md">
            <div className="text-center">
              <XCircleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Acesso Negado
              </h2>
              <p className="text-gray-600 mb-4">
                Você não tem permissão para acessar esta funcionalidade.
              </p>
              <div className="text-left bg-gray-50 p-4 rounded text-sm">
                <p className="font-semibold mb-2">Debug Info:</p>
                <p>Resource: receitas-destaques</p>
                <p>Action: EXECUTE</p>
                <p>Permissões disponíveis: {JSON.stringify(userPermissions, null, 2)}</p>
              </div>
              <p className="text-sm text-gray-500 mt-4">
                Execute a migration create_feature_receitas_destaques.sql e verifique se sua role tem a permissão.
              </p>
            </div>
          </div>
        </div>
      }
    >
      <>
        {loading && (
          <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Carregando receitas...</p>
              </div>
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
            <div className="max-w-7xl mx-auto">
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <p className="text-red-800">{error}</p>
                <button
                  onClick={loadReceitas}
                  className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Tentar Novamente
                </button>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && data && (
          <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
            <div className="max-w-7xl mx-auto">
              {/* Header */}
              <div className="mb-8">
                <h1 className="text-4xl font-bold text-gray-900 flex items-center mb-2">
                  <ChartBarIcon className="h-10 w-10 text-blue-600 mr-3" />
                  Receitas de Destaques
                </h1>
                <p className="text-gray-600 text-lg">
                  Visualização de receitas geradas por imóveis com destaque nacional e local
                </p>
              </div>

              <>
              {/* Bloco 1: Receita Nacional */}
              <div className="mb-8">
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl shadow-2xl p-8 text-white">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                      <div className="bg-white bg-opacity-20 rounded-full p-4 mr-4">
                        <CurrencyDollarIcon className="h-10 w-10" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold">Receita Nacional</h2>
                        <p className="text-blue-100 text-sm">Imóveis com destaque nacional</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-blue-100 text-sm mb-1">Total de Receita</p>
                      <p className="text-4xl font-bold">{formatCurrency(data.receita_nacional.receita_total)}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                    <div className="bg-white bg-opacity-10 rounded-lg p-4 backdrop-blur-sm">
                      <p className="text-blue-100 text-sm mb-1">Total de Imóveis</p>
                      <p className="text-3xl font-bold">{formatNumber(data.receita_nacional.total_imoveis)}</p>
                    </div>
                    <div className="bg-white bg-opacity-10 rounded-lg p-4 backdrop-blur-sm">
                      <p className="text-blue-100 text-sm mb-1">Valor Unitário</p>
                      <p className="text-3xl font-bold">{formatCurrency(data.receita_nacional.valor_unitario)}</p>
                    </div>
                    <div className="bg-white bg-opacity-10 rounded-lg p-4 backdrop-blur-sm">
                      <p className="text-blue-100 text-sm mb-1">Receita Total</p>
                      <p className="text-3xl font-bold">{formatCurrency(data.receita_nacional.receita_total)}</p>
                    </div>
                  </div>
                  
                  {/* Estratificação por Finalidade */}
                  <div className="mt-6 pt-6 border-t border-white border-opacity-20">
                    <p className="text-blue-100 text-sm font-semibold mb-4">Estratificação por Finalidade</p>
                    {data.receita_nacional.por_finalidade && data.receita_nacional.por_finalidade.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {data.receita_nacional.por_finalidade.map((finalidade, idx) => {
                          const finalidadeUpper = (finalidade.finalidade || '').toUpperCase()
                          const isAlugar = finalidadeUpper.includes('ALUGUEL') || finalidadeUpper.includes('ALUGAR')
                          const isComprar = finalidadeUpper.includes('VENDA') || finalidadeUpper.includes('COMPRA') || finalidadeUpper.includes('COMPRAR')
                          const isTemporada = finalidadeUpper.includes('TEMPORADA')
                          let label = finalidade.finalidade || 'Outros'
                          
                          if (isAlugar) {
                            label = 'Alugar'
                          } else if (isComprar) {
                            label = 'Comprar'
                          } else if (isTemporada) {
                            label = 'Temporada'
                          }
                          
                          return (
                            <div key={finalidade.finalidade || `finalidade-${idx}`} className="bg-white bg-opacity-10 rounded-lg p-4 backdrop-blur-sm">
                              <p className="text-blue-100 text-xs mb-2">{label}</p>
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="text-blue-100 text-xs">Imóveis</p>
                                  <p className="text-xl font-bold">{formatNumber(finalidade.total_imoveis)}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-blue-100 text-xs">Receita</p>
                                  <p className="text-xl font-bold">{formatCurrency(finalidade.receita_total)}</p>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-blue-200 text-xs italic">Nenhum imóvel com destaque nacional encontrado por finalidade</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Bloco 2: Receitas por Estado */}
              <div className="mb-8">
                {/* Cabeçalho com totais de anúncios locais */}
                <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-2xl shadow-2xl p-8 text-white mb-6">
                  {(() => {
                    const totalImoveisLocal = data.receitas_por_estado.reduce((sum, estado) => sum + estado.total_imoveis, 0)
                    const receitaTotalLocal = data.receitas_por_estado.reduce((sum, estado) => sum + estado.receita_total, 0)
                    const valorMedioLocal = totalImoveisLocal > 0 ? receitaTotalLocal / totalImoveisLocal : 0
                    
                    return (
                      <>
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center">
                            <div className="bg-white bg-opacity-20 rounded-full p-4 mr-4">
                              <MapPinIcon className="h-10 w-10" />
                            </div>
                            <div>
                              <h2 className="text-2xl font-bold">Receitas Locais</h2>
                              <p className="text-green-100 text-sm">Imóveis com destaque local por estado</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-green-100 text-sm mb-1">Total de Receita</p>
                            <p className="text-4xl font-bold">{formatCurrency(receitaTotalLocal)}</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                          <div className="bg-white bg-opacity-10 rounded-lg p-4 backdrop-blur-sm">
                            <p className="text-green-100 text-sm mb-1">Total de Imóveis</p>
                            <p className="text-3xl font-bold">{formatNumber(totalImoveisLocal)}</p>
                          </div>
                          <div className="bg-white bg-opacity-10 rounded-lg p-4 backdrop-blur-sm">
                            <p className="text-green-100 text-sm mb-1">Valor Médio</p>
                            <p className="text-3xl font-bold">{formatCurrency(valorMedioLocal)}</p>
                          </div>
                          <div className="bg-white bg-opacity-10 rounded-lg p-4 backdrop-blur-sm">
                            <p className="text-green-100 text-sm mb-1">Receita Total</p>
                            <p className="text-3xl font-bold">{formatCurrency(receitaTotalLocal)}</p>
                          </div>
                        </div>
                        
                        {/* Estratificação por Finalidade - Receitas Locais */}
                        {(() => {
                          const finalidadesLocal = new Map<string, { total_imoveis: number, receita_total: number }>()
                          data.receitas_por_estado.forEach(estado => {
                            estado.por_finalidade?.forEach(f => {
                              // Ignorar finalidades com valores zerados
                              if (f.total_imoveis > 0 || f.receita_total > 0) {
                                const current = finalidadesLocal.get(f.finalidade) || { total_imoveis: 0, receita_total: 0 }
                                finalidadesLocal.set(f.finalidade, {
                                  total_imoveis: current.total_imoveis + f.total_imoveis,
                                  receita_total: current.receita_total + f.receita_total
                                })
                              }
                            })
                          })
                          
                          // Filtrar apenas finalidades com dados relevantes
                          const finalidadesComDados = Array.from(finalidadesLocal.entries()).filter(([_, dados]) => 
                            dados.total_imoveis > 0 || dados.receita_total > 0
                          )
                          
                          if (finalidadesComDados.length > 0) {
                            return (
                              <div className="mt-6 pt-6 border-t border-white border-opacity-20">
                                <p className="text-green-100 text-sm font-semibold mb-4">Estratificação por Finalidade</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {finalidadesComDados.map(([finalidade, dados]) => {
                                    const finalidadeUpper = (finalidade || '').toUpperCase()
                                    const isAlugar = finalidadeUpper.includes('ALUGUEL') || finalidadeUpper.includes('ALUGAR')
                                    const isComprar = finalidadeUpper.includes('VENDA') || finalidadeUpper.includes('COMPRA') || finalidadeUpper.includes('COMPRAR')
                                    const isTemporada = finalidadeUpper.includes('TEMPORADA')
                                    let label = finalidade || 'Outros'
                                    
                                    if (isAlugar) {
                                      label = 'Alugar'
                                    } else if (isComprar) {
                                      label = 'Comprar'
                                    } else if (isTemporada) {
                                      label = 'Temporada'
                                    }
                                    
                                    return (
                                      <div key={finalidade} className="bg-white bg-opacity-10 rounded-lg p-4 backdrop-blur-sm">
                                        <p className="text-green-100 text-xs mb-2">{label}</p>
                                        <div className="flex justify-between items-center">
                                          <div>
                                            <p className="text-green-100 text-xs">Imóveis</p>
                                            <p className="text-xl font-bold">{formatNumber(dados.total_imoveis)}</p>
                                          </div>
                                          <div className="text-right">
                                            <p className="text-green-100 text-xs">Receita</p>
                                            <p className="text-xl font-bold">{formatCurrency(dados.receita_total)}</p>
                                          </div>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )
                          }
                          return null
                        })()}
                      </>
                    )
                  })()}
                </div>

                <div className="bg-white rounded-2xl shadow-xl p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                      <div className="bg-green-100 rounded-full p-3 mr-4">
                        <MapPinIcon className="h-8 w-8 text-green-600" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">Receitas por Estado</h2>
                        <p className="text-gray-600 text-sm">Detalhamento por estado</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Total de Estados</p>
                      <p className="text-2xl font-bold text-green-600">{data.receitas_por_estado.length}</p>
                    </div>
                  </div>

                  {/* Grid de estados */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {data.receitas_por_estado
                      .sort((a, b) => b.receita_total - a.receita_total)
                      .map((estado, index) => {
                        const hasReceita = estado.receita_total > 0
                        return (
                          <div 
                            key={estado.estado} 
                            className={`border-2 rounded-xl p-5 transition-all duration-200 ${
                              hasReceita 
                                ? 'border-green-300 bg-gradient-to-br from-green-50 to-white hover:border-green-400 hover:shadow-lg' 
                                : 'border-gray-200 bg-gradient-to-br from-white to-gray-50 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center">
                                <div className={`rounded-full p-2 mr-2 ${
                                  hasReceita ? 'bg-green-100' : 'bg-gray-100'
                                }`}>
                                  <span className={`text-sm font-bold ${
                                    hasReceita ? 'text-green-700' : 'text-gray-500'
                                  }`}>
                                    {index + 1}
                                  </span>
                                </div>
                                <div>
                                  <p className="text-lg font-bold text-gray-900">{estado.estado}</p>
                                  <p className="text-xs text-gray-500">{estado.estado_nome}</p>
                                </div>
                              </div>
                              {hasReceita && (
                                <CheckCircleIcon className="h-6 w-6 text-green-500" />
                              )}
                            </div>
                            
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Imóveis:</span>
                                <span className={`font-semibold ${
                                  hasReceita ? 'text-gray-900' : 'text-gray-400'
                                }`}>
                                  {formatNumber(estado.total_imoveis)}
                                </span>
                              </div>
                              
                              {/* Estratificação por Finalidade */}
                              {estado.por_finalidade && estado.por_finalidade.length > 0 && (
                                <div className="pt-2 border-t border-gray-200 space-y-1">
                                  <p className="text-xs font-medium text-gray-500 mb-1">Por Finalidade:</p>
                                  {estado.por_finalidade.map((finalidade) => {
                                    const finalidadeUpper = (finalidade.finalidade || '').toUpperCase()
                                    const isAlugar = finalidadeUpper.includes('ALUGUEL') || finalidadeUpper.includes('ALUGAR')
                                    const isComprar = finalidadeUpper.includes('VENDA') || finalidadeUpper.includes('COMPRA') || finalidadeUpper.includes('COMPRAR')
                                    const isTemporada = finalidadeUpper.includes('TEMPORADA')
                                    let label = finalidade.finalidade || 'Outros'
                                    
                                    if (isAlugar) {
                                      label = 'Alugar'
                                    } else if (isComprar) {
                                      label = 'Comprar'
                                    } else if (isTemporada) {
                                      label = 'Temporada'
                                    }
                                    
                                    return (
                                      <div key={finalidade.finalidade} className="flex justify-between text-xs">
                                        <span className="text-gray-500">{label}:</span>
                                        <span className={`font-semibold ${
                                          hasReceita ? 'text-gray-700' : 'text-gray-400'
                                        }`}>
                                          {formatNumber(finalidade.total_imoveis)} imóveis - {formatCurrency(finalidade.receita_total)}
                                        </span>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                              
                              <div className="pt-2 border-t border-gray-200">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm font-medium text-gray-700">Receita:</span>
                                  <span className={`text-lg font-bold ${
                                    hasReceita ? 'text-green-600' : 'text-gray-400'
                                  }`}>
                                    {formatCurrency(estado.receita_total)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </div>
              </div>

              {/* Total Geral */}
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl shadow-2xl p-8 text-white">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <div className="bg-white bg-opacity-20 rounded-full p-4 mr-4">
                      <ChartBarIcon className="h-10 w-10" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">Total Geral de Receitas</h2>
                      <p className="text-purple-100 text-sm">Soma de todas as receitas de destaque</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-purple-100 text-sm mb-1">Total Consolidado</p>
                    <p className="text-5xl font-bold">{formatCurrency(data.total_geral)}</p>
                  </div>
                </div>
                
                {/* Total de Imóveis com Destaque */}
                <div className="mt-6 pt-6 border-t border-white border-opacity-20">
                  <div className="bg-white bg-opacity-10 rounded-lg p-4 backdrop-blur-sm">
                    <p className="text-purple-100 text-sm mb-1 font-semibold">Total de Imóveis com Anúncios em Destaque</p>
                    <p className="text-xs text-purple-200 mb-3 italic">
                      (Soma de todos os anúncios em destaque: nacional + local)
                    </p>
                    <p className="text-3xl font-bold mb-3">{formatNumber(data.total_imoveis_destaque || 0)}</p>
                    <div className="mt-3 pt-3 border-t border-white border-opacity-20 text-xs text-purple-200">
                      <p className="mb-1">• Destaque Nacional: <span className="font-semibold text-purple-100">{formatNumber(data.receita_nacional.total_imoveis)}</span> imóveis</p>
                      <p className="mb-1">• Destaque Local: <span className="font-semibold text-purple-100">{formatNumber(data.receitas_por_estado.reduce((sum, e) => sum + e.total_imoveis, 0))}</span> imóveis</p>
                      <p className="mt-2 text-purple-100 font-semibold">
                        Total: {formatNumber(data.receita_nacional.total_imoveis)} + {formatNumber(data.receitas_por_estado.reduce((sum, e) => sum + e.total_imoveis, 0))} = {formatNumber(data.total_imoveis_destaque)} anúncios em destaque
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              </>
            </div>
          </div>
        )}
      </>
    </PermissionGuard>
  )
}

