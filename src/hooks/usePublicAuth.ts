'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface PublicUser {
  uuid: string
  nome: string
  email: string
  cpf: string
  userType: 'cliente' | 'proprietario'
}

export function usePublicAuth() {
  const router = useRouter()
  const [user, setUser] = useState<PublicUser | null>(null)
  const [loading, setLoading] = useState(true)

  const checkAuth = useCallback(() => {
    try {
      const token = localStorage.getItem('public-auth-token')
      const userData = localStorage.getItem('public-user-data')

      if (token && userData) {
        setUser(JSON.parse(userData))
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error('Erro ao verificar autenticação:', error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    checkAuth()

    // Listener para mudanças no localStorage (quando login acontece em outra aba/componente)
    const handleStorageChange = (e: StorageEvent) => {
      // Detectar mudanças críticas de sessão em outras abas
      const criticalKeys = ['public-auth-token', 'public-user-data', 'public-last-auth-user']

      if (criticalKeys.includes(e.key || '')) {
        // Se o valor mudou (login/logout em outra aba), recarregar para sincronizar UI
        if (e.oldValue !== e.newValue) {
          console.log('🔄 [usePublicAuth] Sessão alterada em outra aba, recarregando página...')
          window.location.reload()
          return
        }
      }

      // Fallback: apenas atualizar estado local se não recarregou
      if (e.key === 'public-auth-token' || e.key === 'public-user-data') {
        checkAuth()
      }
    }

    // Listener para eventos customizados (quando login acontece na mesma aba)
    const handleAuthChange = () => {
      checkAuth()
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('public-auth-changed', handleAuthChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('public-auth-changed', handleAuthChange)
    }
  }, [])

  const logout = () => {
    localStorage.removeItem('public-auth-token')
    localStorage.removeItem('public-user-data')
    setUser(null)
    router.push('/landpaging')
  }

  const isAuthenticated = !!user

  return {
    user,
    loading,
    isAuthenticated,
    logout,
    checkAuth
  }
}


