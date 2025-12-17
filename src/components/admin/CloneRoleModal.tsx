'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline'

interface Role {
  id: number
  name: string
  description: string
  level: number
  is_active: boolean
  two_fa_required: boolean
}

interface CloneRoleModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (message: string) => void
  originalRole: Role | null
}

export default function CloneRoleModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  originalRole 
}: CloneRoleModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Reset form when modal opens/closes or role changes
  useEffect(() => {
    if (isOpen && originalRole) {
      setName(`${originalRole.name} (Cópia)`)
      setDescription(`Cópia do perfil ${originalRole.name}`)
      setError('')
    } else {
      setName('')
      setDescription('')
      setError('')
    }
  }, [isOpen, originalRole])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!originalRole) {
      setError('Perfil original não encontrado')
      return
    }

    if (!name.trim() || !description.trim()) {
      setError('Nome e descrição são obrigatórios')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/admin/roles/${originalRole.id}/clone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim()
        })
      })

      const data = await response.json()

      if (data.success) {
        onSuccess(`Perfil "${data.role.name}" clonado com sucesso! ${data.role.permissions_count} permissões herdadas.`)
        onClose()
      } else {
        setError(data.message || 'Erro ao clonar perfil')
      }
    } catch (error) {
      console.error('Erro ao clonar perfil:', error)
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      onClose()
    }
  }

  if (!isOpen || !originalRole) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <DocumentDuplicateIcon className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Clonar Perfil
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

        {/* Perfil Original Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h4 className="font-medium text-blue-900 mb-2">Perfil Original</h4>
          <div className="space-y-1 text-sm text-blue-800">
            <div><span className="font-medium">Nome:</span> {originalRole.name}</div>
            <div><span className="font-medium">Descrição:</span> {originalRole.description}</div>
            <div><span className="font-medium">Nível:</span> {originalRole.level}</div>
            <div className="flex items-center space-x-4">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                originalRole.is_active 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {originalRole.is_active ? 'Ativo' : 'Inativo'}
              </span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                originalRole.two_fa_required 
                  ? 'bg-purple-100 text-purple-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                2FA: {originalRole.two_fa_required ? 'Obrigatório' : 'Opcional'}
              </span>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Nome do Novo Perfil *
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Digite o nome do novo perfil"
              required
            />
          </div>

          {/* Descrição */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Descrição *
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Digite a descrição do novo perfil"
              required
            />
          </div>

          {/* Herança Info */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <div className="flex-shrink-0">
                <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                </div>
              </div>
              <div className="text-sm text-green-800">
                <p className="font-medium">O novo perfil herdará:</p>
                <ul className="mt-1 space-y-1 text-xs">
                  <li>• Todas as permissões do perfil original</li>
                  <li>• Configuração de 2FA ({originalRole.two_fa_required ? 'Obrigatório' : 'Opcional'})</li>
                  <li>• Nível de acesso ({originalRole.level})</li>
                </ul>
              </div>
            </div>
          </div>

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
              disabled={loading || !name.trim() || !description.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Clonando...</span>
                </>
              ) : (
                <>
                  <DocumentDuplicateIcon className="h-4 w-4" />
                  <span>Clonar Perfil</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}


