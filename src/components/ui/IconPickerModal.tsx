'use client'

import { useState, useMemo } from 'react'
import { XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { icons } from 'lucide-react'
import DynamicIcon from '../common/DynamicIcon'

interface IconPickerModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (iconName: string) => void
  currentIcon?: string
}

export default function IconPickerModal({ isOpen, onClose, onSelect, currentIcon }: IconPickerModalProps) {
  const [search, setSearch] = useState('')
  const [displayLimit, setDisplayLimit] = useState(150) // Limite inicial para performance
  
  // Remove o prefixo 'lucide-' caso exista para o comparativo visual no grid
  const currentLucideName = currentIcon?.startsWith('lucide-') ? currentIcon.replace('lucide-', '') : currentIcon;
  
  // Extrai todos os nomes de ícones exportados pela Lucide (descartando helpers como createLucideIcon)
  const allIcons = useMemo(() => {
    return Object.keys(icons).filter(key => 
      // Primeira letra maiúscula garante que é um componente de ícone
      /^[A-Z]/.test(key) && key !== 'LucideProps' && key !== 'Icon'
    );
  }, []);
  
  const filteredIcons = useMemo(() => {
    const lowerSearch = search.toLowerCase().trim()
    return allIcons.filter(icon => !lowerSearch || icon.toLowerCase().includes(lowerSearch))
  }, [search, allIcons])

  const visibleIcons = useMemo(() => {
    return filteredIcons.slice(0, displayLimit)
  }, [filteredIcons, displayLimit])

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-white">
          <div>
            <h2 className="flex items-center text-slate-900 font-black tracking-tight text-xl">
              <span className="bg-indigo-100 text-indigo-600 p-1.5 rounded-lg mr-3">
                <DynamicIcon iconName="lucide-Box" className="w-5 h-5 stroke-[2.5]" />
              </span>
              Biblioteca de Ícones
            </h2>
            <p className="text-slate-500 text-xs font-medium mt-1 uppercase tracking-widest">
              Selecione um ícone para a interface
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors rounded-full shadow-sm border border-transparent hover:border-red-100">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Search */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="relative group">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Ex: User, Config, Database, Shield, Box..." 
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setDisplayLimit(150) // Reseta o limite ao pesquisar
              }}
              className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-700 outline-none shadow-sm"
              autoFocus
            />
          </div>
        </div>

        {/* Grid Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50 custom-scrollbar">
          {filteredIcons.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <DynamicIcon iconName="lucide-SearchX" className="w-16 h-16 text-slate-300 mb-4" />
              <div className="text-slate-500 font-bold text-lg">Nenhum ícone encontrado</div>
              <div className="text-slate-400 text-sm mt-1">Tente pesquisar usando termos em inglês (ex: star, heart, file)</div>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-8 gap-4">
              {/* Opção para "Remover Ícone" */}
              <button
                onClick={() => {
                  onSelect('');
                  onClose();
                }}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all hover:-translate-y-1 ${!currentIcon ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-md ring-2 ring-rose-500/20' : 'bg-white border-slate-200 text-slate-400 hover:border-rose-300 hover:text-rose-500 shadow-sm hover:shadow-md'}`}
              >
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center mb-2">
                  <XMarkIcon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold tracking-wider uppercase w-full text-center">Nenhum</span>
              </button>

              {/* Ícones */}
              {visibleIcons.map(iconName => (
                <button
                  key={iconName}
                  onClick={() => {
                    onSelect(`lucide-${iconName}`)
                    onClose()
                  }}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all hover:-translate-y-1 ${currentLucideName === iconName ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-md ring-2 ring-indigo-500/20' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600 shadow-sm hover:shadow-md'}`}
                  title={iconName}
                >
                  <DynamicIcon iconName={`lucide-${iconName}`} className="w-7 h-7 mb-2 stroke-[1.5]" />
                  <span className="text-[9px] font-mono truncate w-full text-center opacity-80">{iconName}</span>
                </button>
              ))}
            </div>
          )}

          {/* Botão Carregar Mais */}
          {filteredIcons.length > displayLimit && (
            <div className="mt-8 flex justify-center">
              <button 
                onClick={() => setDisplayLimit(prev => prev + 150)}
                className="px-8 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-slate-50 hover:border-indigo-300 hover:text-indigo-600 transition-all shadow-sm"
              >
                Carregar mais ícones ({filteredIcons.length - displayLimit} restantes)
              </button>
            </div>
          )}
        </div>
        
        {/* Footer info */}
        <div className="px-6 py-3 border-t border-slate-100 bg-white flex justify-between items-center text-[10px] uppercase tracking-widest text-slate-400 font-bold">
          <span>{allIcons.length} ícones disponíveis</span>
          <span>Powered by Lucide React</span>
        </div>
      </div>
    </div>
  )
}
