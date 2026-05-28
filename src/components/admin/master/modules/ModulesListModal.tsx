'use client';

import { Squares2X2Icon, XMarkIcon, CubeIcon } from '@heroicons/react/24/outline';

export interface ModuleItem {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  category_count?: number;
  is_active?: boolean;
}

interface ModulesListModalProps {
  isOpen: boolean;
  onClose: () => void;
  modules: ModuleItem[];
}

export default function ModulesListModal({ isOpen, onClose, modules }: ModulesListModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-gray-900/70 backdrop-blur-sm z-[70] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg bg-white rounded-[2rem] shadow-2xl flex flex-col overflow-hidden border border-gray-100">

        {/* Header */}
        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/20 rounded-xl border border-white/10">
              <Squares2X2Icon className="h-5 w-5 text-indigo-300" />
            </div>
            <div>
              <h2 className="text-base font-black text-white uppercase tracking-tight">Módulos da Plataforma</h2>
              <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-widest mt-0.5">
                {modules.length} {modules.length === 1 ? 'módulo disponível' : 'módulos disponíveis'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* List */}
        <div className="overflow-y-auto max-h-[60vh] p-4 space-y-2 bg-gray-50">
          {modules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <CubeIcon className="h-10 w-10 mb-3 opacity-40" />
              <p className="text-xs font-black uppercase tracking-widest">Nenhum módulo cadastrado</p>
            </div>
          ) : (
            modules.map((mod) => (
              <div
                key={mod.id}
                className="bg-white rounded-2xl px-5 py-4 border border-gray-100 shadow-sm flex items-center gap-4"
              >
                <div className="p-2 bg-indigo-50 rounded-xl shrink-0">
                  <CubeIcon className="h-4 w-4 text-indigo-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-gray-900 truncate">{mod.name}</p>
                  {mod.slug && (
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{mod.slug}</p>
                  )}
                </div>
                {mod.category_count !== undefined && (
                  <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full shrink-0">
                    {mod.category_count} cat.
                  </span>
                )}
                {mod.is_active !== undefined && (
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full shrink-0 ${
                    mod.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {mod.is_active ? 'ATIVO' : 'INATIVO'}
                  </span>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-8 py-3 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-700 transition-all"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
