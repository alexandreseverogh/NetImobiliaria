'use client'

import { useState } from 'react'
import { MaterialIconSelector } from './MaterialIconSelector'

// Importar o seletor antigo (Heroicons)
import {
  HomeIcon,
  BuildingOfficeIcon,
  UsersIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  DocumentTextIcon,
  CogIcon,
  TagIcon,
  MapPinIcon,
  ClockIcon,
  WrenchScrewdriverIcon,
  Squares2X2Icon,
  ClipboardDocumentIcon,
  CheckCircleIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline'

// SVG Icons - DIRETO SEM BIBLIOTECAS
const SvgIcon = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    {children}
  </svg>
)

interface IconOption {
  name: string
  label: string
  icon: React.ComponentType<any>
  library: string
  category: string
}

const heroIconLibrary: IconOption[] = [
  { name: 'home', label: 'Home', icon: HomeIcon, library: 'Heroicons', category: 'Navigation' },
  { name: 'building', label: 'Imóvel', icon: BuildingOfficeIcon, library: 'Heroicons', category: 'Business' },
  { name: 'users', label: 'Usuários', icon: UsersIcon, library: 'Heroicons', category: 'Navigation' },
  { name: 'user-group', label: 'Grupo', icon: UserGroupIcon, library: 'Heroicons', category: 'Navigation' },
  { name: 'shield', label: 'Segurança', icon: ShieldCheckIcon, library: 'Heroicons', category: 'Security' },
  { name: 'chart', label: 'Gráfico', icon: ChartBarIcon, library: 'Heroicons', category: 'Business' },
  { name: 'document', label: 'Documento', icon: DocumentTextIcon, library: 'Heroicons', category: 'Files' },
  { name: 'cog', label: 'Configuração', icon: CogIcon, library: 'Heroicons', category: 'Interface' },
  { name: 'tag', label: 'Tag', icon: TagIcon, library: 'Heroicons', category: 'Interface' },
  { name: 'map-pin', label: 'Localização', icon: MapPinIcon, library: 'Heroicons', category: 'Navigation' },
  { name: 'clock', label: 'Relógio', icon: ClockIcon, library: 'Heroicons', category: 'Navigation' },
  { name: 'wrench', label: 'Ferramenta', icon: WrenchScrewdriverIcon, library: 'Heroicons', category: 'Interface' },
  { name: 'squares', label: 'Grade', icon: Squares2X2Icon, library: 'Heroicons', category: 'Interface' },
  { name: 'clipboard', label: 'Clipboard', icon: ClipboardDocumentIcon, library: 'Heroicons', category: 'Files' },
  { name: 'check-circle', label: 'Check Circle', icon: CheckCircleIcon, library: 'Heroicons', category: 'Interface' },
  { name: 'bars', label: 'Bars', icon: Bars3Icon, library: 'Heroicons', category: 'Interface' },
  { name: 'x-mark', label: 'X Mark', icon: XMarkIcon, library: 'Heroicons', category: 'Interface' }
]

