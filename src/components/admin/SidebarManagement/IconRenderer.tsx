'use client'

import * as MuiIcons from '@mui/icons-material'
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

const SvgIcon = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    {children}
  </svg>
)

const heroIconMap: Record<string, React.ComponentType<any>> = {
  'home': HomeIcon,
  'building': BuildingOfficeIcon,
  'users': UsersIcon,
  'user-group': UserGroupIcon,
  'shield': ShieldCheckIcon,
  'chart': ChartBarIcon,
  'document': DocumentTextIcon,
  'cog': CogIcon,
  'tag': TagIcon,
  'map-pin': MapPinIcon,
  'clock': ClockIcon,
  'wrench': WrenchScrewdriverIcon,
  'squares': Squares2X2Icon,
  'clipboard': ClipboardDocumentIcon,
  'check-circle': CheckCircleIcon,
  'bars': Bars3Icon,
  'x-mark': XMarkIcon
}

interface IconRendererProps {
  iconName?: string
  className?: string
}

export function IconRenderer({ iconName, className = "w-5 h-5" }: IconRendererProps) {
  if (!iconName) {
    return <HomeIcon className={className} />
  }

  // Material UI Icons (prefixo "mui-")
  if (iconName.startsWith('mui-')) {
    const muiIconName = iconName.replace('mui-', '')
    const MuiIconComponent = (MuiIcons as any)[muiIconName]
    
    if (MuiIconComponent) {
      return <MuiIconComponent className={className} />
    }
  }

  // Heroicons
  const HeroIcon = heroIconMap[iconName]
  if (HeroIcon) {
    return <HeroIcon className={className} />
  }

  // SVG Icons (fallback)
  if (iconName.startsWith('svg-')) {
    return <HomeIcon className={className} />
  }

  // Default fallback
  return <HomeIcon className={className} />
}



