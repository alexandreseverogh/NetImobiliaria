'use client'

import { useState } from 'react'

interface CreateTipoDocumentoModalProps {
  onClose: () => void
  onSuccess: () => void
}

export default function CreateTipoDocumentoModal({ onClose, onSuccess }: CreateTipoDocumentoModalProps) {
  const [formData, setFormData] = useState({
    descricao: '',
    consulta_imovel_internauta: false
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.descricao.trim()) {
      newErrors.descricao = 'Descrição é obrigatória'
    } else if (formData.descricao.trim().length < 2) {
      newErrors.descricao = 'Descrição deve ter pelo menos 2 caracteres'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/admin/tipos-documentos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        onSuccess()
      } else {
        const errorData = await response.json()
        setErrors({ submit: errorData.error || 'Erro ao criar tipo de documento' })
      }
    } catch (error) {
      console.error('Erro ao criar tipo de documento:', error)
      setErrors({ submit: 'Erro ao criar tipo de documento. Tente novamente.' })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Limpar erro do campo quando usuário começar a digitar
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Novo Tipo de Documento
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Descrição */}
            <div>
              <label htmlFor="descricao" className="block text-sm font-medium text-gray-700 mb-1">
                Descrição *
              </label>
              <input
                type="text"
                id="descricao"
                value={formData.descricao}
                onChange={(e) => handleInputChange('descricao', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.descricao ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Ex: Planta Baixa, IPTU, etc."
                disabled={loading}
              />
              {errors.descricao && (
                <p className="mt-1 text-sm text-red-600">{errors.descricao}</p>
              )}
            </div>

            {/* Visível ao Público */}
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.consulta_imovel_internauta}
                  onChange={(e) => handleInputChange('consulta_imovel_internauta', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={loading}
                />
                <span className="ml-2 text-sm text-gray-700">
                  Visível para consulta de imóveis pelo público
                </span>
              </label>
              <p className="mt-1 text-xs text-gray-500">
                Se marcado, este tipo de documento será exibido para visitantes do site
              </p>
            </div>

            {/* Error geral */}
            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-600">{errors.submit}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Criando...
                  </div>
                ) : (
                  'Criar Tipo de Documento'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}






