'use client'

import { useState, useEffect } from 'react'
import PermissionGuard from '@/components/admin/PermissionGuard'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { usePermissions } from '@/hooks/usePermissions'
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'

interface EstadoValor {
  sigla: string
  nome: string
  valor_destaque: number
}

export default function ValoresDestaquePage() {
  const { get, put } = useAuthenticatedFetch()
  const { hasPermission, userPermissions } = usePermissions()
  const [estados, setEstados] = useState<EstadoValor[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [valoresEditados, setValoresEditados] = useState<Map<string, number>>(new Map())
  const [valoresFormatados, setValoresFormatados] = useState<Map<string, string>>(new Map())

  // Debug: verificar permissões
  useEffect(() => {
    console.log('🔍 ValoresDestaquePage - Componente montado')
    console.log('🔍 Permissões do usuário:', userPermissions)
    console.log('🔍 Tem permissão EXECUTE em valores-anuncios-destaques?', hasPermission('valores-anuncios-destaques', 'EXECUTE'))
  }, [hasPermission, userPermissions])

  // Carregar valores atuais
  useEffect(() => {
    console.log('🔍 ValoresDestaquePage - useEffect executado, carregando valores...')
    loadValores()
  }, [])

  const loadValores = async () => {
    try {
      setLoading(true)
      setMessage(null)
      const response = await get('/api/admin/valoresdestaque')
      
      if (response.ok) {
        const data = await response.json()
        console.log('🔍 Dados recebidos da API:', data)
        
        if (data.data && Array.isArray(data.data) && data.data.length > 0) {
          setEstados(data.data)
          // Inicializar mapas de valores editados
          const valoresMap = new Map<string, number>()
          const valoresFormatadosMap = new Map<string, string>()
          data.data.forEach((estado: EstadoValor) => {
            valoresMap.set(estado.sigla, estado.valor_destaque)
            valoresFormatadosMap.set(estado.sigla, estado.valor_destaque > 0 ? formatCurrencyInput(estado.valor_destaque) : '')
          })
          setValoresEditados(valoresMap)
          setValoresFormatados(valoresFormatadosMap)
        } else {
          setMessage({ type: 'error', text: 'Nenhum estado encontrado. Execute a migration para popular a tabela.' })
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('❌ Erro na resposta da API:', response.status, errorData)
        setMessage({ 
          type: 'error', 
          text: errorData.error || `Erro ao carregar valores de destaque (${response.status})` 
        })
      }
    } catch (error) {
      console.error('❌ Erro ao carregar valores:', error)
      setMessage({ 
        type: 'error', 
        text: `Erro ao carregar valores de destaque: ${error instanceof Error ? error.message : 'Erro desconhecido'}` 
      })
    } finally {
      setLoading(false)
    }
  }

  // Função para formatar valor com máscara brasileira (9.999,99)
  const formatCurrencyInput = (value: number): string => {
    if (value === 0 || !value) return ''
    return value.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }

  // Função para formatar string durante digitação (máscara brasileira)
  const formatCurrencyMask = (digits: string): string => {
    if (!digits) return ''
    
    // Converte para número e divide por 100 (últimos 2 dígitos são centavos)
    const numericValue = parseFloat(digits) / 100
    
    // Formata com máscara brasileira
    return numericValue.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }

  const handleValorChange = (sigla: string, valor: string) => {
    // Remover tudo exceto números
    const digits = valor.replace(/\D/g, '')
    
    if (!digits) {
      // Se vazio, definir como 0
      const novosValores = new Map(valoresEditados)
      const novosFormatados = new Map(valoresFormatados)
      novosValores.set(sigla, 0)
      novosFormatados.set(sigla, '')
      setValoresEditados(novosValores)
      setValoresFormatados(novosFormatados)
      return
    }

    // Converter para número (dividir por 100 para centavos)
    const valorNumerico = parseFloat(digits) / 100
    
    // Formatar para exibição
    const valorFormatado = formatCurrencyMask(digits)
    
    // Atualizar mapas
    const novosValores = new Map(valoresEditados)
    const novosFormatados = new Map(valoresFormatados)
    novosValores.set(sigla, valorNumerico)
    novosFormatados.set(sigla, valorFormatado)
    setValoresEditados(novosValores)
    setValoresFormatados(novosFormatados)
    
    // Atualizar estado visual
    setEstados(prev => prev.map(estado => 
      estado.sigla === sigla 
        ? { ...estado, valor_destaque: valorNumerico }
        : estado
    ))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setSaving(true)
      setMessage(null)

      // Preparar array de estados para envio
      const estadosParaEnviar = Array.from(valoresEditados.entries()).map(([sigla, valor]) => ({
        sigla,
        valor_destaque: valor
      }))

      const response = await put('/api/admin/valoresdestaque', {
        estados: estadosParaEnviar
      })

      if (response.ok) {
        const result = await response.json()
        setMessage({ type: 'success', text: result.message || 'Valores atualizados com sucesso!' })
        // Recarregar valores para garantir sincronização
        await loadValores()
        // Limpar mensagem após 3 segundos
        setTimeout(() => setMessage(null), 3000)
      } else {
        const errorData = await response.json()
        setMessage({ 
          type: 'error', 
          text: errorData.error || 'Erro ao atualizar valores' 
        })
      }
    } catch (error) {
      console.error('Erro ao salvar valores:', error)
      setMessage({ type: 'error', text: 'Erro ao salvar valores' })
    } finally {
      setSaving(false)
    }
  }

  const formatCurrency = (value: number): string => {
    return value.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }

  const handleBlur = (sigla: string) => {
    const valor = valoresEditados.get(sigla) || 0
    // Garantir que o valor seja formatado com 2 casas decimais
    const valorFormatado = parseFloat(valor.toFixed(2))
    const novosValores = new Map(valoresEditados)
    const novosFormatados = new Map(valoresFormatados)
    novosValores.set(sigla, valorFormatado)
    novosFormatados.set(sigla, valorFormatado > 0 ? formatCurrencyInput(valorFormatado) : '')
    setValoresEditados(novosValores)
    setValoresFormatados(novosFormatados)
    
    setEstados(prev => prev.map(estado => 
      estado.sigla === sigla 
        ? { ...estado, valor_destaque: valorFormatado }
        : estado
    ))
  }

  // Debug: verificar se tem permissão
  const temPermissao = hasPermission('valores-anuncios-destaques', 'EXECUTE')
  
  console.log('🔍 Renderizando página - temPermissao:', temPermissao)
  console.log('🔍 Estados carregados:', estados.length)
  console.log('🔍 Loading:', loading)

  return (
    <PermissionGuard 
      resource="valores-anuncios-destaques" 
      action="EXECUTE"
      fallback={
        <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
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
                <p>Resource: valores-anuncios-destaques</p>
                <p>Action: EXECUTE</p>
                <p>Permissões disponíveis: {JSON.stringify(userPermissions, null, 2)}</p>
              </div>
              <p className="text-sm text-gray-500 mt-4">
                Execute a migration create_feature_valordestaques.sql e verifique se sua role tem a permissão.
              </p>
            </div>
          </div>
        </div>
      }
    >
      <div className="min-h-screen bg-gray-50 p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Valores de Destaque por Estado</h1>
          <p className="text-gray-600 mt-2">
            Configure os valores de destaque para cada estado brasileiro
          </p>
        </div>

        {/* Mensagem de sucesso/erro */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center space-x-2 ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.type === 'success' ? (
              <CheckCircleIcon className="w-5 h-5" />
            ) : (
              <XCircleIcon className="w-5 h-5" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={handleSubmit}>
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Valores de Destaque por Estado
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Configure o valor de destaque de anúncio para cada estado (R$)
              </p>
            </div>

            {loading ? (
              <div className="px-6 py-12 text-center">
                <div className="text-gray-500">Carregando valores...</div>
              </div>
            ) : estados.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="text-gray-500 mb-4">
                  Nenhum estado encontrado. Execute a migration para popular a tabela valor_destaque_local.
                </div>
                <button
                  type="button"
                  onClick={loadValores}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Tentar Novamente
                </button>
              </div>
            ) : (
              <div className="px-6 py-6">
                {/* Grid de estados - mais colunas para melhor aproveitamento do espaço */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {estados.map((estado) => {
                    const valorDestaqueFormatado = valoresFormatados.get(estado.sigla) || ''
                    
                    return (
                      <div key={estado.sigla} className="border-2 border-blue-300 rounded-lg p-4 space-y-3 bg-blue-50 shadow-sm">
                        <label className="block text-xs font-medium mb-2">
                          <span className="font-semibold text-blue-900">{estado.sigla}</span> - <span className="text-xs text-blue-800">{estado.nome}</span>
                        </label>
                        
                        {/* Campo Valor Destaque Anúncio */}
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Valor Destaque Anúncio</label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                              <span className="text-gray-500 text-xs">R$</span>
                            </div>
                            <input
                              type="text"
                              value={valorDestaqueFormatado}
                              onChange={(e) => handleValorChange(estado.sigla, e.target.value)}
                              onBlur={() => handleBlur(estado.sigla)}
                              placeholder="0,00"
                              disabled={saving}
                              maxLength={15}
                              className="block w-full pl-8 pr-2 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Botões */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
              <button
                type="button"
                onClick={loadValores}
                disabled={loading || saving}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || saving}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </form>

        {/* Informações adicionais */}
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Nota:</strong> Configure o <strong>Valor Destaque Anúncio</strong> para cada estado. 
            Certifique-se de que os valores estão corretos antes de salvar.
          </p>
        </div>
      </div>
    </PermissionGuard>
  )
}

