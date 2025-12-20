'use client'

import React from 'react'
import * as HeroIcons from '@heroicons/react/24/outline'

// Tipo para os nomes dos ícones
export type IconName = keyof typeof HeroIcons

// Interface para props do componente de ícone
export interface IconRendererProps {
  iconName: string
  className?: string
  style?: React.CSSProperties
}

/**
 * Renderiza um ícone do Heroicons dinamicamente baseado no nome
 * @param iconName - Nome do ícone (ex: 'CogIcon', 'UserIcon')
 * @param className - Classes CSS adicionais
 * @param style - Estilos inline adicionais
 */
export function IconRenderer({ iconName, className = '', style }: IconRendererProps) {
  // Remove sufixos comuns se presentes
  const normalizedName = iconName.replace(/Icon$/, '') + 'Icon'
  
  // Busca o componente do ícone
  const IconComponent = HeroIcons[normalizedName as IconName] as React.ComponentType<{
    className?: string
    style?: React.CSSProperties
  }>

  // Se o ícone não existir, retorna um ícone padrão
  if (!IconComponent) {
    console.warn(`Ícone "${iconName}" não encontrado. Usando CogIcon como padrão.`)
    const DefaultIcon = HeroIcons.CogIcon
    return <DefaultIcon className={className} style={style} />
  }

  return <IconComponent className={className} style={style} />
}

/**
 * Hook para obter o componente de ícone diretamente
 */
export function useIcon(iconName: string) {
  const normalizedName = iconName.replace(/Icon$/, '') + 'Icon'
  const IconComponent = HeroIcons[normalizedName as IconName] as React.ComponentType<{
    className?: string
    style?: React.CSSProperties
  }>

  return IconComponent || HeroIcons.CogIcon
}







