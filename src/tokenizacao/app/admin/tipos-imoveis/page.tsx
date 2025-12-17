'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { PencilIcon } from '@heroicons/react/24/outline';

interface TipoImovel {
  id: number;
  nome: string;
  descricao: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export default function TiposImoveisPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const [tipos, setTipos] = useState<TipoImovel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('🔍 TiposImoveisPage: useEffect executado');
    console.log('🔍 TiposImoveisPage: user:', user);
    
    if (!user) {
      console.log('🔍 TiposImoveisPage: Usuário não logado, redirecionando para login');
      router.push('/admin/login');
      return;
    }

    // Temporariamente remover verificação de permissão para testar
    console.log('🔍 TiposImoveisPage: Buscando tipos (sem verificação de permissão)');
    fetchTipos();
  }, [user, router]);

  const fetchTipos = async () => {
    try {
      const response = await fetch('/api/admin/tipos-imoveis');
      if (!response.ok) {
        throw new Error('Erro ao carregar tipos de imóveis');
      }
      const data = await response.json();
      setTipos(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (id: number) => {
    router.push(`/admin/tipos-imoveis/${id}/editar`);
  };

  const handleCreate = () => {
    console.log('🔍 TiposImoveisPage: handleCreate chamado');
    console.log('🔍 TiposImoveisPage: hasPermission WRITE:', hasPermission('tipos-imoveis', 'WRITE'));
    router.push('/admin/tipos-imoveis/novo');
  };

  const handleToggleStatus = async (id: number, ativo: boolean) => {
    try {
      const response = await fetch(`/api/admin/tipos-imoveis/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ativo: !ativo }),
      });

      if (!response.ok) {
        throw new Error('Erro ao alterar status');
      }

      setTipos(tipos.map(tipo => 
        tipo.id === id ? { ...tipo, ativo: !ativo } : tipo
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tipos de Imóveis</h1>
        <button
          onClick={handleCreate}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Novo Tipo
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nome
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Descrição
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tipos.map((tipo) => (
              <tr key={tipo.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {tipo.nome}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {tipo.descricao || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    tipo.ativo 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {tipo.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button
                    onClick={() => handleEdit(tipo.id)}
                    className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                    title="Editar"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleToggleStatus(tipo.id, tipo.ativo)}
                    className={`${
                      tipo.ativo 
                        ? 'text-red-600 hover:text-red-900' 
                        : 'text-green-600 hover:text-green-900'
                    }`}
                  >
                    {tipo.ativo ? 'Desativar' : 'Ativar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
