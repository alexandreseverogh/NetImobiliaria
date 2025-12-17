'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon, DocumentDuplicateIcon, ArrowPathIcon, ClipboardDocumentListIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { useTwoFactorValidation, requiresTwoFactor } from '@/hooks/useTwoFactorValidation'

interface Role {
  id: number
  name: string
  description: string
  level: number
  is_active: boolean
  two_fa_required: boolean
}

interface Permission {
  id: number
  action: string
  description: string
  feature_id: number
  feature_name: string
  feature_category: string
}

interface BulkPermissionsModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (message: string) => void
  selectedRoles: Role[]
  availableRoles: Role[]
  permissions: Permission[]
}

export default function BulkPermissionsModal({
  isOpen,
  onClose,
  onSuccess,
  selectedRoles,
  availableRoles,
  permissions
}: BulkPermissionsModalProps) {
  const [operation, setOperation] = useState<'apply' | 'copy' | 'reset' | 'template'>('apply')
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([])
  const [sourceRoleId, setSourceRoleId] = useState<number | null>(null)
  const [template, setTemplate] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [templates, setTemplates] = useState<Record<string, any>>({})

  // Hook para validação 2FA
  const {
    isTwoFactorModalOpen,
    twoFactorAction,
    twoFactorDescription,
    isTwoFactorRequired,
    showTwoFactorModal,
    hideTwoFactorModal
  } = useTwoFactorValidation()

  // Carregar templates
  useEffect(() => {
    if (isOpen) {
      fetchTemplates()
    }
  }, [isOpen])

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/admin/roles/bulk-permissions')
      const data = await response.json()
      if (data.success) {
        setTemplates(data.templates)
      }
    } catch (error) {
      console.error('Erro ao carregar templates:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (selectedRoles.length === 0) {
      setError('Selecione pelo menos um perfil')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Preparar dados da operação
      let requestData: any = {
        operation,
        roleIds: selectedRoles.map(role => role.id)
      }

      // Adicionar dados específicos da operação
      switch (operation) {
        case 'apply':
          if (selectedPermissions.length === 0) {
            setError('Selecione pelo menos uma permissão')
            setLoading(false)
            return
          }
          requestData.permissions = selectedPermissions.map(id => ({
            permission_id: id,
            granted: true
          }))
          break

        case 'copy':
          if (!sourceRoleId) {
            setError('Selecione o perfil de origem')
            setLoading(false)
            return
          }
          requestData.options = { sourceRoleId }
          break

        case 'template':
          if (!template) {
            setError('Selecione um template')
            setLoading(false)
            return
          }
          requestData.template = template
          break

        case 'reset':
          // Não precisa de dados adicionais
          break
      }

      // Verificar se operação requer 2FA
      const criticalPermissions = permissions.filter(perm => 
        selectedPermissions.includes(perm.id) && 
        requiresTwoFactor(perm.action, perm.feature_category)
      )

      if (criticalPermissions.length > 0) {
        const twoFactorCode = await showTwoFactorModal({
          action: `${operation === 'apply' ? 'Aplicar' : operation === 'copy' ? 'Copiar' : operation === 'reset' ? 'Resetar' : 'Aplicar template'} permissões em massa`,
          description: `Esta operação afeta ${selectedRoles.length} perfil(s) e ${criticalPermissions.length} permissão(ões) crítica(s).`,
          isRequired: true
        })

        if (!twoFactorCode) {
          setLoading(false)
          return
        }

        requestData.options = {
          ...requestData.options,
          twoFactorValidated: true
        }
      }

      // Executar operação
      const response = await fetch('/api/admin/roles/bulk-permissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      })

      const data = await response.json()

      if (data.success) {
        const { summary } = data
        const message = `Operação executada com sucesso! ${summary.successfulRoles}/${summary.totalRoles} perfis processados. ${summary.totalPermissionsProcessed} permissões aplicadas.`
        onSuccess(message)
        onClose()
      } else {
        setError(data.message || 'Erro ao executar operação')
      }
    } catch (error) {
      console.error('Erro ao executar bulk operation:', error)
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setOperation('apply')
      setSelectedPermissions([])
      setSourceRoleId(null)
      setTemplate('')
      setError('')
      onClose()
    }
  }

  const getOperationIcon = () => {
    switch (operation) {
      case 'apply': return <ClipboardDocumentListIcon className="h-5 w-5" />
      case 'copy': return <DocumentDuplicateIcon className="h-5 w-5" />
      case 'reset': return <ArrowPathIcon className="h-5 w-5" />
      case 'template': return <ClipboardDocumentListIcon className="h-5 w-5" />
    }
  }

  const getOperationTitle = () => {
    switch (operation) {
      case 'apply': return 'Aplicar Permissões'
      case 'copy': return 'Copiar Permissões'
      case 'reset': return 'Resetar Permissões'
      case 'template': return 'Aplicar Template'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            {getOperationIcon()}
            <h3 className="text-lg font-semibold text-gray-900">
              Operações em Lote - {getOperationTitle()}
            </h3>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Perfis Selecionados */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h4 className="font-medium text-blue-900 mb-2">
            Perfis Selecionados ({selectedRoles.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {selectedRoles.map(role => (
              <span
                key={role.id}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              >
                {role.name}
              </span>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tipo de Operação */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Tipo de Operação
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'apply', label: 'Aplicar Permissões', desc: 'Aplicar permissões específicas' },
                { value: 'copy', label: 'Copiar Permissões', desc: 'Copiar de outro perfil' },
                { value: 'reset', label: 'Resetar Permissões', desc: 'Remover todas as permissões' },
                { value: 'template', label: 'Aplicar Template', desc: 'Usar template pré-definido' }
              ].map((op) => (
                <button
                  key={op.value}
                  type="button"
                  onClick={() => setOperation(op.value as any)}
                  className={`p-3 text-left rounded-lg border-2 transition-colors ${
                    operation === op.value
                      ? 'border-blue-500 bg-blue-50 text-blue-900'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium">{op.label}</div>
                  <div className="text-xs text-gray-600 mt-1">{op.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Conteúdo específico da operação */}
          {operation === 'apply' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Selecionar Permissões
              </label>
              <div className="max-h-48 overflow-y-auto border rounded-lg p-3 space-y-2">
                {permissions.map(permission => {
                  const isSelected = selectedPermissions.includes(permission.id)
                  const isCritical = requiresTwoFactor(permission.action, permission.feature_category)
                  
                  return (
                    <label key={permission.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedPermissions(prev => [...prev, permission.id])
                          } else {
                            setSelectedPermissions(prev => prev.filter(id => id !== permission.id))
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{permission.action}</span>
                          {isCritical && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                              2FA
                            </span>
                          )}
                          <span className="text-sm text-gray-500">({permission.feature_category})</span>
                        </div>
                        <p className="text-xs text-gray-600">{permission.description}</p>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>
          )}

          {operation === 'copy' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Perfil de Origem
              </label>
              <select
                value={sourceRoleId || ''}
                onChange={(e) => setSourceRoleId(parseInt(e.target.value) || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Selecione o perfil de origem</option>
                {availableRoles.filter(role => !selectedRoles.find(sr => sr.id === role.id)).map(role => (
                  <option key={role.id} value={role.id}>
                    {role.name} (Nível {role.level})
                  </option>
                ))}
              </select>
            </div>
          )}

          {operation === 'template' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Template
              </label>
              <select
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Selecione um template</option>
                {Object.entries(templates).map(([key, template]) => (
                  <option key={key} value={key}>
                    {template.name} - {template.description}
                  </option>
                ))}
              </select>
              {template && templates[template] && (
                <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700">{templates[template].description}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Permissões: {templates[template].permissions.join(', ')}
                  </p>
                </div>
              )}
            </div>
          )}

          {operation === 'reset' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
                <span className="font-medium text-yellow-800">Atenção!</span>
              </div>
              <p className="text-yellow-700 text-sm mt-1">
                Esta operação removerá TODAS as permissões dos perfis selecionados. 
                Esta ação não pode ser desfeita.
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Executando...</span>
                </>
              ) : (
                <>
                  {getOperationIcon()}
                  <span>Executar Operação</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Modal de Validação 2FA */}
        <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 ${isTwoFactorModalOpen ? 'block' : 'hidden'}`}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Validação 2FA</h3>
              <button onClick={hideTwoFactorModal} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 font-medium">{twoFactorAction}</p>
              <p className="text-red-700 text-sm mt-1">{twoFactorDescription}</p>
            </div>
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600">
                Esta operação requer validação 2FA. A validação será implementada na interface principal.
              </p>
            </div>
            <div className="mt-4 flex space-x-3">
              <button
                onClick={hideTwoFactorModal}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  // Simular validação bem-sucedida para desenvolvimento
                  ;(window as any).handleTwoFactorSuccess?.('123456')
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Validar (Dev)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


