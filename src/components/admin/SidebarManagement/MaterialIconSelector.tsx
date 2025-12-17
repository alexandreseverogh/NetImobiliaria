'use client'

import { useState } from 'react'

// ✅ IMPORTAR APENAS OS ÍCONES QUE VAMOS USAR (não todos os 2000+)
// Isso reduz DRASTICAMENTE o tamanho do bundle

import HomeIcon from '@mui/icons-material/Home'
import DashboardIcon from '@mui/icons-material/Dashboard'
import BusinessIcon from '@mui/icons-material/Business'
import ApartmentIcon from '@mui/icons-material/Apartment'
import PeopleIcon from '@mui/icons-material/People'
import PersonIcon from '@mui/icons-material/Person'
import SettingsIcon from '@mui/icons-material/Settings'
import LockIcon from '@mui/icons-material/Lock'
import SecurityIcon from '@mui/icons-material/Security'
import DescriptionIcon from '@mui/icons-material/Description'
import FolderIcon from '@mui/icons-material/Folder'
import BarChartIcon from '@mui/icons-material/BarChart'
import PieChartIcon from '@mui/icons-material/PieChart'
import EmailIcon from '@mui/icons-material/Email'
import PhoneIcon from '@mui/icons-material/Phone'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import WarningIcon from '@mui/icons-material/Warning'
import InfoIcon from '@mui/icons-material/Info'
import VisibilityIcon from '@mui/icons-material/Visibility'
import BedIcon from '@mui/icons-material/Bed'
import BathtubIcon from '@mui/icons-material/Bathtub'
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar'
import KitchenIcon from '@mui/icons-material/Kitchen'

// Mapeamento otimizado (apenas ~30 ícones mais usados)
const optimizedMaterialIcons = [
  { name: 'Home', icon: HomeIcon, category: 'Navigation' },
  { name: 'Dashboard', icon: DashboardIcon, category: 'Navigation' },
  { name: 'Business', icon: BusinessIcon, category: 'Business' },
  { name: 'Apartment', icon: ApartmentIcon, category: 'Business' },
  { name: 'People', icon: PeopleIcon, category: 'People' },
  { name: 'Person', icon: PersonIcon, category: 'People' },
  { name: 'Settings', icon: SettingsIcon, category: 'Settings' },
  { name: 'Lock', icon: LockIcon, category: 'Security' },
  { name: 'Security', icon: SecurityIcon, category: 'Security' },
  { name: 'Description', icon: DescriptionIcon, category: 'Files' },
  { name: 'Folder', icon: FolderIcon, category: 'Files' },
  { name: 'BarChart', icon: BarChartIcon, category: 'Charts' },
  { name: 'PieChart', icon: PieChartIcon, category: 'Charts' },
  { name: 'Email', icon: EmailIcon, category: 'Communication' },
  { name: 'Phone', icon: PhoneIcon, category: 'Communication' },
  { name: 'LocationOn', icon: LocationOnIcon, category: 'Location' },
  { name: 'CalendarToday', icon: CalendarTodayIcon, category: 'Time' },
  { name: 'AccessTime', icon: AccessTimeIcon, category: 'Time' },
  { name: 'Add', icon: AddIcon, category: 'Actions' },
  { name: 'Edit', icon: EditIcon, category: 'Actions' },
  { name: 'Delete', icon: DeleteIcon, category: 'Actions' },
  { name: 'CheckCircle', icon: CheckCircleIcon, category: 'Status' },
  { name: 'Error', icon: ErrorIcon, category: 'Status' },
  { name: 'Warning', icon: WarningIcon, category: 'Status' },
  { name: 'Info', icon: InfoIcon, category: 'Status' },
  { name: 'Visibility', icon: VisibilityIcon, category: 'Status' },
  { name: 'Bed', icon: BedIcon, category: 'Real Estate' },
  { name: 'Bathtub', icon: BathtubIcon, category: 'Real Estate' },
  { name: 'DirectionsCar', icon: DirectionsCarIcon, category: 'Real Estate' },
  { name: 'Kitchen', icon: KitchenIcon, category: 'Real Estate' },
]

interface MaterialIconSelectorProps {
  selected?: string
  onSelect: (iconName: string) => void
}

export function MaterialIconSelector({ selected, onSelect }: MaterialIconSelectorProps) {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Todas')

  const categories = ['Todas', ...Array.from(new Set(optimizedMaterialIcons.map(icon => icon.category)))]

  const filteredIcons = optimizedMaterialIcons.filter(icon => {
    const matchesSearch = icon.name.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = selectedCategory === 'Todas' || icon.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const getCategoryCount = (category: string) => {
    return optimizedMaterialIcons.filter(icon => {
      const matchesSearch = icon.name.toLowerCase().includes(search.toLowerCase())
      const matchesCategory = category === 'Todas' || icon.category === category
      return matchesSearch && matchesCategory
    }).length
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2 p-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
        <svg className="w-5 h-5 text-blue-600" viewBox="0 0 24 24">
          <path fill="currentColor" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
        </svg>
        <span className="text-sm font-medium text-blue-900">Material UI Icons</span>
        <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
          {optimizedMaterialIcons.length} ícones (otimizado)
        </span>
      </div>

      {/* Busca */}
      <input
        type="text"
        placeholder="Buscar ícone Material UI..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />

      {/* Filtro por Categoria */}
      <div className="flex flex-wrap gap-2">
        {categories.map(category => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-3 py-1 text-sm rounded-full transition-colors ${
              selectedCategory === category
                ? 'bg-blue-600 text-white'
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
            const isSelected = selected === `mui-${icon.name}`

            return (
              <button
                key={icon.name}
                type="button"
                onClick={() => onSelect(`mui-${icon.name}`)}
                className={`
                  p-3 border-2 rounded-lg transition-all hover:scale-105 relative group
                  ${isSelected
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                  }
                `}
                title={`${icon.name} (${icon.category})`}
              >
                <IconComponent className="w-6 h-6 mx-auto text-gray-700" />
                
                {/* Tooltip on hover */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                  {icon.name}
                </div>
              </button>
            )
          })
        )}
      </div>

      {/* Preview do selecionado */}
      {selected && selected.startsWith('mui-') && (
        <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
          <span className="text-sm text-blue-700 font-medium">Ícone Material UI selecionado:</span>
          <span className="text-sm font-bold text-blue-900">
            {selected.replace('mui-', '')}
          </span>
        </div>
      )}
    </div>
  )
}



