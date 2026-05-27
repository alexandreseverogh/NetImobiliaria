'use client';

import { useState } from 'react';
import { XMarkIcon, ShieldCheckIcon, AdjustmentsHorizontalIcon, GlobeAltIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/hooks/useAuth';
import { useApi } from '@/hooks/useApi';
import PermissoesEditor from './PermissoesEditor';

interface CreatePerfilModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface CreatePerfilData {
  name: string;
  description: string;
  level: number;
  is_system_role: boolean;
  permissions: Record<string, string[]>;
  custom_fields: any[];
}

export default function CreatePerfilModal({ isOpen, onClose, onSuccess }: CreatePerfilModalProps) {
  const { user: currentUser } = useAuth();
  const { post } = useApi();
  const [formData, setFormData] = useState<CreatePerfilData>({
    name: '',
    description: '',
    level: 1,
    is_system_role: false,
    permissions: {},
    custom_fields: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    console.log('📝 [CreatePerfilModal] handleSubmit iniciado');
    e.preventDefault();
    
    if (!formData.name.trim()) {
      console.warn('⚠️ [CreatePerfilModal] Nome do perfil vazio');
      setError('Nome do perfil é obrigatório');
      return;
    }

    if (!formData.description.trim()) {
      console.warn('⚠️ [CreatePerfilModal] Descrição vazia');
      setError('Descrição é obrigatória');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('🚀 [CreatePerfilModal] Enviando dados para API:', formData);

      const response = await post('/api/admin/perfis', formData);
      console.log('📡 [CreatePerfilModal] Resposta da API:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ [CreatePerfilModal] Erro retornado pela API:', errorData);
        throw new Error(errorData.message || `Erro ${response.status}: ${response.statusText}`);
      }

      console.log('✅ [CreatePerfilModal] Perfil criado com sucesso!');
      onSuccess();
    } catch (err) {
      console.error('💥 [CreatePerfilModal] Erro crítico no handleSubmit:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof CreatePerfilData, value: string) => {
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
      setFormData({
        name: '',
        description: '',
        level: 1,
        is_system_role: false,
        permissions: {},
        custom_fields: []
      });
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
                    Criar Novo Perfil
                  </h3>
                  <p className="text-sm text-gray-500">
                    Configure as permissões de acesso para este perfil
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
                        Erro ao criar perfil
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
                        <label className="text-sm font-medium text-slate-700">Nível de Hierarquia (1-{currentUser?.is_system_role ? '1000' : (currentUser?.role_level || 100) - 1})</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="1"
                            max={currentUser?.is_system_role ? 1000 : (currentUser?.role_level || 100) - 1}
                            value={formData.level}
                            onChange={(e) => setFormData(prev => ({ ...prev, level: parseInt(e.target.value) || 1 }))}
                            className="w-16 px-2 py-0.5 text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max={currentUser?.is_system_role ? 1000 : (currentUser?.role_level || 100) - 1}
                        value={formData.level}
                        onChange={(e) => setFormData(prev => ({ ...prev, level: parseInt(e.target.value) }))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                      <div className="flex justify-between mt-1 text-[10px] text-slate-400 font-medium">
                        <span>Operacional (1)</span>
                        <span>Seu Limite ({currentUser?.is_system_role ? '1000' : (currentUser?.role_level || 100) - 1})</span>
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
               <div className="bg-blue-50 rounded-xl p-5 border border-blue-200 mb-8">
                 <div className="flex items-center justify-between mb-4">
                   <div className="flex items-center gap-2 text-blue-800">
                     <AdjustmentsHorizontalIcon className="h-5 w-5" />
                     <span className="font-semibold">Atributos Dinâmicos (Metadata)</span>
                   </div>
                   <button
                     type="button"
                     onClick={() => {
                       setFormData(prev => ({
                         ...prev,
                         custom_fields: [
                           ...prev.custom_fields,
                           { name: '', label: '', type: 'text', required: false, mask: '' }
                         ]
                       }))
                     }}
                     className="px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-all flex items-center gap-1"
                   >
                     <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                     </svg>
                     ADICIONAR ATRIBUTO
                   </button>
                 </div>

                 {formData.custom_fields.length === 0 ? (
                   <div className="text-center py-6 bg-white/50 rounded-lg border border-dashed border-blue-200">
                     <p className="text-xs text-blue-400 font-medium italic">Nenhum campo dinâmico configurado. Clique para adicionar (ex: CRECI, CRM, etc.)</p>
                   </div>
                 ) : (
                   <div className="space-y-3">
                     {formData.custom_fields.map((field, index) => (
                       <div key={index} className="grid grid-cols-12 gap-3 items-end bg-white p-3 rounded-lg shadow-sm border border-blue-100">
                         <div className="col-span-3">
                           <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Nome Técnico (BD)</label>
                           <input
                             type="text"
                             value={field.name}
                             onChange={(e) => {
                               const newFields = [...formData.custom_fields]
                               newFields[index].name = e.target.value.toLowerCase().replace(/\s/g, '_')
                               setFormData(prev => ({ ...prev, custom_fields: newFields }))
                             }}
                             className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-blue-500"
                             placeholder="ex: numero_creci"
                           />
                         </div>
                         <div className="col-span-3">
                           <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Etiqueta (Label)</label>
                           <input
                             type="text"
                             value={field.label}
                             onChange={(e) => {
                               const newFields = [...formData.custom_fields]
                               newFields[index].label = e.target.value
                               setFormData(prev => ({ ...prev, custom_fields: newFields }))
                             }}
                             className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-blue-500"
                             placeholder="ex: Registro CRECI"
                           />
                         </div>
                          <div className="col-span-2">
                            <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Tipo</label>
                            <select
                              value={field.type}
                              onChange={(e) => {
                                const newFields = [...formData.custom_fields]
                                newFields[index].type = e.target.value
                                // Inicializar options se for select
                                if (e.target.value === 'select' && !newFields[index].options) {
                                  newFields[index].options = ''
                                }
                                setFormData(prev => ({ ...prev, custom_fields: newFields }))
                              }}
                              className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="text">Texto</option>
                              <option value="number">Número</option>
                              <option value="date">Data</option>
                              <option value="select">Seleção (Enum)</option>
                            </select>
                          </div>

                          {field.type === 'select' && (
                            <div className="col-span-12 mt-2">
                              <label className="block text-[10px] font-black text-blue-500 uppercase mb-1">Opções da Seleção (separe por vírgula)</label>
                              <input
                                type="text"
                                value={field.options || ''}
                                onChange={(e) => {
                                  const newFields = [...formData.custom_fields]
                                  newFields[index].options = e.target.value
                                  setFormData(prev => ({ ...prev, custom_fields: newFields }))
                                }}
                                className="w-full px-2 py-1.5 text-xs border border-blue-200 bg-blue-50 rounded focus:ring-1 focus:ring-blue-500"
                                placeholder="Ex: Opção 1, Opção 2, Opção 3"
                              />
                            </div>
                          )}

                         <div className="col-span-2 flex items-center gap-2 mb-2">
                           <input
                             type="checkbox"
                             id={`req-${index}`}
                             checked={field.required}
                             onChange={(e) => {
                               const newFields = [...formData.custom_fields]
                               newFields[index].required = e.target.checked
                               setFormData(prev => ({ ...prev, custom_fields: newFields }))
                             }}
                             className="h-3 w-3 text-blue-600 rounded"
                           />
                           <label htmlFor={`req-${index}`} className="text-[10px] font-bold text-slate-600 uppercase">Obrigatório</label>
                         </div>
                         <div className="col-span-2 flex justify-end">
                           <button
                             type="button"
                             onClick={() => {
                               const newFields = formData.custom_fields.filter((_, i) => i !== index)
                               setFormData(prev => ({ ...prev, custom_fields: newFields }))
                             }}
                             className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                           >
                             <XMarkIcon className="h-4 w-4" />
                           </button>
                         </div>
                       </div>
                     ))}
                   </div>
                 )}
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
                    Criando...
                  </>
                ) : (
                  'Criar Perfil'
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








