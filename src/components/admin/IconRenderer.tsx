import React from 'react'
import {
  // Ícones de amenidades
  ComputerDesktopIcon,
  HomeIcon,
  HeartIcon,
  LockClosedIcon,
  ShoppingBagIcon,
  SparklesIcon,
  UsersIcon,
  BuildingOfficeIcon,
  // Ícones de proximidades
  BuildingOffice2Icon as HospitalIcon,
  AcademicCapIcon,
  TruckIcon as BusIcon,
  MusicalNoteIcon as TheaterIcon,
  WrenchScrewdriverIcon as ToolsIcon
} from '@heroicons/react/24/outline'

// Ícones que não existem no Heroicons - usando alternativas
const LeafIcon = SparklesIcon // Alternativa para leaf
const GamepadIcon = ComputerDesktopIcon // Alternativa para gamepad
const UtensilsIcon = ShoppingBagIcon // Alternativa para utensils
const ShoppingBagIconProx = ShoppingBagIcon // Alias para proximidades

interface IconRendererProps {
  iconName: string
  className?: string
}

// Mapeamento de nomes de ícones para componentes Heroicons
const iconMap: { [key: string]: React.ComponentType<any> } = {
  // Amenidades
  'leaf': LeafIcon,
  'computer': ComputerDesktopIcon,
  'game': GamepadIcon,
  'fitness': HeartIcon,
  'lock': LockClosedIcon,
  'shopping': ShoppingBagIcon,
  'spa': SparklesIcon,
  'users': UsersIcon,
  'building': BuildingOfficeIcon,
  
  // Proximidades
  'shopping-bag': ShoppingBagIconProx,
  'utensils': UtensilsIcon,
  'hospital': HospitalIcon,
  'graduation-cap': AcademicCapIcon,
  'bus': BusIcon,
  'theater-masks': TheaterIcon,
  'tools': ToolsIcon,
  
  // Padrão
  'home': HomeIcon
}

export default function IconRenderer({ iconName, className = "w-6 h-6" }: IconRendererProps) {
  const IconComponent = iconMap[iconName] || HomeIcon
  
  return <IconComponent className={className} />
}
