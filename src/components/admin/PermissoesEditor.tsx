'use client';

import { useState, useEffect, useCallback } from 'react';
import { ShieldCheckIcon, CheckIcon, BoltIcon, EyeIcon, PlusCircleIcon, PencilSquareIcon, TrashIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/hooks/useAuth';

interface PermissoesEditorProps {
  permissions: Record<string, string[]>;
  onChange: (permissions: Record<string, string[]>) => void;
  disabled?: boolean;
}

interface SystemFeature {
  id: number;
  name: string;
  slug: string;
  description: string;
  category: string;
  available_actions?: string[];
}

// Fallback de contingência caso a API caia, com a nova propriedade available_actions
const DEFAULT_FEATURES: SystemFeature[] = [
  { id: 1, name: 'Imóveis', slug: 'imoveis', description: 'Gestão de propriedades', category: 'imoveis', available_actions: ['create', 'read', 'update', 'delete'] },
  { id: 6, name: 'Usuários', slug: 'usuarios', description: 'Gestão de usuários do sistema', category: 'usuarios', available_actions: ['create', 'read', 'update', 'delete', 'admin'] },
];

/**
 * Mapeamento Semântico Premium para Ações do Banco
 * Padroniza cores, ícones e descrições para verbos isolados
 */
const ACTION_THEME: Record<string, { label: string; color: string; bg: string; icon: any; order: number }> = {
  read: { label: 'Visualizar', color: 'text-blue-700', bg: 'bg-blue-50 hover:bg-blue-100 border-blue-200', icon: EyeIcon, order: 1 },
  list: { label: 'Listar', color: 'text-blue-700', bg: 'bg-blue-50 hover:bg-blue-100 border-blue-200', icon: EyeIcon, order: 2 },
  execute: { label: 'Executar', color: 'text-purple-700', bg: 'bg-purple-50 hover:bg-purple-100 border-purple-200', icon: BoltIcon, order: 3 },
  create: { label: 'Criar', color: 'text-emerald-700', bg: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200', icon: PlusCircleIcon, order: 4 },
  update: { label: 'Editar', color: 'text-amber-700', bg: 'bg-amber-50 hover:bg-amber-100 border-amber-200', icon: PencilSquareIcon, order: 5 },
  delete: { label: 'Apagar', color: 'text-rose-700', bg: 'bg-rose-50 hover:bg-rose-100 border-rose-200', icon: TrashIcon, order: 6 },
  admin: { label: 'Full Admin', color: 'text-indigo-700', bg: 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200', icon: ShieldCheckIcon, order: 7 },
  DEFAULT: { label: 'Permissão', color: 'text-slate-700', bg: 'bg-slate-50 hover:bg-slate-100 border-slate-200', icon: CheckIcon, order: 99 },
};

/**
 * Mapeamento de hierarquia para filtro de herança
 */
const HIERARCHY_MAP: Record<string, number> = {
  'read': 1, 'list': 1,
  'execute': 2,
  'create': 3, 'update': 4,
  'delete': 5,
  'admin': 10
};

const SEMANTIC_TO_HIERARCHY: Record<string, number> = {
  'READ': 1,
  'EXECUTE': 2,
  'CREATE': 3,
  'UPDATE': 4,
  'DELETE': 5,
  'ADMIN': 10,
  'NONE': 0
};

export default function PermissoesEditor({ permissions = {}, onChange, disabled = false }: PermissoesEditorProps) {
  const { get } = useApi();
  const { user: currentUser } = useAuth();
  const [localPermissions, setLocalPermissions] = useState<Record<string, string[]>>({});
  const [features, setFeatures] = useState<SystemFeature[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFeatures = useCallback(async () => {
    try {
      setLoading(true);
      const response = await get('/api/admin/system-features');
      
      if (response.ok) {
        const data = await response.json();
        setFeatures(data.features || []);
      } else {
        console.error('Erro ao buscar funcionalidades:', response.status);
        setFeatures(DEFAULT_FEATURES);
      }
    } catch (error) {
      console.error('Erro ao buscar funcionalidades:', error);
      setFeatures(DEFAULT_FEATURES);
    } finally {
      setLoading(false);
    }
  }, [get]);

  useEffect(() => {
    fetchFeatures();
  }, [fetchFeatures]);

  useEffect(() => {
    if (features.length > 0) {
      // Sincronizar o estado local mantendo os arrays puros vindos das props
      const initialPermissions: Record<string, string[]> = {};
      features.forEach(feature => {
        initialPermissions[feature.name] = permissions[feature.name] || [];
      });
      setLocalPermissions(initialPermissions);
    }
  }, [permissions, features]);

  const toggleAction = (featureName: string, actionName: string) => {
    if (disabled) return;
    
    setLocalPermissions(prev => {
      const currentActions = prev[featureName] ? [...prev[featureName]] : [];
      let newActions;
      
      if (currentActions.includes(actionName)) {
        // Remover ação
        newActions = currentActions.filter(a => a !== actionName);
      } else {
        // Adicionar ação
        newActions = [...currentActions, actionName];
      }
      
      const newPermissions = {
        ...prev,
        [featureName]: newActions
      };
      
      onChange(newPermissions);
      return newPermissions;
    });
  };

  const getTheme = (actionName: string) => {
    return ACTION_THEME[actionName.toLowerCase()] || { ...ACTION_THEME.DEFAULT, label: actionName.toUpperCase() };
  };

  return (
    <div className="space-y-8">
      {/* Elegante Resumo Conceitual */}
      <div className="bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-xl p-5 border border-slate-200/60 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 p-2 bg-blue-100/50 rounded-lg text-blue-600">
            <ShieldCheckIcon className="w-5 h-5" />
          </div>
          <div>
            <h5 className="text-sm font-semibold text-slate-800 mb-1">Engenharia de Permissões Granulares</h5>
            <p className="text-xs leading-relaxed text-slate-600 max-w-3xl">
              Molde estritamente o que este perfil pode fazer. Diferente de sistemas comuns, selecione apenas as ações exatas 
              desejadas. Os usuários vinculados a este perfil herdarão <strong className="font-medium text-slate-800">exatamente</strong> as chaves ativadas abaixo, sem concessões extras implícitas.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-sm text-slate-500 font-medium">Renderizando matrizes...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-6">
          {features.map((feature) => {
            const isMaster = !!currentUser?.is_system_role;
            const rawAvailableActions = feature.available_actions || [];
            // Remover duplicatas
            const availableActions = Array.from(new Set(rawAvailableActions));
            
            // Se a funcionalidade não tem ações, não faz sentido exibi-la para edição
            if (availableActions.length === 0) return null;

            const rawActions = localPermissions[feature.name] || [];
            const activeActions = Array.isArray(rawActions) 
              ? rawActions.filter(a => availableActions.includes(a))
              : [];
            
            const userPermissionLevel = currentUser?.is_system_role 
              ? 100 
              : SEMANTIC_TO_HIERARCHY[currentUser?.permissoes?.[feature.slug] || currentUser?.permissoes?.[feature.name] || 'NONE'];

            // Filtrar ações que o usuário atual tem autoridade para conceder
            const allowedActions = availableActions.filter(action => {
              const actionLevel = HIERARCHY_MAP[action.toLowerCase()] || 0;
              return isMaster || actionLevel <= userPermissionLevel;
            });

            if (!isMaster && allowedActions.length === 0 && availableActions.length > 0) return null;

            // Ordenar botões logicamente
            const sortedActions = [...availableActions].sort((a, b) => {
              const orderA = getTheme(a).order;
              const orderB = getTheme(b).order;
              return orderA - orderB;
            });

            return (
              <div 
                key={feature.id}
                className="group relative bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-2xl hover:shadow-blue-500/10 hover:border-blue-400/50 transition-all duration-500 flex flex-col"
              >
                {/* Accent Decorativo Superior */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 opacity-70 group-hover:opacity-100 transition-opacity"></div>
                {/* Cabeçalho do Card */}
                <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 group-hover:bg-blue-50/20 transition-colors">
                  <div className="flex justify-between items-start">
                    <h4 className="text-sm font-bold text-slate-800 tracking-tight">
                      {feature.name}
                    </h4>
                    {/* Badge contador elegante */}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${activeActions.length > 0 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                      {activeActions.length}/{availableActions.length} acionados
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {feature.description}
                  </p>
                </div>

                {/* Área de Checkboxes Modulares */}
                <div className="p-5">
                  {sortedActions.length === 0 ? (
                    <div className="text-center py-4 text-xs italic text-slate-400">
                      Nenhuma ação controlada identificada para este módulo.
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2.5">
                      {sortedActions.map((action) => {
                        const theme = getTheme(action);
                        const isSelected = activeActions.includes(action);
                        const Icon = theme.icon;
                        const isAllowed = isMaster || (HIERARCHY_MAP[action.toLowerCase()] || 0) <= userPermissionLevel;

                        return (
                          <button
                            key={action}
                            type="button"
                            disabled={disabled || !isAllowed}
                            onClick={() => toggleAction(feature.name, action)}
                            title={!isAllowed ? `Você não tem permissão de ${action} para conceder este nível.` : ''}
                            className={`
                              relative flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold
                              transition-all duration-200 ease-in-out select-none focus:outline-none focus:ring-2 focus:ring-offset-1
                              ${disabled || !isAllowed ? 'opacity-50 cursor-not-allowed bg-slate-100 grayscale' : 'cursor-pointer'}
                              ${isSelected 
                                ? `ring-1 ring-offset-0 border-transparent shadow-sm ${theme.bg} ${theme.color} ring-current` 
                                : isAllowed ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-700' : 'border-slate-200 text-slate-400'
                              }
                            `}
                          >
                            {isAllowed ? (
                              <Icon className={`w-3.5 h-3.5 ${isSelected ? 'opacity-100' : 'opacity-70'}`} />
                            ) : (
                              <LockClosedIcon className="w-3.5 h-3.5 opacity-50" />
                            )}
                            <span>{theme.label}</span>
                            
                            {/* Micro Check Indicator */}
                            {isSelected && (
                              <div className="absolute -top-1 -right-1 bg-blue-600 text-white rounded-full p-0.5 shadow-sm">
                                <CheckIcon className="w-2.5 h-2.5" strokeWidth={3} />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
