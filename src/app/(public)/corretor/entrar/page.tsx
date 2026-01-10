'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import CorretorLoginModal from '@/components/public/auth/CorretorLoginModal'

export default function CorretorEntrarPage() {
  const searchParams = useSearchParams()

  const nextParam = useMemo(() => {
    const raw = searchParams?.get('next') || ''
    // segurança: permitir apenas caminhos internos
    if (!raw || !raw.startsWith('/')) return '/landpaging?corretor_home=true'
    return raw
  }, [searchParams])

  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Se já estiver logado, ir direto para o destino
    try {
      const token = localStorage.getItem('auth-token')
      const raw = localStorage.getItem('user-data')
      if (token && raw) {
        const parsed: any = JSON.parse(raw)
        const roleName = String(parsed?.role_name || parsed?.cargo || '').toLowerCase()
        if (roleName.includes('corretor')) {
          window.location.href = nextParam
          return
        }
      }
    } catch { }
    setReady(true)
  }, [nextParam])

  if (!ready) return null

  return (
    <CorretorLoginModal
      isOpen={true}
      onClose={() => {
        window.location.href = '/landpaging'
      }}
      redirectTo="/landpaging"
      afterLoginRedirectTo={nextParam}
    />
  )
}


