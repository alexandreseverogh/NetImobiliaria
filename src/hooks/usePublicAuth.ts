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

  const logout = async () => {
    try {
      // 1. Tentar fazer logout no backend para limpar cookies
      const adminToken = localStorage.getItem('admin-auth-token')
      const publicToken = localStorage.getItem('public-auth-token')
      const token = adminToken || publicToken

      if (token) {
        await fetch('/api/admin/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }).catch(err => console.warn('⚠️ Erro ao chamar logout API:', err))
      }
    } catch (error) {
      console.error('Erro no processo de logout:', error)
    } finally {
      // 2. Limpar TODO o localStorage relacionado a qualquer sessão
      const keysToRemove = [
        'public-auth-token',
        'public-user-data',
        'public-last-auth-user',
        'admin-auth-token',
        'admin-user-data',
        'admin-last-auth-user',
        // NOVAS CHAVES (Legacy/Genéricas) que estavam mantendo sessão zumbi
        'auth-token',
        'user-data'
      ]
      keysToRemove.forEach(key => localStorage.removeItem(key))

      // 3. Atualizar estado e redirecionar
      setUser(null)

      // Disparar eventos para outros componentes
      window.dispatchEvent(new Event('public-auth-changed'))
      window.dispatchEvent(new Event('admin-auth-changed'))

      // 3. Redirecionar para a landing page limpando todo o estado do navegador
      window.location.href = '/landpaging'
    }
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


