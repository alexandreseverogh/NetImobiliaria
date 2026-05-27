'use client'

import { useState, useEffect } from 'react'

export function useTheme() {
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    // Lê o estado inicial
    const checkDark = () => {
      setIsDark(document.documentElement.classList.contains('dark'))
    }
    checkDark()

    // Observa mudanças dinâmicas de tema
    const observer = new MutationObserver(checkDark)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })
    return () => observer.disconnect()
  }, [])

  return {
    isDark,
    // ─── Fundos de Página / Layout ────────────────────────────────
    pageBg:       isDark ? 'bg-transparent'                        : 'bg-gray-50',
    cardBg:       isDark ? 'bg-white/5 border border-white/10'     : 'bg-white border border-gray-200 shadow-sm',
    cardBgSolid:  isDark ? 'bg-gray-900 border border-white/5'     : 'bg-white border border-gray-200 shadow-sm',
    cardDark:     isDark ? 'bg-gradient-to-br from-gray-900 to-black border border-white/10' : 'bg-white border border-gray-200 shadow-md',
    cardInner:    isDark ? 'bg-black/40 border border-white/5'     : 'bg-gray-50 border border-gray-200',
    modalBg:      isDark ? 'bg-[#0f172a] border border-white/10'   : 'bg-white border border-gray-200',

    // ─── Texto ────────────────────────────────────────────────────
    textPrimary:  isDark ? 'text-white'                            : 'text-gray-900',
    textSecondary:isDark ? 'text-gray-400'                         : 'text-gray-500',
    textMuted:    isDark ? 'text-gray-500'                         : 'text-gray-400',
    textLabel:    isDark ? 'text-gray-400'                         : 'text-gray-600',

    // ─── Bordas ───────────────────────────────────────────────────
    border:       isDark ? 'border-white/10'                       : 'border-gray-200',
    borderSub:    isDark ? 'border-white/5'                        : 'border-gray-100',
    divider:      isDark ? 'divide-white/5'                        : 'divide-gray-100',

    // ─── Inputs / Seletores ───────────────────────────────────────
    inputBg:      isDark ? 'bg-white/5 border border-white/10 text-white' : 'bg-white border border-gray-200 text-gray-900',
    selectorBg:   isDark ? 'bg-white/5 border border-white/10'    : 'bg-gray-100 border border-gray-200',
    selectorBtn:  isDark ? 'text-gray-500 hover:text-gray-300'    : 'text-gray-400 hover:text-gray-700',

    // ─── Hover / Interação ────────────────────────────────────────
    hoverBg:      isDark ? 'hover:bg-white/5'                      : 'hover:bg-gray-50',
    hoverCard:    isDark ? 'hover:border-blue-500/50 hover:bg-white/10' : 'hover:border-blue-400 hover:shadow-md',

    // ─── Loading/Skeleton ─────────────────────────────────────────
    skeletonBg:   isDark ? 'bg-white/5'                            : 'bg-gray-200',
  }
}
