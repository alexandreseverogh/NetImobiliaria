'use client'

import React from 'react'
import * as HeroIcons from '@heroicons/react/24/outline'
import { useTheme } from '@/hooks/useTheme'

interface Badge {
  label: string;
  icone: string;
  valor: string;
  full_width?: boolean;
}

interface EnrichedData {
  title?: string;
  subtitle?: string;
  badges?: Badge[];
}

interface Props {
  cache: any;
  showBadgesOnly?: boolean;
}

export default function EnrichedLeadData({ cache, showBadgesOnly = false }: Props) {
  const t = useTheme()
  if (!cache || typeof cache !== 'object') return null
  
  const data = cache as EnrichedData

  const renderIcon = (iconName: string) => {
    const iconMap: any = {
      'bed': HeroIcons.HomeModernIcon,
      'bath': HeroIcons.SparklesIcon,
      'shower-head': HeroIcons.BeakerIcon,
      'car-front': HeroIcons.TruckIcon,
      'maximize': HeroIcons.ArrowsPointingOutIcon,
      'dollar-sign': HeroIcons.CurrencyDollarIcon,
      'map-pin': HeroIcons.MapPinIcon
    }

    const DynamicIcon = iconMap[iconName] || HeroIcons.InformationCircleIcon
    return <DynamicIcon className="h-3 w-3" />
  }

  return (
    <div className="space-y-3">
      {!showBadgesOnly && (data.title || data.subtitle) && (
        <div className="mb-2">
           {data.title && <div className={`text-xs font-black uppercase tracking-tight truncate ${t.isDark ? 'text-blue-100' : 'text-slate-800'}`}>{data.title}</div>}
           {data.subtitle && <div className={`text-[10px] font-semibold truncate mt-0.5 ${t.isDark ? 'text-gray-400' : 'text-slate-500'}`}>{data.subtitle}</div>}
        </div>
      )}

      {data.badges && data.badges.length > 0 && (
        <div className={`flex flex-wrap gap-x-3 gap-y-1.5 pt-2.5 border-t ${t.isDark ? 'border-white/5' : 'border-slate-100/80'}`}>
          {data.badges.map((badge, idx) => {
            const isFullWidth = badge.full_width === true || (badge.full_width !== false && typeof badge.valor === 'string' && badge.valor.length > 25);

            return (
              <div 
                key={idx} 
                title={`${badge.label}: ${badge.valor}`}
                className={`flex items-center text-[10.5px] ${isFullWidth ? 'w-full' : ''}`}
              >
                <span className={`mr-1 flex items-center justify-center ${t.isDark ? 'opacity-70 text-gray-400' : 'text-blue-600'}`}>
                  {renderIcon(badge.icone)}
                </span>
                
                <span className={`font-bold mr-1 uppercase text-[8.5px] tracking-wider ${t.isDark ? 'text-gray-500' : 'text-blue-400'}`}>
                  {badge.label}:
                </span>
                
                <span className={`font-black tracking-tight truncate ${t.isDark ? 'text-gray-200' : 'text-slate-800'}`}>
                  {badge.valor}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
