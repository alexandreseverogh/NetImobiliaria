'use client'

import { useState, useEffect, createContext, useContext } from 'react'
import { useRouter } from 'next/navigation'
import { AdminUser } from '@/lib/types/admin'

// Interface para o contexto de autenticação
interface AuthContextType {
  user: AdminUser | null
  loading: boolean
  error: string
  setError: (error: string) => void
  login: (username: string, password: string, twoFactorCode?: string) => Promise<{ success: boolean; error?: string; requires2FA?: boolean }>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
}

// Contexto de autenticação
export const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Hook para usar o contexto de autenticação
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  }
  return context
}

// Hook para usar o contexto de autenticação (versão opcional)
export function useAuthOptional() {
  return useContext(AuthContext)
}

// Função para fazer login
async function performLogin(username: string, password: string, twoFactorCode?: string) {
  try {
    const response = await fetch('/api/admin/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password, twoFactorCode }),
    })

    const data = await response.json()

    if (response.ok && data.success) {
      // Salvar token no localStorage
      if (data.token) {
        localStorage.setItem('admin-auth-token', data.token)
        localStorage.setItem('admin-user-data', JSON.stringify({
          ...data.user,
          at: Date.now()
        }))
      }
      return { success: true }
    } else if (data.requires2FA) {
      return { success: false, requires2FA: true, error: data.message }
    } else {
      return { success: false, error: data.message || 'Erro no login' }
    }
  } catch (error) {
    console.error('Erro no login:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Erro de conexão' }
  }
}

// Função para fazer logout
async function performLogout() {
  try {
    const token = localStorage.getItem('admin-auth-token')
    if (token) {
      await fetch('/api/admin/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
    }
  } catch (error) {
    console.error('Erro no logout:', error)
  } finally {
    // Sempre limpar localStorage
    localStorage.removeItem('admin-auth-token')
    localStorage.removeItem('admin-user-data')
  }
}

// Função para verificar autenticação
async function checkAuthentication(): Promise<AdminUser | null> {
  try {
    // Primeiro verificar se há token no localStorage
    const token = localStorage.getItem('admin-auth-token')
    const userData = localStorage.getItem('admin-user-data')

    if (token && userData) {
      // Verificar se o token ainda é válido fazendo uma chamada à API
      const response = await fetch('/api/admin/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        return data.user || JSON.parse(userData)
      } else {
        // Token inválido, limpar localStorage
        localStorage.removeItem('admin-auth-token')
        localStorage.removeItem('admin-user-data')
        return null
      }
    }

    return null
  } catch (error) {
    console.error('Erro ao verificar autenticação:', error)
    // Em caso de erro, limpar localStorage
    localStorage.removeItem('admin-auth-token')
    localStorage.removeItem('admin-user-data')
    return null
  }
}

// Provider de autenticação
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()

  // Verificar autenticação ao carregar
  useEffect(() => {
    // Tolerância Zero: Sempre verificar no servidor antes de tirar o loading ou definir o usuário
    checkAuth()
  }, [])

  // Função para verificar autenticação
  const checkAuth = async () => {
    try {
      setLoading(true)

      // Se estiver na página de login, não verificar autenticação
      const currentPath = window.location.pathname
      const path = window.location.pathname
      if (path.includes('/login') || path.includes('/forgot-password') || path.includes('/reset-password')) {
        setLoading(false)
        return
      }

      const userData = await checkAuthentication()
      if (userData) {
        setUser(userData)
      } else {
        const isAuthPage = window.location.pathname.includes('/login') || 
                          window.location.pathname.includes('/forgot-password') || 
                          window.location.pathname.includes('/reset-password');
        
        if (!isAuthPage) {
          setUser(null)
          window.location.href = `/admin/login?error=session_expired&callbackUrl=${encodeURIComponent(window.location.pathname)}`
        }
      }
    } catch (error) {
      console.error('Erro crítico na verificação de autenticação:', error)
      setUser(null)
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/admin/login'
      }
    } finally {
      setLoading(false)
    }
  }

  // Função de login
  const login = async (username: string, password: string, twoFactorCode?: string) => {
    try {
      setLoading(true)
      const result = await performLogin(username, password, twoFactorCode)

      if (result.success) {
        // Login bem-sucedido - definir usuário e redirecionar
        const userData = localStorage.getItem('admin-user-data')
        if (userData) {
          setUser(JSON.parse(userData))
        }
        router.push('/admin')
      }

      return result
    } catch (error) {
      console.error('Erro no login:', error)
      return { success: false, error: 'Erro interno' }
    } finally {
      setLoading(false)
    }
  }

  // Função de logout
  const logout = async () => {
    try {
      setLoading(true)
      await performLogout()
      setUser(null)
      window.location.href = '/admin/login'
    } catch (error) {
      console.error('Erro no logout:', error)
    } finally {
      setLoading(false)
    }
  }

  const value: AuthContextType = {
    user,
    loading,
    error,
    setError,
    login,
    logout,
    checkAuth,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
