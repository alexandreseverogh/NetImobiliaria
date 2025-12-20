'use client'

import { useState, useEffect } from 'react'
import PermissionGuard from '@/components/admin/PermissionGuard'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'

export default function ParametrosPage() {
  const { get, put } = useAuthenticatedFetch()
  const [vlDestaqueNacional, setVlDestaqueNacional] = useState<string>('0.00')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Carregar valor atual
  useEffect(() => {
    loadParametros()
  }, [])

  const loadParametros = async () => {
    try {
      setLoading(true)
      const response = await get('/api/admin/parametros')
      
      if (response.ok) {
        const data = await response.json()
        setVlDestaqueNacional(data.data.vl_destaque_nacional?.toString() || '0.00')
      } else {
        setMessage({ type: 'error', text: 'Erro ao carregar parâmetros' })
      }
    } catch (error) {
      console.error('Erro ao carregar parâmetros:', error)
      setMessage({ type: 'error', text: 'Erro ao carregar parâmetros' })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setSaving(true)
      setMessage(null)

      const valorNumerico = parseFloat(vlDestaqueNacional)
      
      if (isNaN(valorNumerico) || valorNumerico < 0) {
        setMessage({ type: 'error', text: 'Por favor, informe um valor válido (número positivo)' })
        return
      }

      const response = await put('/api/admin/parametros', {
        vl_destaque_nacional: valorNumerico
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Parâmetro atualizado com sucesso!' })
        // Limpar mensagem após 3 segundos
        setTimeout(() => setMessage(null), 3000)
      } else {
        const errorData = await response.json()
        setMessage({ 
          type: 'error', 
          text: errorData.error || 'Erro ao atualizar parâmetro' 
        })
      }
    } catch (error) {
      console.error('Erro ao salvar parâmetro:', error)
      setMessage({ type: 'error', text: 'Erro ao salvar parâmetro' })
    } finally {
      setSaving(false)
    }
  }

  const formatCurrency = (value: string): string => {
    const numValue = parseFloat(value) || 0
    return numValue.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }

  return (
    <PermissionGuard resource="parametros" action="EXECUTE">
      <div className="min-h-screen bg-gray-50 p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Parâmetros do Sistema</h1>
          <p className="text-gray-600 mt-2">
            Configure os parâmetros gerais do sistema
          </p>
        </div>

        {/* Card Principal */}
        <div className="max-w-2xl">
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Valor de Destaque Nacional
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Valor utilizado para destaque nacional de imóveis
              </p>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-6">
              {/* Mensagem de sucesso/erro */}
              {message && (
                <div className={`mb-4 p-4 rounded-lg flex items-center space-x-2 ${
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

              {/* Campo de valor */}
              <div className="mb-6">
                <label htmlFor="vl_destaque_nacional" className="block text-sm font-medium text-gray-700 mb-2">
                  Valor de Destaque Nacional (R$)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">R$</span>
                  </div>
                  <input
                    type="text"
                    id="vl_destaque_nacional"
                    value={vlDestaqueNacional}
                    onChange={(e) => {
                      // Permitir apenas números e ponto decimal
                      const value = e.target.value.replace(/[^\d.,]/g, '').replace(',', '.')
                      setVlDestaqueNacional(value)
                    }}
                    onBlur={(e) => {
                      // Formatar ao perder foco
                      const numValue = parseFloat(e.target.value) || 0
                      setVlDestaqueNacional(numValue.toFixed(2))
                    }}
                    placeholder="0.00"
                    disabled={loading || saving}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Valor formatado: <span className="font-semibold">R$ {formatCurrency(vlDestaqueNacional)}</span>
                </p>
              </div>

              {/* Botões */}
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={loadParametros}
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
            </form>
          </div>

          {/* Informações adicionais */}
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Nota:</strong> Este valor será utilizado como padrão para o destaque nacional de imóveis. 
              Certifique-se de que o valor está correto antes de salvar.
            </p>
          </div>
        </div>
      </div>
    </PermissionGuard>
  )
}








