'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon, ShieldCheckIcon, ExclamationTriangleIcon, PencilIcon } from '@heroicons/react/24/outline'

interface Role {
  id: number
  name: string
  description: string
  level: number
  is_active: boolean
  two_fa_required: boolean
  created_at: string
  updated_at: string
  user_count: number
}

interface EditRoleModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  role: Role | null
}

interface RoleFormData {
  name: string
  description: string
  level: number
  two_fa_required: boolean
  is_active: boolean
}

export default function EditRoleModal({ isOpen, onClose, onSuccess, role }: EditRoleModalProps) {
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

  // Carregar dados do role quando modal abrir
  useEffect(() => {
    if (isOpen && role) {
      setFormData({
        name: role.name,
        description: role.description,
        level: role.level,
        two_fa_required: role.two_fa_required,
        is_active: role.is_active
      })
      setError(null)
      setValidationErrors({})
    }
  }, [isOpen, role])

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

    // Verificar nomes reservados (exceto para o próprio role)
    const reservedNames = ['Super Admin', 'Admin', 'Administrador', 'Corretor', 'Usuário']
    if (reservedNames.includes(formData.name.trim()) && formData.name !== role?.name) {
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
    
    if (!role || !validateForm()) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/roles/${role.id}`, {
        method: 'PUT',
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
        setError(data.message || 'Erro ao atualizar perfil')
      }
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error)
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !role) return null

  const isSystemRole = ['Super Admin', 'Admin', 'Administrador', 'Corretor', 'Usuário'].includes(role.name)
  const hasUsers = role.user_count > 0

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <PencilIcon className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Editar Perfil
              </h3>
              <p className="text-sm text-gray-500">
                {role.name} • {role.user_count} usuário(s)
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

        {/* Avisos especiais */}
        {isSystemRole && (
          <div className="mx-6 mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-amber-500" />
              <div>
                <h5 className="font-medium text-amber-800">Perfil do Sistema</h5>
                <p className="text-sm text-amber-700 mt-1">
                  Este é um perfil do sistema. Algumas configurações podem ser limitadas.
                </p>
              </div>
            </div>
          </div>
        )}

        {hasUsers && (
          <div className="mx-6 mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="h-5 w-5 text-blue-500" />
              <div>
                <h5 className="font-medium text-blue-800">Usuários Associados</h5>
                <p className="text-sm text-blue-700 mt-1">
                  {role.user_count} usuário(s) estão associados a este perfil. 
                  Alterações podem afetar o acesso deles.
                </p>
              </div>
            </div>
          </div>
        )}

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
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                validationErrors.name ? 'border-red-300' : 'border-gray-300'
              } ${isSystemRole ? 'bg-gray-50' : ''}`}
              placeholder="Ex: Gerente de Vendas"
              maxLength={50}
              readOnly={isSystemRole}
            />
            {validationErrors.name && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.name}</p>
            )}
            {isSystemRole && (
              <p className="mt-1 text-xs text-gray-500">
                Nome de perfis do sistema não pode ser alterado
              </p>
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
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none ${
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
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                validationErrors.level ? 'border-red-300' : 'border-gray-300'
              } ${isSystemRole ? 'bg-gray-50' : ''}`}
              disabled={isSystemRole}
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
            {isSystemRole ? (
              <p className="mt-1 text-xs text-gray-500">
                Nível de perfis do sistema não pode ser alterado
              </p>
            ) : (
              <p className="mt-1 text-xs text-gray-500">
                Níveis mais altos têm precedência sobre níveis mais baixos
              </p>
            )}
          </div>

          {/* Configurações de Segurança */}
          <div className="border-t border-gray-200 pt-6">
            <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center gap-2">
              <ShieldCheckIcon className="h-5 w-5 text-indigo-600" />
              Configurações de Segurança
            </h4>

            {/* 2FA Obrigatório */}
            <div className="flex items-center justify-between p-4 bg-indigo-50 rounded-lg">
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
                  disabled={isSystemRole && role.name === 'Super Admin'}
                />
                <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 ${(isSystemRole && role.name === 'Super Admin') ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
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
                  disabled={isSystemRole && role.name === 'Super Admin'}
                />
                <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600 ${(isSystemRole && role.name === 'Super Admin') ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
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
                    Usuários com este perfil precisarão configurar 2FA no próximo login. 
                    Certifique-se de que o sistema de email está configurado corretamente.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Informações do perfil */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h5 className="font-medium text-gray-900 mb-2">Informações do Perfil</h5>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Criado em:</span>
                <p className="font-medium">{new Date(role.created_at).toLocaleDateString('pt-BR')}</p>
              </div>
              <div>
                <span className="text-gray-500">Última atualização:</span>
                <p className="font-medium">{new Date(role.updated_at).toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
          </div>

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
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Salvando...
                </>
              ) : (
                <>
                  <PencilIcon className="h-4 w-4" />
                  Salvar Alterações
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}