const svgIconLibrary: IconOption[] = [
  { name: 'svg-home', label: 'Home (SVG)', icon: () => <SvgIcon><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></SvgIcon>, library: 'SVG', category: 'Navigation' },
  { name: 'svg-users', label: 'Users (SVG)', icon: () => <SvgIcon><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" /></SvgIcon>, library: 'SVG', category: 'Navigation' },
  { name: 'svg-settings', label: 'Settings (SVG)', icon: () => <SvgIcon><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></SvgIcon>, library: 'SVG', category: 'Interface' },
]

const allIconLibraries = [...heroIconLibrary, ...svgIconLibrary]

function LegacyIconSelector({ selected, onSelect }: { selected?: string; onSelect: (iconName: string) => void }) {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Todas')

  const categories = ['Todas', ...Array.from(new Set(allIconLibraries.map(icon => icon.category)))]

  const filteredIcons = allIconLibraries.filter(icon => {
    const matchesSearch = icon.label.toLowerCase().includes(search.toLowerCase()) ||
                          icon.name.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = selectedCategory === 'Todas' || icon.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const getCategoryCount = (category: string) => {
    return allIconLibraries.filter(icon => {
      const matchesSearch = icon.label.toLowerCase().includes(search.toLowerCase()) ||
                            icon.name.toLowerCase().includes(search.toLowerCase())
      const matchesCategory = category === 'Todas' || icon.category === category
      return matchesSearch && matchesCategory
    }).length
  }

  return (
    <div className="space-y-3">
      {/* Header com badge do Heroicons */}
      <div className="flex items-center gap-2 p-2 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
        <span className="text-sm font-medium text-purple-900">Heroicons + SVG</span>
        <span className="text-xs text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">
          {allIconLibraries.length} ícones
        </span>
      </div>

      {/* Busca */}
      <input
        type="text"
        placeholder="Buscar ícone..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
      />

      {/* Filtro por Categoria */}
      <div className="flex flex-wrap gap-2">
        {categories.map(category => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-3 py-1 text-sm rounded-full transition-colors ${
              selectedCategory === category
                ? 'bg-purple-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {category} ({getCategoryCount(category)})
          </button>
        ))}
      </div>

      {/* Grid de ícones */}
      <div className="grid grid-cols-6 gap-2 max-h-64 overflow-y-auto p-2 border border-gray-200 rounded-lg bg-white">
        {filteredIcons.length === 0 ? (
          <div className="col-span-6 text-center py-4 text-gray-500">Nenhum ícone encontrado</div>
        ) : (
          filteredIcons.map(icon => {
            const IconComponent = icon.icon
            const isSelected = selected === icon.name

            return (
              <button
                key={icon.name}
                type="button"
                onClick={() => onSelect(icon.name)}
                className={`
                  p-3 border-2 rounded-lg transition-all hover:scale-105 relative group
                  ${isSelected
                    ? 'border-purple-500 bg-purple-50 shadow-md'
                    : 'border-gray-300 hover:border-purple-400 hover:bg-gray-50'
                  }
                `}
                title={`${icon.label} (${icon.library} - ${icon.category})`}
              >
                <IconComponent className="w-6 h-6 mx-auto text-gray-700" />
                
                {/* Tooltip on hover */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                  {icon.label}
                </div>
              </button>
            )
          })
        )}
      </div>

      {/* Preview do selecionado */}
      {selected && !selected.startsWith('mui-') && (
        <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
          <span className="text-sm text-purple-700 font-medium">Ícone selecionado:</span>
          <span className="text-sm font-bold text-purple-900">
            {allIconLibraries.find(i => i.name === selected)?.label || selected}
          </span>
        </div>
      )}
    </div>
  )
}

export function HybridIconSelector({ selected, onSelect }: { selected?: string; onSelect: (iconName: string) => void }) {
  const [library, setLibrary] = useState<'material' | 'legacy'>(
    selected?.startsWith('mui-') ? 'material' : 'legacy'
  )

  return (
    <div className="space-y-4">
      {/* Toggle entre bibliotecas */}
      <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
        <button
          onClick={() => setLibrary('material')}
          className={`flex-1 px-4 py-2 rounded-md font-medium transition-all ${
            library === 'material'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-gray-700 hover:bg-gray-200'
          }`}
        >
          🎨 Material UI (200+ ícones)
        </button>
        <button
          onClick={() => setLibrary('legacy')}
          className={`flex-1 px-4 py-2 rounded-md font-medium transition-all ${
            library === 'legacy'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-gray-700 hover:bg-gray-200'
          }`}
        >
          ⚡ Heroicons ({allIconLibraries.length} ícones)
        </button>
      </div>

      {/* Renderizar o seletor correspondente */}
      {library === 'material' ? (
        <MaterialIconSelector selected={selected} onSelect={onSelect} />
      ) : (
        <LegacyIconSelector selected={selected} onSelect={onSelect} />
      )}
    </div>
  )
}



