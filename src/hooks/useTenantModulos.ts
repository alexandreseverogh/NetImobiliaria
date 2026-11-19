'use client'

import { useEffect, useState } from 'react'
import { adminFetch } from '@/lib/auth/adminFetch'

export type TenantModulos = { campanhas: boolean; comunicacao: boolean; centralMensagens: boolean }

/** Módulos contratados pelo tenant da sessão. Enquanto carrega, nada é exibido (evita piscar abas). */
export function useTenantModulos(): { modulos: TenantModulos | null; loaded: boolean } {
  const [modulos, setModulos] = useState<TenantModulos | null>(null)
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    adminFetch('/api/admin/tenant-modulos')
      .then(r => (r.ok ? r.json() : null))
      .then(d => setModulos(d ? { campanhas: !!d.campanhas, comunicacao: !!d.comunicacao, centralMensagens: !!d.centralMensagens } : null))
      .catch(() => setModulos(null))
      .finally(() => setLoaded(true))
  }, [])
  return { modulos, loaded }
}
