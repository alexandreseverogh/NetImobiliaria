'use client'

import { useState, useMemo } from 'react'
import * as Lucide from 'lucide-react'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'

interface LucideIconSelectorProps {
  selected?: string
  onSelect: (iconName: string) => void
}

export function LucideIconSelector({ selected, onSelect }: LucideIconSelectorProps) {
  const [search, setSearch] = useState('')
  
  // Filtrar apenas o que é componente de ícone (começa com maiúscula e não é o ícone base)
  const iconNames = useMemo(() => {
    return Object.keys(Lucide)
      .filter(key => 
        /^[A-Z]/.test(key) && 
        key !== 'LucideIcon' && 
        key !== 'createLucideIcon' &&
        key !== 'icons' // Evitar objetos de metadados
      )
      .sort()
  }, [])

  const filteredIcons = useMemo(() => {
    if (!search) return iconNames.slice(0, 300) // Limite inicial para performance
    return iconNames.filter(name => 
      name.toLowerCase().includes(search.toLowerCase())
    ).slice(0, 500)
  }, [search, iconNames])

  return (
    <div className="space-y-4 flex flex-col h-[500px]">
      {/* Header Premium */}
      <div className="flex items-center justify-between p-4 bg-slate-900 text-white rounded-2xl shadow-inner border border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-500 rounded-lg">
            <Lucide.Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="text-sm font-black uppercase tracking-widest">Biblioteca Lucide Premium</h4>
            <p className="text-[10px] text-slate-400 font-medium">{iconNames.length} ícones ultra-modernos disponíveis</p>
          </div>
        </div>
      </div>

      {/* Busca com Design Moderno */}
      <div className="relative group">
        <input
          type="text"
          placeholder="Pesquisar ícone (ex: home, car, chart, building...)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-12 bg-gray-50 border-2 border-gray-100 rounded-2xl pl-12 pr-4 text-sm font-bold focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm"
        />
        <Lucide.Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute right-4 top-3.5 text-[10px] font-black text-gray-400 hover:text-red-500 uppercase transition-colors"
          >
            Limpar
          </button>
        )}
      </div>

      {/* Grid de Ícones */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 bg-gray-50/50 rounded-2xl border border-gray-100">
        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3">
          {filteredIcons.length === 0 ? (
            <div className="col-span-full py-20 text-center">
              <Lucide.SearchX className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Nenhum ícone para "{search}"</p>
            </div>
          ) : (
            filteredIcons.map(name => {
              const IconComp = (Lucide as any)[name]
              const isSelected = selected === `lucide-${name}` || selected === name 
              
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => onSelect(`lucide-${name}`)}
                  className={`
                    group relative flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all 
                    ${isSelected 
                      ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200 scale-105 z-10' 
                      : 'bg-white border-transparent text-slate-600 hover:border-blue-200 hover:shadow-md'
                    }
                  `}
                >
                  <IconComp className={`w-6 h-6 mb-2 transition-transform group-hover:scale-110 ${isSelected ? 'text-white' : 'text-slate-600'}`} />
                  <span className={`text-[8px] font-black uppercase tracking-tight truncate w-full text-center ${isSelected ? 'text-blue-50' : 'text-slate-400'}`}>
                    {name.replace(/Icon$/, '')}
                  </span>
                  
                  {/* Tooltip Detalhado */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl border border-slate-700">
                     {name}
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Footer / Nota */}
      <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100">
        <p className="text-[9px] text-blue-600 font-bold uppercase tracking-widest text-center italic">
          Power by Lucide React Engine v0.294 • Pixel Perfect Consistency
        </p>
      </div>
    </div>
  )
}
