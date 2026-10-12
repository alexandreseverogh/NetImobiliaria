'use client'

import { useEffect, useRef } from 'react'
import { adminFetch } from '@/lib/auth/adminFetch'

/**
 * Registra 1 acesso por troca de página (navegação) enquanto o usuário está
 * autenticado no admin. Fire-and-forget — nunca aguarda a resposta nem bloqueia
 * a navegação; falha silenciosamente (o servidor já trata isso como telemetria).
 *
 * Guarda a última rota logada para não duplicar quando o pathname não mudou de
 * verdade (ex.: re-render do layout, troca só de query string).
 */
export function useFeatureAccessLog(pathname: string | null, enabled: boolean) {
  const lastLoggedRef = useRef<string | null>(null)

  useEffect(() => {
    if (!enabled || !pathname) return
    if (lastLoggedRef.current === pathname) return
    lastLoggedRef.current = pathname

    adminFetch('/api/admin/access-log', {
      method: 'POST',
      body: JSON.stringify({ route: pathname }),
    }).catch(() => {
      // Telemetria — nunca propaga erro pro resto da UI.
    })
  }, [pathname, enabled])
}
