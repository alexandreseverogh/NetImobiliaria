'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import { LogOut, ChevronDown, LogIn, UserPlus } from 'lucide-react'
import AuthModal from './AuthModal'
import CorretorLoginModal from './CorretorLoginModal'
import { usePublicAuth } from '@/hooks/usePublicAuth'

type LastAuthUser = {
  nome?: string
  userType?: 'cliente' | 'proprietario' | 'corretor'
  at?: number
}

export default function AuthButtons() {
  const router = useRouter()
  const { user, loading, logout, checkAuth } = usePublicAuth()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'login' | 'register'>('login')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [corretorLoginOpen, setCorretorLoginOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [adminUserNome, setAdminUserNome] = useState<string | null>(null)
  const [lastAuthUser, setLastAuthUser] = useState<LastAuthUser | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const getInitials = (nome?: string | null) => {
    const n = String(nome || '').trim()
    if (!n) return '??'
    const parts = n.split(/\s+/).filter(Boolean)
    const a = parts[0]?.[0] || ''
    const b = (parts.length > 1 ? parts[1]?.[0] : parts[0]?.[1]) || ''
    return (a + b).toUpperCase()
  }

  const refreshAdminUser = () => {
    try {
      const raw = localStorage.getItem('admin-user-data')
      if (!raw) return setAdminUserNome(null)
      const parsed = JSON.parse(raw)
      setAdminUserNome(parsed.nome || null)
    } catch {
      setAdminUserNome(null)
    }
  }

  const refreshLastAuthUser = () => {
    try {
      const raw = localStorage.getItem('public-last-auth-user') || localStorage.getItem('admin-last-auth-user')
      if (!raw) return setLastAuthUser(null)
      setLastAuthUser(JSON.parse(raw))
    } catch {
      setLastAuthUser(null)
    }
  }

  // Escutar eventos de mudança de autenticação
  useEffect(() => {
    const handleAuthChange = () => {
      checkAuth()
      refreshAdminUser()
      refreshLastAuthUser()
    }

    window.addEventListener('public-auth-changed', handleAuthChange)
    window.addEventListener('admin-auth-changed', handleAuthChange)
    return () => {
      window.removeEventListener('public-auth-changed', handleAuthChange)
      window.removeEventListener('admin-auth-changed', handleAuthChange)
    }
  }, [checkAuth])

  useEffect(() => {
    if (typeof window === 'undefined') return
    refreshAdminUser()
    refreshLastAuthUser()
    const onStorage = (e: StorageEvent) => {
      if (!e.key) return

      const criticalKeys = [
        'public-auth-token',
        'public-user-data',
        'public-last-auth-user'
      ]

      if (criticalKeys.includes(e.key)) {
        // Detectar mudanças significativas de estado de autenticação
        const wasLoggedIn = e.oldValue !== null && e.oldValue !== undefined && e.oldValue !== ''
        const isNowLoggedOut = e.newValue === null || e.newValue === undefined || e.newValue === ''

        const wasLoggedOut = e.oldValue === null || e.oldValue === undefined || e.oldValue === ''
        const isNowLoggedIn = e.newValue !== null && e.newValue !== undefined && e.newValue !== ''

        // Se houve login ou logout em outra aba, recarregar para sincronizar UI
        if ((wasLoggedIn && isNowLoggedOut) || (wasLoggedOut && isNowLoggedIn)) {
          console.log('🔄 [AuthButtons] Estado de autenticação alterado em outra aba, recarregando...')
          window.location.reload()
          return
        }

        // Caso contrário, apenas atualizar estado local
        refreshAdminUser()
        refreshLastAuthUser()
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // Fallback global: se qualquer parte do app disparar abertura do login do corretor,
  // abrir o mesmo modal de credenciais usado na landing.
  useEffect(() => {
    const open = () => setCorretorLoginOpen(true)
    window.addEventListener('open-corretor-login-modal', open)

    // Verificar se há parâmetro na URL para abrir o login do corretor (ex: após cadastro)
    const params = new URLSearchParams(window.location.search)
    if (params.get('open_corretor_login') === 'true') {
      setCorretorLoginOpen(true)

      // Limpar o parâmetro da URL para não reabrir se der refresh
      const newUrl = window.location.pathname + window.location.search.replace(/[?&]open_corretor_login=true/, '').replace(/^&/, '?')
      window.history.replaceState({}, '', newUrl)
    }

    return () => window.removeEventListener('open-corretor-login-modal', open)
  }, [])

  const openLogin = () => {
    setModalMode('login')
    setIsModalOpen(true)
  }

  const openRegister = () => {
    setModalMode('register')
    setIsModalOpen(true)
  }

  const handleLogout = async () => {
    setIsDropdownOpen(false)
    await logout()
  }

  const handleMeuPerfil = () => {
    setIsDropdownOpen(false)
    // Disparar evento customizado para abrir modal de perfil
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('open-meu-perfil-modal'))
    }
  }

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center gap-3">
        <div className="w-24 h-10 bg-gray-200 animate-pulse rounded-lg"></div>
        <div className="w-32 h-10 bg-gray-200 animate-pulse rounded-lg"></div>
      </div>
    )
  }

  // Determine session priority.
  // Goal: ALWAYS show the MOST RECENT session if multiple exist.

  // 1. Get timestamps (at) if available
  const publicRaw = typeof window !== 'undefined' ? localStorage.getItem('public-user-data') : null
  let publicAt = 0
  try { if (publicRaw) publicAt = JSON.parse(publicRaw).at || 0 } catch { }

  // 2. Use lastAuthUser as the source of truth for "last logged in"
  const displayNome = lastAuthUser?.nome || user?.nome || null
  const displayType = (lastAuthUser?.userType || user?.userType) as
    | 'cliente'
    | 'proprietario'
    | 'corretor'
    | undefined

  // Usuário logado (público ou corretor) - Mostrar dropdown com iniciais
  if (user || adminUserNome) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 border-2 border-blue-500 rounded-lg hover:from-blue-700 hover:to-blue-800 hover:border-blue-600 transition-all duration-200 shadow-md hover:shadow-lg max-w-[200px]"
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 border border-white/30">
              <span className="text-white font-black text-xs tracking-wide">{getInitials(displayNome)}</span>
            </div>
            <div className="text-left min-w-0 flex-1">
              <div className="font-semibold text-white truncate text-xs">{displayNome}</div>
              <div className="text-[10px] text-blue-100 truncate">
                {displayType === 'cliente' ? 'Cliente' : displayType === 'proprietario' ? 'Proprietário' : 'Corretor'}
              </div>
            </div>
          </div>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 flex-shrink-0 text-white ${isDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {isDropdownOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border-2 border-gray-200 py-2 z-50 overflow-hidden">
            <button
              onClick={handleMeuPerfil}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-black text-[10px]">{getInitials(displayNome)}</span>
              </div>
              <span className="font-medium">Meu Perfil</span>
            </button>
            <div className="border-t border-gray-200 my-1"></div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4 flex-shrink-0" />
              <span className="font-medium">Sair</span>
            </button>
          </div>
        )}
      </div>
    )
  }

  // Usuário não logado - Mostrar botões de Login e Cadastre-se
  return (
    <>
      <div className="flex items-center gap-3">
        <button
          onClick={openLogin}
          className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm inline-flex items-center gap-2"
        >
          <LogIn className="w-4 h-4 text-gray-600" />
          Entrar
        </button>
        <button
          onClick={openRegister}
          className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl inline-flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4 text-white" />
          Criar conta
        </button>
      </div>

      {mounted && isModalOpen && createPortal(
        <AuthModal
          mode={modalMode}
          onChangeMode={setModalMode}
          onClose={() => setIsModalOpen(false)}
          onCorretorLoginClick={() => {
            setIsModalOpen(false)
            setCorretorLoginOpen(true)
          }}
          onCorretorRegisterClick={() => {
            setIsModalOpen(false)
            router.push('/corretor/cadastro')
          }}
        />,
        document.body
      )}

      {mounted && corretorLoginOpen && createPortal(
        <CorretorLoginModal
          isOpen={corretorLoginOpen}
          onClose={() => setCorretorLoginOpen(false)}
          redirectTo={typeof window !== 'undefined' ? `${window.location.pathname}${window.location.search}${window.location.search.includes('?') ? '&' : '?'}corretor_home=true` : '/landpaging?corretor_home=true'}
        />,
        document.body
      )}
    </>
  )
}
