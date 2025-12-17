import React from 'react';
// ✅ IMPORTS OTIMIZADOS - Apenas ícones específicos do Material UI
import HomeIconMui from '@mui/icons-material/Home';
import DashboardIconMui from '@mui/icons-material/Dashboard';
import BusinessIconMui from '@mui/icons-material/Business';
import ApartmentIconMui from '@mui/icons-material/Apartment';
import PeopleIconMui from '@mui/icons-material/People';
import PersonIconMui from '@mui/icons-material/Person';
import SettingsIconMui from '@mui/icons-material/Settings';
import LockIconMui from '@mui/icons-material/Lock';
import SecurityIconMui from '@mui/icons-material/Security';
import DescriptionIconMui from '@mui/icons-material/Description';
import FolderIconMui from '@mui/icons-material/Folder';
import BarChartIconMui from '@mui/icons-material/BarChart';
import PieChartIconMui from '@mui/icons-material/PieChart';
import EmailIconMui from '@mui/icons-material/Email';
import PhoneIconMui from '@mui/icons-material/Phone';
import LocationOnIconMui from '@mui/icons-material/LocationOn';
import CalendarTodayIconMui from '@mui/icons-material/CalendarToday';
import AccessTimeIconMui from '@mui/icons-material/AccessTime';
import AddIconMui from '@mui/icons-material/Add';
import EditIconMui from '@mui/icons-material/Edit';
import DeleteIconMui from '@mui/icons-material/Delete';
import CheckCircleIconMui from '@mui/icons-material/CheckCircle';
import ErrorIconMui from '@mui/icons-material/Error';
import WarningIconMui from '@mui/icons-material/Warning';
import InfoIconMui from '@mui/icons-material/Info';
import VisibilityIconMui from '@mui/icons-material/Visibility';
import BedIconMui from '@mui/icons-material/Bed';
import BathtubIconMui from '@mui/icons-material/Bathtub';
import DirectionsCarIconMui from '@mui/icons-material/DirectionsCar';
import KitchenIconMui from '@mui/icons-material/Kitchen';

import {
  HomeIcon,
  BuildingOfficeIcon,
  UsersIcon,
  ChartBarIcon,
  CogIcon,
  ShieldCheckIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  UserGroupIcon,
  HomeModernIcon,
  MapPinIcon,
  TagIcon,
  WrenchScrewdriverIcon,
  ClockIcon,
  TrashIcon,
  Squares2X2Icon,
  ChevronDownIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

// SVG Icons - DIRETO SEM BIBLIOTECAS
const SvgIcon = ({ children, className = 'h-6 w-6' }: { children: React.ReactNode; className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    {children}
  </svg>
)

// ============================================================
// MAPEAMENTO DE ÍCONES MATERIAL UI (OTIMIZADO)
// ============================================================
const muiIconMap: Record<string, React.ComponentType<any>> = {
  'Home': HomeIconMui,
  'Dashboard': DashboardIconMui,
  'Business': BusinessIconMui,
  'Apartment': ApartmentIconMui,
  'People': PeopleIconMui,
  'Person': PersonIconMui,
  'Settings': SettingsIconMui,
  'Lock': LockIconMui,
  'Security': SecurityIconMui,
  'Description': DescriptionIconMui,
  'Folder': FolderIconMui,
  'BarChart': BarChartIconMui,
  'PieChart': PieChartIconMui,
  'Email': EmailIconMui,
  'Phone': PhoneIconMui,
  'LocationOn': LocationOnIconMui,
  'CalendarToday': CalendarTodayIconMui,
  'AccessTime': AccessTimeIconMui,
  'Add': AddIconMui,
  'Edit': EditIconMui,
  'Delete': DeleteIconMui,
  'CheckCircle': CheckCircleIconMui,
  'Error': ErrorIconMui,
  'Warning': WarningIconMui,
  'Info': InfoIconMui,
  'Visibility': VisibilityIconMui,
  'Bed': BedIconMui,
  'Bathtub': BathtubIconMui,
  'DirectionsCar': DirectionsCarIconMui,
  'Kitchen': KitchenIconMui,
}

// ============================================================
// MAPEAMENTO DE ÍCONES HEROICONS
// ============================================================
const iconMap: Record<string, React.ComponentType<any>> = {
  'home': HomeIcon,
  'building': BuildingOfficeIcon,
  'users': UsersIcon,
  'user-group': UserGroupIcon,
  'chart': ChartBarIcon,
  'cog': CogIcon,
  'shield': ShieldCheckIcon,
  'clipboard': ClipboardDocumentListIcon,
  'document': DocumentTextIcon,
  'wrench': WrenchScrewdriverIcon,
  'modern-home': HomeModernIcon,
  'map-pin': MapPinIcon,
  'tag': TagIcon,
  'clock': ClockIcon,
  'trash': TrashIcon,
  'squares': Squares2X2Icon,
  'chevron-down': ChevronDownIcon,
  'chevron-right': ChevronRightIcon,
  'check-circle': CheckCircleIcon,
  'bars': Bars3Icon,
  'x-mark': XMarkIcon,
  
  // SVG Icons
  'svg-home': ({ className }: { className?: string }) => <SvgIcon className={className}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></SvgIcon>,
  'svg-users': ({ className }: { className?: string }) => <SvgIcon className={className}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" /></SvgIcon>,
  
  // Fallback
  'default': HomeIcon,
};

// ============================================================
// PROPS
// ============================================================
export interface DynamicIconProps {
  iconName: string;
  className?: string;
  [key: string]: any;
}

// ============================================================
// COMPONENTE: DynamicIcon
// ============================================================
export default function DynamicIcon({
  iconName,
  className = 'h-6 w-6',
  ...props
}: DynamicIconProps) {
  // Validação
  if (!iconName || typeof iconName !== 'string') {
    const IconComponent = iconMap['default'];
    return <IconComponent className={className} {...props} />;
  }

  // ✅ SUPORTE MATERIAL UI ICONS (OTIMIZADO)
  if (iconName.startsWith('mui-')) {
    const muiIconName = iconName.replace('mui-', '');
    const MuiIconComponent = muiIconMap[muiIconName];
    
    if (MuiIconComponent) {
      return <MuiIconComponent className={className} {...props} />;
    }
    // Fallback se ícone não estiver no mapa
    console.warn(`Ícone Material UI "${muiIconName}" não encontrado no mapa otimizado`);
    const FallbackIcon = iconMap['default'];
    return <FallbackIcon className={className} {...props} />;
  }

  // Buscar componente de ícone no mapa (Heroicons e SVG)
  const IconComponent = iconMap[iconName.toLowerCase()] || iconMap['default'];

  // Renderizar ícone
  return <IconComponent className={className} {...props} />;
}

export function getIconName(iconName: string): string {
  return iconName.toLowerCase().replace(/\s+/g, '-');
}

export function getIconComponent(iconName: string): React.ComponentType<any> {
  const normalizedName = getIconName(iconName);
  return iconMap[normalizedName] || iconMap['default'];
}

export { iconMap };



