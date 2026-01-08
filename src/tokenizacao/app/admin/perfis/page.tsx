/* eslint-disable */
'use client';

import { useState, useEffect } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, ShieldCheckIcon, UsersIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/hooks/useAuth';
import PermissionGuard from '@/components/admin/PermissionGuard';
import CreatePerfilModal from '@/components/admin/CreatePerfilModal';
import EditPerfilModal from '@/components/admin/EditPerfilModal';
import DeletePerfilModal from '@/components/admin/DeletePerfilModal';
import ManagePerfilUsersModal from '@/components/admin/ManagePerfilUsersModal';

interface Perfil {
  id: number;
  name: string;
  description: string;
  userCount: number;
  permissions: Record<string, string>;
}

export default function PerfisPage() {
  const { user } = useAuth();
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showManageUsersModal, setShowManageUsersModal] = useState(false);
  const [selectedPerfil, setSelectedPerfil] = useState<Perfil | null>(null);

  useEffect(() => {
    fetchPerfis();
  }, []);

  const fetchPerfis = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/perfis');
      
      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setPerfis(data.perfis || []);
      setError(null);
    } catch (err) {
      console.error('Erro ao buscar perfis:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePerfil = () => {
    setShowCreateModal(true);
  };

  const handleEditPerfil = (perfil: Perfil) => {
    setSelectedPerfil(perfil);
    setShowEditModal(true);
  };

  const handleDeletePerfil = (perfil: Perfil) => {
    setSelectedPerfil(perfil);
    setShowDeleteModal(true);
  };

  const handleManageUsers = (perfil: Perfil) => {
    setSelectedPerfil(perfil);
    setShowManageUsersModal(true);
  };

  const handleModalClose = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setShowDeleteModal(false);
    setShowManageUsersModal(false);
    setSelectedPerfil(null);
  };

  const handlePerfilCreated = () => {
    handleModalClose();
    fetchPerfis();
  };

  const handlePerfilUpdated = () => {
    handleModalClose();
    fetchPerfis();
  };

  const handlePerfilDeleted = () => {
    handleModalClose();
    fetchPerfis();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <ShieldCheckIcon className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Gerenciar Perfis</h1>
                <p className="text-gray-600 mt-1">
                  Configure perfis de usuÃ¡rio e suas permissÃµes de acesso
                </p>
              </div>
            </div>
            
            <PermissionGuard resource="usuarios" action="WRITE">
              <button
                onClick={handleCreatePerfil}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Novo Perfil
              </button>
            </PermissionGuard>
          </div>
        </div>

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
                  Erro ao carregar perfis
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  {error}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Perfis List */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          {perfis.length === 0 ? (
            <div className="text-center py-12">
              <ShieldCheckIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum perfil encontrado</h3>
              <p className="mt-1 text-sm text-gray-500">
                Comece criando o primeiro perfil de usuÃ¡rio.
              </p>
              <div className="mt-6">
                <PermissionGuard resource="usuarios" action="WRITE">
                  <button
                    onClick={handleCreatePerfil}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Criar Perfil
                  </button>
                </PermissionGuard>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {perfis.map((perfil) => (
                <li key={perfil.id} className="px-6 py-4 hover:bg-gray-50 transition-colors duration-150">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <ShieldCheckIcon className="h-6 w-6 text-blue-600" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {perfil.name}
                          </p>
                          <p className="text-sm text-gray-500 truncate">
                            {perfil.description}
                          </p>
                          <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500">
                            <span className="flex items-center">
                              <span className="w-2 h-2 bg-green-400 rounded-full mr-1"></span>
                              {perfil.userCount} usuÃ¡rio{perfil.userCount !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <PermissionGuard resource="usuarios" action="READ">
                        <button
                          onClick={() => handleManageUsers(perfil)}
                          className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                        >
                          <UsersIcon className="h-4 w-4 mr-1" />
                          UsuÃ¡rios
                        </button>
                      </PermissionGuard>
                      
                      <PermissionGuard resource="usuarios" action="WRITE">
                        <button
                          onClick={() => handleEditPerfil(perfil)}
                          className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                        >
                          <PencilIcon className="h-4 w-4 mr-1" />
                          Editar
                        </button>
                      </PermissionGuard>
                      
                      <PermissionGuard resource="usuarios" action="DELETE">
                        <button
                          onClick={() => handleDeletePerfil(perfil)}
                          disabled={perfil.userCount > 0}
                          className={`inline-flex items-center px-3 py-1.5 border text-xs font-medium rounded transition-colors duration-200 ${
                            perfil.userCount > 0
                              ? 'border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed'
                              : 'border-red-300 text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500'
                          }`}
                        >
                          <TrashIcon className="h-4 w-4 mr-1" />
                          Excluir
                        </button>
                      </PermissionGuard>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreatePerfilModal
          isOpen={showCreateModal}
          onClose={handleModalClose}
          onSuccess={handlePerfilCreated}
        />
      )}

      {showEditModal && selectedPerfil && (
        <EditPerfilModal
          isOpen={showEditModal}
          perfil={selectedPerfil}
          onClose={handleModalClose}
          onSuccess={handlePerfilUpdated}
        />
      )}

      {showDeleteModal && selectedPerfil && (
        <DeletePerfilModal
          isOpen={showDeleteModal}
          perfil={selectedPerfil}
          onClose={handleModalClose}
          onSuccess={handlePerfilDeleted}
        />
      )}

      {showManageUsersModal && selectedPerfil && (
        <ManagePerfilUsersModal
          isOpen={showManageUsersModal}
          perfil={selectedPerfil}
          onClose={handleModalClose}
          onSuccess={handlePerfilUpdated}
        />
      )}
    </div>
  );
}



