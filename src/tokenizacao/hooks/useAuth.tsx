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
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>
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
async function performLogin(username: string, password: string) {
  try {
    const response = await fetch('/api/admin/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    })

    const data = await response.json()

    if (response.ok) {
      return { success: true }
    } else {
      return { success: false, error: data.error || 'Erro no login' }
    }
  } catch (error) {
    console.error('Erro no login:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Erro de conexão' }
  }
}

// Função para fazer logout
async function performLogout() {
  try {
    await fetch('/api/admin/auth/logout', {
      method: 'POST',
    })
  } catch (error) {
    console.error('Erro no logout:', error)
  }
}

// Função para verificar autenticação
async function checkAuthentication(): Promise<AdminUser | null> {
  try {
    const response = await fetch('/api/admin/auth/me')
    if (response.ok) {
      const data = await response.json()
      return data.user
    }
    return null
  } catch (error) {
    console.error('Erro ao verificar autenticação:', error)
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
    checkAuth()
  }, [])

  // Função para verificar autenticação
  const checkAuth = async () => {
    try {
      setLoading(true)
      
      // Se estiver na página de login, não verificar autenticação
      const currentPath = window.location.pathname
      if (currentPath === '/admin/login') {
        setUser(null)
        setLoading(false)
        return
      }
      
      // Só verificar autenticação se não estiver na página de login
      const userData = await checkAuthentication()
      
      if (userData) {
        setUser(userData)
      } else {
        setUser(null)
        // Não redirecionar automaticamente - deixar o middleware fazer isso
      }
    } catch (error) {
      console.error('Erro ao verificar autenticação:', error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  // Função de login
  const login = async (username: string, password: string) => {
    try {
      setLoading(true)
      const result = await performLogin(username, password)
      
      if (result.success) {
        // Login bem-sucedido - redirecionar diretamente
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
      router.push('/admin/login')
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
