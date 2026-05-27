'use client';

import React, { useState, useEffect } from 'react';
import { 
  ShieldCheckIcon, 
  XCircleIcon, 
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  CheckCircleIcon,
  TableCellsIcon,
  SparklesIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

interface AuditGovernanceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AuditConfig {
  table_name: string;
  module_id: string | null;
  enrichment_type: 'NONE' | 'UNIVERSAL' | 'PREMIUM';
  premium_component_id?: string;
  is_active: boolean;
  module_name?: string;
}

export default function AuditGovernanceModal({ isOpen, onClose }: AuditGovernanceModalProps) {
  const [loading, setLoading] = useState(true);
  const [tables, setTables] = useState<string[]>([]);
  const [configs, setConfigs] = useState<AuditConfig[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/master/audit/config');
      const data = await res.json();
      if (data.success) {
        setTables(data.availableTables);
        setConfigs(data.currentConfigs);
        setModules(data.availableModules);
      }
    } catch (err) {
      toast.error('Falha ao escanear banco de dados.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (config: Partial<AuditConfig>) => {
    setIsSaving(config.table_name || null);
    try {
      const res = await fetch('/api/admin/master/audit/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Configuração de '${config.table_name}' atualizada!`);
        fetchData();
      } else {
        toast.error(data.error || 'Erro ao salvar.');
      }
    } catch (err) {
      toast.error('Erro de rede.');
    } finally {
      setIsSaving(null);
    }
  };

  const filteredTables = tables.filter(t => t.toLowerCase().includes(searchTerm.toLowerCase()));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-md z-[70] flex justify-center items-center p-4">
      <div className="w-full max-w-6xl bg-white rounded-[2.5rem] shadow-2xl flex flex-col h-[90vh] overflow-hidden border border-white/20">
        
        {/* Header Profissional */}
        <div className="p-8 bg-gray-900 text-white flex justify-between items-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-500 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-purple-500 rounded-full blur-[100px] translate-x-1/2 translate-y-1/2"></div>
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-500/40">
                <ShieldCheckIcon className="h-7 w-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tighter leading-none">Governança de Auditoria</h2>
                <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-[0.3em] mt-2 flex items-center">
                  <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
                  Escaneamento e Parametrização em Tempo Real
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4 relative z-10">
             <div className="relative">
                <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="FILTRAR TABELAS..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-white/10 border-none rounded-xl pl-10 pr-4 py-3 text-xs font-bold uppercase tracking-widest focus:ring-2 focus:ring-indigo-500 w-64 backdrop-blur-md placeholder:text-gray-500"
                />
             </div>
             <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                <XCircleIcon className="h-8 w-8 text-gray-400 hover:text-white" />
             </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-gray-50 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
              <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="font-black uppercase text-xs tracking-widest text-gray-400">Sincronizando Metadados do Banco...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredTables.map(tableName => {
                const config = configs.find(c => c.table_name === tableName);
                return (
                  <div key={tableName} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    
                    {/* Info da Tabela */}
                    <div className="flex items-center space-x-4 min-w-[250px]">
                      <div className={`p-3 rounded-2xl ${config?.is_active ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-400'}`}>
                        <TableCellsIcon className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="font-black text-gray-900 uppercase text-sm tracking-tight">{tableName}</h4>
                        <div className="flex items-center mt-1">
                          {config?.is_active ? (
                            <span className="text-[9px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full uppercase tracking-tighter">Auditada</span>
                          ) : (
                            <span className="text-[9px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full uppercase tracking-tighter">Não Auditada</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Vínculo de Módulo */}
                    <div className="flex-1">
                      <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Vincular ao Módulo (Motor)</label>
                      <select 
                        value={config?.module_id || ''}
                        onChange={(e) => handleSave({ table_name: tableName, module_id: e.target.value || null })}
                        className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-xs font-bold text-gray-700 focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">NÃO VINCULADO (AUDITORIA GLOBAL)</option>
                        {modules.map(m => (
                          <option key={m.id} value={m.id}>{m.name} ({m.slug})</option>
                        ))}
                      </select>
                    </div>

                    {/* Tipo de Enriquecimento */}
                    <div className="w-[200px]">
                      <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Tipo de Enriquecimento</label>
                      <div className="flex bg-gray-50 p-1 rounded-xl">
                        {[
                          { id: 'NONE', icon: EyeSlashIcon, label: 'JSON' },
                          { id: 'UNIVERSAL', icon: AdjustmentsHorizontalIcon, label: 'AUTO' },
                          { id: 'PREMIUM', icon: SparklesIcon, label: 'RICH' }
                        ].map(type => (
                          <button
                            key={type.id}
                            onClick={() => handleSave({ table_name: tableName, enrichment_type: type.id as any })}
                            className={`flex-1 flex flex-col items-center justify-center p-2 rounded-lg transition-all ${
                              config?.enrichment_type === type.id 
                                ? 'bg-white text-indigo-600 shadow-sm' 
                                : 'text-gray-400 hover:text-gray-600'
                            }`}
                            title={type.label}
                          >
                            <type.icon className="h-4 w-4" />
                            <span className="text-[8px] font-black mt-1 uppercase">{type.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Componente Premium (Apenas se PREMIUM) */}
                    {config?.enrichment_type === 'PREMIUM' && (
                      <div className="w-[220px]">
                        <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Componente de UI</label>
                        <select 
                          value={config?.premium_component_id || ''}
                          onChange={(e) => handleSave({ table_name: tableName, premium_component_id: e.target.value })}
                          className="w-full bg-indigo-50 border-none rounded-xl px-4 py-3 text-xs font-bold text-indigo-700 focus:ring-2 focus:ring-indigo-500 animate-pulse"
                        >
                          <option value="">SELECIONE UM CARD...</option>
                          <option value="imovel-audit-card">FICHA DE IMÓVEL PREMIUM</option>
                          <option value="generic-rich-card">CARD GENÉRICO ESTILIZADO</option>
                        </select>
                      </div>
                    )}

                    {/* Ação de Ativar/Desativar */}
                    <div className="flex items-center space-x-2">
                       <button
                         onClick={() => handleSave({ table_name: tableName, is_active: !config?.is_active })}
                         className={`p-3 rounded-2xl transition-all ${
                           config?.is_active 
                             ? 'bg-green-50 text-green-600 hover:bg-red-50 hover:text-red-600' 
                             : 'bg-gray-100 text-gray-400 hover:bg-green-100 hover:text-green-600'
                         }`}
                       >
                         {config?.is_active ? <CheckCircleIcon className="h-6 w-6" /> : <XCircleIcon className="h-6 w-6" />}
                       </button>
                       {isSaving === tableName && (
                         <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                       )}
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-between items-center px-10">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
            Total: {tables.length} tabelas detectadas no motor de auditoria
          </p>
          <button 
            onClick={onClose}
            className="px-10 py-4 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-gray-800 transition-all shadow-xl active:scale-95"
          >
            Fechar Governança
          </button>
        </div>
      </div>
    </div>
  );
}
