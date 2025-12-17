'use client'

import { useState } from 'react'
import { XMarkIcon, ExclamationTriangleIcon, TrashIcon } from '@heroicons/react/24/outline'
import { Category } from '@/types/categories'

interface DeleteCategoryModalProps {
  category: Category
  onClose: () => void
  onConfirm: () => void
}

export default function DeleteCategoryModal({ category, onClose, onConfirm }: DeleteCategoryModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = async () => {
    setLoading(true)
    setError(null)

    try {
      // Buscar token de autenticação
      const token = localStorage.getItem('auth-token')
      
      const response = await fetch(`/api/admin/categorias?id=${category.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const result = await response.json()

      if (response.ok && result.success) {
        onConfirm()
      } else {
        setError(result.error || 'Erro ao excluir categoria')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  const hasAssociatedFeatures = category.features && category.features.length > 0

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Confirmar Exclusão</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Aviso sobre funcionalidades associadas */}
          {hasAssociatedFeatures && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mt-0.5" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Não é possível excluir esta categoria
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>
                      Esta categoria possui <strong>{category.features?.length}</strong> funcionalidade(s) associada(s).
                      Remova as associações primeiro antes de excluir a categoria.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Informações da categoria */}
          <div className="bg-gray-50 rounded-md p-4">
            <div className="flex items-center space-x-3">
              <div 
                className="flex items-center justify-center w-10 h-10 rounded-lg"
                style={{ backgroundColor: category.color + '20' }}
              >
                <div style={{ color: category.color }} className="text-lg">
                  {category.icon || '📁'}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900">{category.name}</h4>
                <p className="text-sm text-gray-500">/{category.slug}</p>
              </div>
            </div>
            
            {category.description && (
              <p className="mt-2 text-sm text-gray-600">{category.description}</p>
            )}
          </div>

          {/* Confirmação */}
          {!hasAssociatedFeatures && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mt-0.5" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Atenção: Esta ação não pode ser desfeita
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      Tem certeza que deseja excluir a categoria <strong>&quot;{category.name}&quot;</strong>?
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Erro */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Botões */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancelar
            </button>
            
            {!hasAssociatedFeatures && (
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                <TrashIcon className="h-4 w-4 mr-2" />
                {loading ? 'Excluindo...' : 'Excluir'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

