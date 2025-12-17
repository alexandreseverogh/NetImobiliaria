'use client';

import { useState } from 'react';
import { XMarkIcon, ShieldCheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface Perfil {
  id: number;
  name: string;
  description: string;
  userCount: number;
  permissions: Record<string, string>;
}

interface DeletePerfilModalProps {
  isOpen: boolean;
  perfil: Perfil;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DeletePerfilModal({ isOpen, perfil, onClose, onSuccess }: DeletePerfilModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (perfil.userCount > 0) {
      setError('Não é possível excluir um perfil que está sendo usado por usuários ativos');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('auth-token')
      const response = await fetch(`/api/admin/perfis/${perfil.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Erro ${response.status}: ${response.statusText}`);
      }

      onSuccess();
    } catch (err) {
      console.error('Erro ao excluir perfil:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setError(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={handleClose}
        ></div>

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          {/* Header */}
          <div className="bg-white px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Excluir Perfil
                  </h3>
                  <p className="text-sm text-gray-500">
                    Confirme a exclusão deste perfil
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                disabled={loading}
                className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="bg-white px-6 py-6">
            {/* Error Alert */}
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      Erro ao excluir perfil
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
                      {error}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Warning */}
            <div className="mb-6">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                    <ShieldCheckIcon className="h-6 w-6 text-red-600" />
                  </div>
                </div>
                <div>
                  <h4 className="text-lg font-medium text-gray-900">
                    {perfil.name}
                  </h4>
                  <p className="text-sm text-gray-500">
                    {perfil.description}
                  </p>
                </div>
              </div>
            </div>

            {/* Warning Message */}
            {perfil.userCount > 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <ExclamationTriangleIcon className="h-5 w-5 text-amber-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-amber-800">
                      Perfil em uso
                    </h3>
                    <div className="mt-2 text-sm text-amber-700">
                      Este perfil está sendo usado por <strong>{perfil.userCount} usuário{perfil.userCount !== 1 ? 's' : ''}</strong> e não pode ser excluído.
                      <br />
                      <br />
                      Para excluir este perfil, você deve primeiro:
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>Reatribuir os usuários para outro perfil, ou</li>
                        <li>Excluir os usuários que usam este perfil</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      Ação irreversível
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
                      Esta ação não pode ser desfeita. O perfil será permanentemente removido do sistema.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 flex flex-col sm:flex-row-reverse sm:space-x-3 sm:space-x-reverse">
            {perfil.userCount === 0 && (
              <button
                onClick={handleDelete}
                disabled={loading}
                className="w-full sm:w-auto inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Excluindo...
                  </>
                ) : (
                  'Excluir Perfil'
                )}
              </button>
            )}
            
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="mt-3 sm:mt-0 w-full sm:w-auto inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {perfil.userCount > 0 ? 'Entendi' : 'Cancelar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}








