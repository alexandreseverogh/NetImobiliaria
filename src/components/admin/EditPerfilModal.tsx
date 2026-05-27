'use client';

import { useState, useEffect, useCallback } from 'react';
import { XMarkIcon, ShieldCheckIcon, AdjustmentsHorizontalIcon, GlobeAltIcon } from '@heroicons/react/24/outline';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/hooks/useAuth';
import PermissoesEditor from './PermissoesEditor';

interface Perfil {
  id: number;
  name: string;
  description: string;
  level: number;
  is_system_role?: boolean;
  user_count?: number;
  permissions?: Record<string, string[]>;
  custom_fields?: CustomField[];
}

interface CustomField {
  id?: number;
  name: string;
  label: string;
  type: string;
  mask?: string;
  required: boolean;
  options?: string;
}

interface EditPerfilModalProps {
  isOpen: boolean;
  perfil: Perfil | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface EditPerfilData {
  name: string;
  description: string;
  level: number;
  is_system_role: boolean;
  permissions: Record<string, string[]>;
  custom_fields: CustomField[];
}

export default function EditPerfilModal({ isOpen, perfil, onClose, onSuccess }: EditPerfilModalProps) {
  const { user: currentUser } = useAuth();
  const { get, put } = useApi();
  const [formData, setFormData] = useState<EditPerfilData>({
    name: '',
    description: '',
    level: 1,
    is_system_role: false,
    permissions: {},
    custom_fields: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionsLoading, setPermissionsLoading] = useState(false);

  const fetchUpdatedPermissions = useCallback(async () => {
    if (!perfil) return;
    
    try {
      setPermissionsLoading(true);
      console.log('🔍 DEBUG - Buscando permissões atualizadas para perfil ID:', perfil.id);
      
      const response = await get(`/api/admin/perfis/${perfil.id}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('🔍 DEBUG - Permissões atualizadas recebidas:', data.perfil?.permissions);
        console.log('🔍 DEBUG - Permissão específica para "Categorias":', data.perfil?.permissions?.['Categorias']);
        
        const perfilData = data.perfil || data;
        setFormData({
          name: perfilData.name || '',
          description: perfilData.description || '',
          level: perfilData.level || 1,
          is_system_role: perfilData.is_system_role || false,
          permissions: perfilData.permissions || {},
          custom_fields: (perfilData.custom_fields || []).map((f: any) => ({
            id: f.id,
            name: f.field_name,
            label: f.field_label,
            type: f.field_type,
            required: f.is_required,
            options: f.field_options
          }))
        });
      } else {
        console.error('Erro ao buscar permissões atualizadas:', response.status);
      }
    } catch (error) {
      console.error('Erro ao buscar permissões atualizadas:', error);
    } finally {
      setPermissionsLoading(false);
    }
  }, [get, perfil]);

  useEffect(() => {
    if (perfil && isOpen) {
      setFormData({
        name: perfil.name,
        description: perfil.description,
        level: perfil.level || 1,
        is_system_role: perfil.is_system_role || false,
        permissions: perfil.permissions ? { ...perfil.permissions } : {},
        custom_fields: perfil.custom_fields ? [...perfil.custom_fields] : []
      });
      
      // Buscar permissões atualizadas da API
      fetchUpdatedPermissions();
    }
  }, [perfil, isOpen, fetchUpdatedPermissions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Nome do perfil é obrigatório');
      return;
    }

    if (!formData.description.trim()) {
      setError('Descrição é obrigatória');
      return;
    }

    // Validar atributos dinâmicos
    for (const field of formData.custom_fields) {
      if (!field.name.trim() || !field.label.trim()) {
        setError('Todos os atributos dinâmicos devem ter nome e etiqueta preenchidos');
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);

      const response = await put(`/api/admin/perfis/${perfil?.id}`, formData);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Erro ${response.status}: ${response.statusText}`);
      }

      onSuccess();
    } catch (err) {
      console.error('Erro ao atualizar perfil:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof EditPerfilData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePermissionsChange = (permissions: Record<string, string[]>) => {
    setFormData(prev => ({
      ...prev,
      permissions
    }));
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
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          {/* Header */}
          <div className="bg-white px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <ShieldCheckIcon className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Editar Perfil: {perfil?.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Modifique as permissões de acesso para este perfil
                  </p>
                  {perfil && (perfil.user_count || 0) > 0 && (
                    <p className="text-xs text-amber-600 mt-1">
                      ⚠️ Este perfil está sendo usado por {perfil.user_count} usuário{perfil.user_count !== 1 ? 's' : ''}
                    </p>
                  )}
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

          {/* Form */}
          <form onSubmit={handleSubmit}>
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
                        Erro ao atualizar perfil
                      </h3>
                      <div className="mt-2 text-sm text-red-700">
                        {error}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Nome do Perfil *
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                    placeholder="Ex: Supervisor, Analista, etc."
                    disabled={loading}
                    autoComplete="off"
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                    Descrição *
                  </label>
                  <input
                    type="text"
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                    placeholder="Descrição do perfil e responsabilidades"
                    disabled={loading}
                    autoComplete="off"
                  />
                </div>
              </div>

              {/* Advanced Governance (Hierarchy & System Level) */}
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 mb-8">
                 <div className="flex items-center gap-2 mb-4 text-slate-800">
                    <AdjustmentsHorizontalIcon className="h-5 w-5" />
                    <span className="font-semibold">Governança e Hierarquia</span>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
                    <div>
                      <div className="flex justify-between mb-2">
                        <label className="text-sm font-medium text-slate-700">Nível de Hierarquia (1-{Math.max(perfil?.level || 0, (currentUser?.is_system_role ? 1000 : (currentUser?.role_level || 100) - 1))})</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="1"
                            max={Math.max(perfil?.level || 0, (currentUser?.is_system_role ? 1000 : (currentUser?.role_level || 100) - 1))}
                            value={formData.level}
                            onChange={(e) => setFormData(prev => ({ ...prev, level: parseInt(e.target.value) || 1 }))}
                            className="w-16 px-2 py-0.5 text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max={Math.max(perfil?.level || 0, (currentUser?.is_system_role ? 1000 : (currentUser?.role_level || 100) - 1))}
                        value={formData.level}
                        onChange={(e) => setFormData(prev => ({ ...prev, level: parseInt(e.target.value) }))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                      <div className="flex justify-between mt-1 text-[10px] text-slate-400 font-medium">
                        <span>Operacional (1)</span>
                        <span>Seu Limite ({Math.max(perfil?.level || 0, (currentUser?.is_system_role ? 1000 : (currentUser?.role_level || 100) - 1))})</span>
                      </div>
                      <p className="mt-2 text-[11px] text-slate-500 italic">
                        * Perfis com este nível poderão ser gerenciados por você e por perfis acima do nível {formData.level}.
                      </p>
                    </div>

                    {currentUser?.is_system_role && (
                      <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${formData.is_system_role ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                            <GlobeAltIcon className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-700">Perfil de Plataforma</p>
                            <p className="text-[11px] text-slate-500">Acesso Master Multi-Tenant</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={formData.is_system_role}
                            onChange={(e) => setFormData(prev => ({ ...prev, is_system_role: e.target.checked }))}
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>
                    )}
                 </div>
              </div>

              {/* Atributos Dinâmicos (Metadata) */}
              <div className="mb-8 border-t border-slate-200 pt-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-slate-800">
                    <AdjustmentsHorizontalIcon className="h-5 w-5" />
                    <span className="font-semibold">Atributos Dinâmicos (Metadata)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const newField: CustomField = { name: '', label: '', type: 'text', required: false };
                      setFormData(prev => ({ ...prev, custom_fields: [...prev.custom_fields, newField] }));
                    }}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    + Adicionar Atributo
                  </button>
                </div>
                
                <p className="text-xs text-slate-500 mb-4">
                  Configure campos adicionais que serão solicitados no formulário de usuários que possuírem este perfil (ex: CRECI, CRM, Registro Profissional).
                </p>

                <div className="space-y-3">
                  {formData.custom_fields.length === 0 ? (
                    <div className="text-center py-6 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                      <p className="text-xs text-slate-400">Nenhum atributo dinâmico configurado.</p>
                    </div>
                  ) : (
                    formData.custom_fields.map((field, index) => (
                      <div key={index} className="grid grid-cols-12 gap-3 p-3 bg-white border border-slate-200 rounded-lg shadow-sm items-center">
                        <div className="col-span-3">
                          <input
                            type="text"
                            placeholder="Nome (ex: creci)"
                            value={field.name}
                            onChange={(e) => {
                              const newFields = [...formData.custom_fields];
                              newFields[index].name = e.target.value.toLowerCase().replace(/\s/g, '_');
                              setFormData(prev => ({ ...prev, custom_fields: newFields }));
                            }}
                            className="w-full text-xs px-2 py-1.5 border rounded"
                          />
                        </div>
                        <div className="col-span-3">
                          <input
                            type="text"
                            placeholder="Etiqueta (ex: Registro CRECI)"
                            value={field.label}
                            onChange={(e) => {
                              const newFields = [...formData.custom_fields];
                              newFields[index].label = e.target.value;
                              setFormData(prev => ({ ...prev, custom_fields: newFields }));
                            }}
                            className="w-full text-xs px-2 py-1.5 border rounded"
                          />
                        </div>
                        <div className="col-span-2">
                            <select
                              value={field.type}
                              onChange={(e) => {
                                const newFields = [...formData.custom_fields];
                                newFields[index].type = e.target.value;
                                if (e.target.value === 'select' && !newFields[index].options) {
                                  newFields[index].options = '';
                                }
                                setFormData(prev => ({ ...prev, custom_fields: newFields }));
                              }}
                              className="w-full text-xs px-2 py-1.5 border rounded"
                            >
                              <option value="text">Texto</option>
                              <option value="number">Número</option>
                              <option value="date">Data</option>
                              <option value="select">Seleção (Enum)</option>
                              <option value="boolean">Sim / Não (Boolean)</option>
                            </select>
                          </div>
                          
                          {field.type === 'select' && (
                            <div className="col-span-12 mt-1">
                              <label className="block text-[9px] font-bold text-blue-500 uppercase">Opções (separe por vírgula)</label>
                              <input
                                type="text"
                                value={field.options || ''}
                                onChange={(e) => {
                                  const newFields = [...formData.custom_fields];
                                  newFields[index].options = e.target.value;
                                  setFormData(prev => ({ ...prev, custom_fields: newFields }));
                                }}
                                className="w-full text-[10px] px-2 py-1 bg-blue-50 border border-blue-100 rounded"
                                placeholder="ex: Opção 1, Opção 2"
                              />
                            </div>
                          )}
                        <div className="col-span-2">
                          <input
                            type="text"
                            placeholder="Máscara (ex: ##.###-F)"
                            value={field.mask || ''}
                            onChange={(e) => {
                              const newFields = [...formData.custom_fields];
                              newFields[index].mask = e.target.value;
                              setFormData(prev => ({ ...prev, custom_fields: newFields }));
                            }}
                            className="w-full text-xs px-2 py-1.5 border rounded"
                          />
                        </div>
                        <div className="col-span-1 flex justify-center">
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={field.required}
                              onChange={(e) => {
                                const newFields = [...formData.custom_fields];
                                newFields[index].required = e.target.checked;
                                setFormData(prev => ({ ...prev, custom_fields: newFields }));
                              }}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-[10px] text-slate-500">Obrig.</span>
                          </label>
                        </div>
                        <div className="col-span-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              const newFields = formData.custom_fields.filter((_, i) => i !== index);
                              setFormData(prev => ({ ...prev, custom_fields: newFields }));
                            }}
                            className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Permissions Editor */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">
                  Permissões de Acesso
                </h4>
                <PermissoesEditor
                  permissions={formData.permissions}
                  onChange={handlePermissionsChange}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 flex flex-col sm:flex-row-reverse sm:space-x-3 sm:space-x-reverse">
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Salvando...
                  </>
                ) : (
                  'Salvar Alterações'
                )}
              </button>
              
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="mt-3 sm:mt-0 w-full sm:w-auto inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}








