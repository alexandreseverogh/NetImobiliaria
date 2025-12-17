'use client'

import { useState } from 'react'
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
  // Navigation
  { name: 'svg-home', label: 'Home (SVG)', icon: () => <SvgIcon><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></SvgIcon>, library: 'SVG', category: 'Navigation' },
  { name: 'svg-users', label: 'Users (SVG)', icon: () => <SvgIcon><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" /></SvgIcon>, library: 'SVG', category: 'Navigation' },
  { name: 'svg-settings', label: 'Settings (SVG)', icon: () => <SvgIcon><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></SvgIcon>, library: 'SVG', category: 'Interface' },
  { name: 'svg-chart', label: 'Chart (SVG)', icon: () => <SvgIcon><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></SvgIcon>, library: 'SVG', category: 'Business' },
  { name: 'svg-shield', label: 'Shield (SVG)', icon: () => <SvgIcon><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></SvgIcon>, library: 'SVG', category: 'Security' },
  { name: 'svg-file', label: 'File (SVG)', icon: () => <SvgIcon><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></SvgIcon>, library: 'SVG', category: 'Files' },
  { name: 'svg-plus', label: 'Plus (SVG)', icon: () => <SvgIcon><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></SvgIcon>, library: 'SVG', category: 'Interface' },
  { name: 'svg-minus', label: 'Minus (SVG)', icon: () => <SvgIcon><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></SvgIcon>, library: 'SVG', category: 'Interface' },
  { name: 'svg-check', label: 'Check (SVG)', icon: () => <SvgIcon><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></SvgIcon>, library: 'SVG', category: 'Interface' },
  { name: 'svg-x', label: 'X (SVG)', icon: () => <SvgIcon><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></SvgIcon>, library: 'SVG', category: 'Interface' },
  { name: 'svg-arrow-right', label: 'Arrow Right (SVG)', icon: () => <SvgIcon><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></SvgIcon>, library: 'SVG', category: 'Interface' },
  { name: 'svg-arrow-left', label: 'Arrow Left (SVG)', icon: () => <SvgIcon><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" /></SvgIcon>, library: 'SVG', category: 'Interface' },
  { name: 'svg-arrow-up', label: 'Arrow Up (SVG)', icon: () => <SvgIcon><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l4-4m0 0l4 4m-4-4V3" /></SvgIcon>, library: 'SVG', category: 'Interface' },
  { name: 'svg-arrow-down', label: 'Arrow Down (SVG)', icon: () => <SvgIcon><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 7l-4 4m0 0l-4-4m4 4V21" /></SvgIcon>, library: 'SVG', category: 'Interface' },
  { name: 'svg-lock', label: 'Lock (SVG)', icon: () => <SvgIcon><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></SvgIcon>, library: 'SVG', category: 'Security' },
  { name: 'svg-eye', label: 'Eye (SVG)', icon: () => <SvgIcon><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></SvgIcon>, library: 'SVG', category: 'Security' },
  { name: 'svg-key', label: 'Key (SVG)', icon: () => <SvgIcon><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></SvgIcon>, library: 'SVG', category: 'Security' },
  { name: 'svg-folder', label: 'Folder (SVG)', icon: () => <SvgIcon><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></SvgIcon>, library: 'SVG', category: 'Files' },
  { name: 'svg-download', label: 'Download (SVG)', icon: () => <SvgIcon><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></SvgIcon>, library: 'SVG', category: 'Files' },
  { name: 'svg-upload', label: 'Upload (SVG)', icon: () => <SvgIcon><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></SvgIcon>, library: 'SVG', category: 'Files' },
  { name: 'svg-trash', label: 'Trash (SVG)', icon: () => <SvgIcon><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></SvgIcon>, library: 'SVG', category: 'Files' },
  { name: 'svg-phone', label: 'Phone (SVG)', icon: () => <SvgIcon><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></SvgIcon>, library: 'SVG', category: 'Communication' },
  { name: 'svg-envelope', label: 'Envelope (SVG)', icon: () => <SvgIcon><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></SvgIcon>, library: 'SVG', category: 'Communication' },
  { name: 'svg-chat', label: 'Chat (SVG)', icon: () => <SvgIcon><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></SvgIcon>, library: 'SVG', category: 'Communication' },
  { name: 'svg-bell', label: 'Bell (SVG)', icon: () => <SvgIcon><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4.828 7l2.586 2.586a2 2 0 002.828 0L12.828 7H4.828zM20 7l-5 5-5-5h10z" /></SvgIcon>, library: 'SVG', category: 'Communication' }
]

const allIconLibraries = [...heroIconLibrary, ...svgIconLibrary]

export function IconSelector({ selected, onSelect }: { selected?: string; onSelect: (iconName: string) => void }) {
  const [search, setSearch] = useState('')
  const [selectedLibrary, setSelectedLibrary] = useState('Todas') // 'Todas', 'Heroicons', 'SVG'
  const [selectedCategory, setSelectedCategory] = useState('Todas') // 'Todas', 'Navigation', 'Business', etc.

  const libraries = ['Todas', ...Array.from(new Set(allIconLibraries.map(icon => icon.library)))]
  const categories = ['Todas', ...Array.from(new Set(allIconLibraries.map(icon => icon.category)))]

  const filteredIcons = allIconLibraries.filter(icon => {
    const matchesSearch = icon.label.toLowerCase().includes(search.toLowerCase()) ||
                          icon.name.toLowerCase().includes(search.toLowerCase())
    const matchesLibrary = selectedLibrary === 'Todas' || icon.library === selectedLibrary
    const matchesCategory = selectedCategory === 'Todas' || icon.category === selectedCategory
    return matchesSearch && matchesLibrary && matchesCategory
  })

  // Função para contar ícones por categoria considerando filtros ativos
  const getCategoryCount = (category: string) => {
    return allIconLibraries.filter(icon => {
      const matchesSearch = icon.label.toLowerCase().includes(search.toLowerCase()) ||
                            icon.name.toLowerCase().includes(search.toLowerCase())
      const matchesLibrary = selectedLibrary === 'Todas' || icon.library === selectedLibrary
      const matchesCategory = category === 'Todas' || icon.category === category
      return matchesSearch && matchesLibrary && matchesCategory
    }).length
  }

  // Função para contar ícones por biblioteca considerando filtros ativos
  const getLibraryCount = (library: string) => {
    return allIconLibraries.filter(icon => {
      const matchesSearch = icon.label.toLowerCase().includes(search.toLowerCase()) ||
                            icon.name.toLowerCase().includes(search.toLowerCase())
      const matchesLibrary = library === 'Todas' || icon.library === library
      const matchesCategory = selectedCategory === 'Todas' || icon.category === selectedCategory
      return matchesSearch && matchesLibrary && matchesCategory
    }).length
  }

  return (
    <div className="space-y-3">
      {/* Busca */}
      <input
        type="text"
        placeholder="Buscar ícone..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />

      {/* Filtro por Biblioteca */}
      <div className="flex flex-wrap gap-2">
        {libraries.map(library => (
          <button
            key={library}
            onClick={() => setSelectedLibrary(library)}
            className={`px-3 py-1 text-sm rounded-full transition-colors ${
              selectedLibrary === library
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {library} ({getLibraryCount(library)})
          </button>
        ))}
      </div>

      {/* Filtro por Categoria */}
      <div className="flex flex-wrap gap-2">
        {categories.map(category => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-3 py-1 text-sm rounded-full transition-colors ${
              selectedCategory === category
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {category} ({getCategoryCount(category)})
          </button>
        ))}
      </div>

      {/* Grid de ícones */}
      <div className="grid grid-cols-6 gap-2 max-h-64 overflow-y-auto p-2 border border-gray-200 rounded-lg">
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
                  p-3 border-2 rounded-lg transition-colors relative
                  ${isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                  }
                `}
                title={`${icon.label} (${icon.library} - ${icon.category})`}
              >
                <IconComponent className="w-6 h-6 mx-auto text-gray-700" />
                <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-xs text-gray-500 bg-white px-1 rounded">
                  {icon.library.substring(0, 3)}
                </span>
              </button>
            )
          })
        )}
      </div>

      {/* Preview do selecionado */}
      {selected && (
        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
          <span className="text-sm text-gray-600">Ícone selecionado:</span>
          <span className="text-sm font-medium text-gray-900">
            {allIconLibraries.find(i => i.name === selected)?.label || selected}
          </span>
        </div>
      )}
    </div>
  )
}