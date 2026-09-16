'use client'

import { useState } from 'react'
import { XMarkIcon, ExclamationTriangleIcon, TrashIcon } from '@heroicons/react/24/outline'

interface SystemFeature {
  id: number
  name: string
  description: string
  category: string
  url: string
  is_active: boolean
  permissions_count: number
  created_at: string
  updated_at: string
}

interface DeleteSystemFeatureModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (message: string) => void
  onError: (message: string) => void
  feature: SystemFeature | null
}

export default function DeleteSystemFeatureModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  onError,
  feature 
}: DeleteSystemFeatureModalProps) {
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    console.log('🔍 DEBUG - Função handleDelete chamada')
    
    if (!feature) {
      console.log('❌ DEBUG - Feature é null, cancelando exclusão')
      return
    }

    console.log('🔍 DEBUG - Excluindo funcionalidade:', feature)
    setLoading(true)
    
    try {
      const token = localStorage.getItem('admin-auth-token')
      console.log('🔍 DEBUG - Token encontrado:', token ? 'SIM' : 'NÃO')
      
      const url = `/api/admin/system-features/${feature.id}`
      console.log('🔍 DEBUG - URL da requisição:', url)
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      console.log('🔍 DEBUG - Resposta recebida:', response.status, response.statusText)

      if (response.ok) {
        // Tentar fazer parse do JSON apenas se a resposta for válida
        let data = null
        try {
          const responseText = await response.text()
          if (responseText) {
            data = JSON.parse(responseText)
          }
        } catch (parseError) {
          console.log('⚠️ DEBUG - Resposta não é JSON válido, assumindo sucesso')
        }
        console.log('✅ DEBUG - Dados recebidos:', data)
        onSuccess(`Funcionalidade "${feature.name}" excluída com sucesso!`)
        onClose()
      } else {
        // Tentar fazer parse do JSON de erro apenas se houver conteúdo
        let errorData = null
        try {
          const responseText = await response.text()
          if (responseText) {
            errorData = JSON.parse(responseText)
          }
        } catch (parseError) {
          console.log('⚠️ DEBUG - Erro não é JSON válido')
          errorData = { message: `Erro ${response.status}: ${response.statusText}` }
        }
        console.log('❌ DEBUG - Erro da API:', errorData)
        onError(errorData?.message || `Erro ${response.status}: ${response.statusText}`)
      }
    } catch (error) {
      console.error('❌ DEBUG - Erro ao excluir funcionalidade:', error)
      onError('Erro ao excluir funcionalidade')
    } finally {
      console.log('🔍 DEBUG - Finalizando processo de exclusão...')
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      onClose()
    }
  }

  if (!isOpen || !feature) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">
              Excluir Funcionalidade
            </h2>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6">
            <p className="text-gray-700 mb-4">
              Tem certeza que deseja excluir a funcionalidade <strong>&quot;{feature.name}&quot;</strong>?
            </p>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mt-0.5 mr-2" />
                <div>
                  <h4 className="text-sm font-medium text-red-800">Atenção!</h4>
                  <ul className="mt-2 text-sm text-red-700 space-y-1">
                    <li>• Esta ação <strong>não pode ser desfeita</strong></li>
                    <li>• Todas as <strong>{feature.permissions_count} permissões</strong> associadas serão removidas</li>
                    <li>• Usuários perderão acesso a esta funcionalidade</li>
                    <li>• A funcionalidade será removida da sidebar</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Detalhes da Funcionalidade</h4>
              <div className="text-sm space-y-1">
                <div><span className="text-gray-600">Nome:</span> <span className="font-medium">{feature.name}</span></div>
                <div><span className="text-gray-600">Categoria:</span> <span className="font-medium">{feature.category}</span></div>
                <div><span className="text-gray-600">URL:</span> <span className="font-medium font-mono">{feature.url}</span></div>
                <div><span className="text-gray-600">Permissões:</span> <span className="font-medium">{feature.permissions_count}</span></div>
                <div><span className="text-gray-600">Status:</span> 
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                    feature.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {feature.is_active ? 'Ativa' : 'Inativa'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                console.log('🔍 DEBUG - Botão de exclusão clicado!')
                handleDelete()
              }}
              disabled={loading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Excluindo...
                </>
              ) : (
                <>
                  <TrashIcon className="h-4 w-4 mr-2" />
                  Excluir Funcionalidade
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
