'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Página de redirecionamento para Meu Perfil
 * 
 * Esta página redireciona automaticamente para /landpaging e abre o modal MeuPerfilModal.
 * Isso garante que apenas o modal seja usado, evitando duplicação de código.
 */
export default function MeuPerfilPage() {
  const router = useRouter()

  useEffect(() => {
    console.log('🔍 [MEU PERFIL PAGE] Redirecionando para landpaging e abrindo modal...')
    const token = localStorage.getItem('public-auth-token')
    const userDataLocal = localStorage.getItem('public-user-data')
    
    if (!token && !userDataLocal) {
      // Sem autenticação, redirecionar para login
      router.push('/landpaging?login=required')
      return
    }
    
    // Redirecionar para landpaging
    router.push('/landpaging')
    
    // Disparar evento após um pequeno delay para garantir que a página carregou
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('open-meu-perfil-modal'))
      }
    }, 300)
  }, [router])

  // Mostrar loading enquanto redireciona
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecionando para seu perfil...</p>
      </div>
    </div>
  )
}
