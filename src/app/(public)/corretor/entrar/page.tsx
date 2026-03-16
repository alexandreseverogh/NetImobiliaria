'use client'

import { useEffect, useMemo, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import CorretorLoginModal from '@/components/public/auth/CorretorLoginModal'

function LoginContent() {
  const searchParams = useSearchParams()

  const nextParam = useMemo(() => {
    const raw = searchParams?.get('next') || ''
    if (!raw || !raw.startsWith('/')) return '/landpaging?corretor_home=true'
    return raw
  }, [searchParams])

  const [ready, setReady] = useState(false)

  useEffect(() => {
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

export default function CorretorEntrarPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
    </div>}>
      <LoginContent />
    </Suspense>
  )
}


