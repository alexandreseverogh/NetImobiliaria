'use client'

/**
 * PageTracker — Componente invisível de analytics
 *
 * Registra visitas à página atual de forma assíncrona (fire-and-forget).
 * Retorna null → sem impacto visual nem de performance.
 * Envolva sempre em <Suspense fallback={null}> no layout pai.
 */

import { useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

export function PageTracker() {
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const lastTrackedPath = useRef<string>('')

    useEffect(() => {
        // Evitar rastrear a mesma rota duas vezes seguidas (ex: strict mode do React)
        const currentPath = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '')
        if (lastTrackedPath.current === currentPath) return
        lastTrackedPath.current = currentPath

        // Fire-and-forget: nunca bloqueia a UI, silencia todos os erros
        fetch('/api/public/analytics/pageview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                path: pathname,
                referrer: typeof document !== 'undefined' ? (document.referrer || null) : null,
                title: typeof document !== 'undefined' ? (document.title || null) : null,
                utm_source: searchParams.get('utm_source'),
                utm_medium: searchParams.get('utm_medium'),
                utm_campaign: searchParams.get('utm_campaign'),
            }),
        }).catch(() => {
            // Silencia erros de rede — tracking nunca deve impactar o usuário
        })
    }, [pathname, searchParams])

    return null // componente completamente invisível
}
