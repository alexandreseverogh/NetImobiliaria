'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface SessionWarningOptions {
  warningMinutes: number // Minutos antes da expiração para avisar
  onSessionExpired: () => void // Callback quando sessão expira
  onWarningShown: () => void // Callback quando aviso é mostrado
}

interface SessionData {
  expiresAt: string
  userId: string
  username: string
}

export function useSessionWarning(options: SessionWarningOptions) {
  const [showWarning, setShowWarning] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState<number>(0)
  const [sessionData, setSessionData] = useState<SessionData | null>(null)
  const [warningShown, setWarningShown] = useState(false)
  const isCheckingRef = useRef(false)
  const lastCheckRef = useRef<number>(0)

  const { warningMinutes = 5, onSessionExpired, onWarningShown } = options

  // Função para verificar sessão
  const checkSession = useCallback(async () => {
    // Evitar múltiplas execuções simultâneas
    if (isCheckingRef.current) return

    // Debounce: só executar se passou pelo menos 55 segundos desde a última verificação
    const now = Date.now()
    if (now - lastCheckRef.current < 55000) return

    isCheckingRef.current = true
    lastCheckRef.current = now
    try {
      const token = localStorage.getItem('admin-auth-token')
      if (!token) {
        onSessionExpired()
        return
      }

      // Buscar dados da sessão atual
      const response = await fetch('/api/admin/auth/session-info', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          onSessionExpired()
          return
        }
        return
      }

      const data = await response.json()
      if (!data?.success || !data?.session) {
        // Sem sessão ativa (ou endpoint retornou "success=false"): tratar como sessão expirada
        onSessionExpired()
        return
      }

      if (data.success && data.session) {
        setSessionData(data.session)

        const expiresAt = new Date(data.session.expiresAt)
        const now = new Date()
        const timeDiff = expiresAt.getTime() - now.getTime()
        const minutesRemaining = Math.floor(timeDiff / (1000 * 60))

        setTimeRemaining(minutesRemaining)

        // Verificar se deve mostrar aviso
        if (minutesRemaining <= warningMinutes && minutesRemaining > 0 && !warningShown) {
          setShowWarning(true)
          setWarningShown(true)
          onWarningShown()
        }

        // Verificar se sessão expirou
        if (minutesRemaining <= 0) {
          onSessionExpired()
        }
      }
    } catch (error) {
      console.error('Erro ao verificar sessão:', error)
    } finally {
      isCheckingRef.current = false
    }
  }, [warningMinutes, onSessionExpired, onWarningShown, warningShown])

  // Verificar sessão a cada 60 segundos
  useEffect(() => {
    checkSession()
    const interval = setInterval(() => {
      checkSession()
    }, 60000) // 60 segundos

    return () => clearInterval(interval)
  }, [checkSession])

  // Função para renovar sessão
  const renewSession = useCallback(async () => {
    try {
      const token = localStorage.getItem('admin-auth-token')
      if (!token) return false

      const response = await fetch('/api/admin/auth/renew-session', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setShowWarning(false)
          setWarningShown(false)
          setTimeRemaining(data.session?.timeRemaining || 0)
          return true
        }
      }
      return false
    } catch (error) {
      console.error('Erro ao renovar sessão:', error)
      return false
    }
  }, [])

  // Função para fazer logout
  const logout = useCallback(async () => {
    try {
      await fetch('/api/admin/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`,
        },
      })
    } catch (error) {
      console.error('Erro no logout:', error)
    } finally {
      localStorage.removeItem('admin-auth-token')
      localStorage.removeItem('admin-user-data')
      onSessionExpired()
    }
  }, [onSessionExpired])

  return {
    showWarning,
    timeRemaining,
    sessionData,
    renewSession,
    logout,
    dismissWarning: () => setShowWarning(false)
  }
}
