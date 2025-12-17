'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon, ShieldCheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface CreateRoleModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface RoleFormData {
  name: string
  description: string
  level: number
  two_fa_required: boolean
  is_active: boolean
}

export default function CreateRoleModal({ isOpen, onClose, onSuccess }: CreateRoleModalProps) {
  const [formData, setFormData] = useState<RoleFormData>({
    name: '',
    description: '',
    level: 1,
    two_fa_required: false,
    is_active: true
  })
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // Resetar formulário quando modal abrir
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: '',
        description: '',
        level: 1,
        two_fa_required: false,
        is_active: true
      })
      setError(null)
      setValidationErrors({})
    }
  }, [isOpen])

  // Validação do formulário
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!formData.name.trim()) {
      errors.name = 'Nome é obrigatório'
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Nome deve ter pelo menos 2 caracteres'
    } else if (formData.name.trim().length > 50) {
      errors.name = 'Nome deve ter no máximo 50 caracteres'
    }

    if (!formData.description.trim()) {
      errors.description = 'Descrição é obrigatória'
    } else if (formData.description.trim().length < 5) {
      errors.description = 'Descrição deve ter pelo menos 5 caracteres'
    } else if (formData.description.trim().length > 200) {
      errors.description = 'Descrição deve ter no máximo 200 caracteres'
    }

    if (formData.level < 1 || formData.level > 10) {
      errors.level = 'Nível deve estar entre 1 e 10'
    }

    // Verificar nomes reservados
    const reservedNames = ['Super Admin', 'Admin', 'Administrador', 'Corretor', 'Usuário']
    if (reservedNames.includes(formData.name.trim())) {
      errors.name = 'Este nome é reservado pelo sistema'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Handler para mudanças nos campos
  const handleInputChange = (field: keyof RoleFormData, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))

    // Limpar erro do campo quando usuário começar a digitar
    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  // Handler para envio do formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (response.ok) {
        onSuccess()
        onClose()
      } else {
        setError(data.message || 'Erro ao criar perfil')
      }
    } catch (error) {
      console.error('Erro ao criar perfil:', error)
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ShieldCheckIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Criar Novo Perfil
              </h3>
              <p className="text-sm text-gray-500">
                Configure as permissões e segurança
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Erro geral */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Nome */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Nome do Perfil *
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                validationErrors.name ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Ex: Gerente de Vendas"
              maxLength={50}
            />
            {validationErrors.name && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.name}</p>
            )}
          </div>

          {/* Descrição */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Descrição *
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                validationErrors.description ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Descreva as responsabilidades deste perfil"
              maxLength={200}
            />
            {validationErrors.description && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.description}</p>
            )}
          </div>

          {/* Nível */}
          <div>
            <label htmlFor="level" className="block text-sm font-medium text-gray-700 mb-2">
              Nível de Acesso *
            </label>
            <select
              id="level"
              value={formData.level}
              onChange={(e) => handleInputChange('level', parseInt(e.target.value))}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                validationErrors.level ? 'border-red-300' : 'border-gray-300'
              }`}
            >
              <option value={1}>Nível 1 - Básico</option>
              <option value={2}>Nível 2 - Intermediário</option>
              <option value={3}>Nível 3 - Avançado</option>
              <option value={4}>Nível 4 - Especialista</option>
              <option value={5}>Nível 5 - Coordenador</option>
              <option value={6}>Nível 6 - Gerente</option>
              <option value={7}>Nível 7 - Diretor</option>
              <option value={8}>Nível 8 - Executivo</option>
              <option value={9}>Nível 9 - C-Level</option>
              <option value={10}>Nível 10 - Administrador</option>
            </select>
            {validationErrors.level && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.level}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Níveis mais altos têm precedência sobre níveis mais baixos
            </p>
          </div>

          {/* Configurações de Segurança */}
          <div className="border-t border-gray-200 pt-6">
            <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center gap-2">
              <ShieldCheckIcon className="h-5 w-5 text-blue-600" />
              Configurações de Segurança
            </h4>

            {/* 2FA Obrigatório */}
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div>
                <h5 className="font-medium text-gray-900">2FA Obrigatório</h5>
                <p className="text-sm text-gray-600">
                  Usuários com este perfil devem usar autenticação de dois fatores
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.two_fa_required}
                  onChange={(e) => handleInputChange('two_fa_required', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Status Ativo */}
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg mt-4">
              <div>
                <h5 className="font-medium text-gray-900">Perfil Ativo</h5>
                <p className="text-sm text-gray-600">
                  Perfil disponível para atribuição a usuários
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => handleInputChange('is_active', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>
          </div>

          {/* Aviso sobre 2FA */}
          {formData.two_fa_required && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <ExclamationTriangleIcon className="h-5 w-5 text-amber-500" />
                <div>
                  <h5 className="font-medium text-amber-800">Aviso Importante</h5>
                  <p className="text-sm text-amber-700 mt-1">
                    Usuários com este perfil precisarão configurar 2FA no primeiro login. 
                    Certifique-se de que o sistema de email está configurado corretamente.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Botões */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Criando...
                </>
              ) : (
                <>
                  <ShieldCheckIcon className="h-4 w-4" />
                  Criar Perfil
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}


