'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { User, LogOut, ChevronDown, LogIn, UserPlus } from 'lucide-react'
import AuthModal from './AuthModal'
import CorretorLoginModal from './CorretorLoginModal'
import { usePublicAuth } from '@/hooks/usePublicAuth'

export default function AuthButtons() {
  const router = useRouter()
  const { user, loading, logout, checkAuth } = usePublicAuth()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'login' | 'register'>('login')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [corretorLoginOpen, setCorretorLoginOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Escutar eventos de mudança de autenticação
  useEffect(() => {
    const handleAuthChange = () => {
      checkAuth()
    }

    window.addEventListener('public-auth-changed', handleAuthChange)
    return () => {
      window.removeEventListener('public-auth-changed', handleAuthChange)
    }
  }, [checkAuth])

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

  const handleLogout = () => {
    setIsDropdownOpen(false)
    logout()
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

  // Usuário logado - Mostrar dropdown
  if (user) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 border-2 border-blue-500 rounded-lg hover:from-blue-700 hover:to-blue-800 hover:border-blue-600 transition-all duration-200 shadow-md hover:shadow-lg max-w-[200px]"
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 border border-white/30">
              <User className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="text-left min-w-0 flex-1">
              <div className="font-semibold text-white truncate text-xs">{user.nome}</div>
              <div className="text-[10px] text-blue-100 truncate">
                {user.userType === 'cliente' ? 'Cliente' : 'Proprietário'}
              </div>
            </div>
          </div>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 flex-shrink-0 text-white ${isDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border-2 border-gray-200 py-2 z-50 overflow-hidden">
            <button
              onClick={handleMeuPerfil}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 transition-colors"
            >
              <User className="w-4 h-4 text-blue-600 flex-shrink-0" />
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

      {isModalOpen && (
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
            router.push('/admin/usuarios?public_broker=true')
          }}
        />
      )}

      <CorretorLoginModal
        isOpen={corretorLoginOpen}
        onClose={() => setCorretorLoginOpen(false)}
        redirectTo="/landpaging"
      />
    </>
  )
}

