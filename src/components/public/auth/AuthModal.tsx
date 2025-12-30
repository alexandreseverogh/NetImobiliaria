'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, User, Building2, Briefcase } from 'lucide-react'
import LoginForm from './LoginForm'
import RegisterForm from './RegisterForm'

interface AuthModalProps {
  mode: 'login' | 'register'
  onClose: () => void
  onChangeMode?: (mode: 'login' | 'register') => void
  initialUserType?: 'cliente' | 'proprietario' | null
  redirectTo?: string
  onCorretorLoginClick?: () => void
  onCorretorRegisterClick?: () => void
}

export default function AuthModal({
  mode,
  onClose,
  onChangeMode,
  initialUserType = null,
  redirectTo,
  onCorretorLoginClick,
  onCorretorRegisterClick
}: AuthModalProps) {
  const router = useRouter()
  const [userType, setUserType] = useState<'cliente' | 'proprietario' | null>(initialUserType)
  const [step, setStep] = useState<'choose-type' | 'form'>(initialUserType ? 'form' : 'choose-type')

  // Se o mode mudar (ex.: Entrar -> Criar conta), resetar para escolha de perfil
  // (a não ser que o chamador tenha fixado initialUserType).
  useEffect(() => {
    if (initialUserType) {
      setUserType(initialUserType)
      setStep('form')
      return
    }
    setUserType(null)
    setStep('choose-type')
  }, [mode, initialUserType])

  const handleUserTypeSelect = (type: 'cliente' | 'proprietario') => {
    setUserType(type)
    setStep('form')
  }

  const handleCorretorClick = () => {
    // Entrar: abrir o modal de login do corretor (sem navegar para /admin/login)
    if (mode === 'login') {
      onClose()
      if (onCorretorLoginClick) {
        onCorretorLoginClick()
        return
      }
      // Fallback robusto: em qualquer lugar que use AuthModal, abrimos o modal de credenciais do corretor
      // via evento global (evita navegar direto para /admin por conta de token pré-existente).
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('open-corretor-login-modal'))
      }
      return
    }

    // Criar conta: direcionar para o cadastro público de corretor
    if (onCorretorRegisterClick) {
      onClose()
      onCorretorRegisterClick()
      return
    }
    onClose()
    router.push('/admin/usuarios?public_broker=true')
  }

  const handleBack = () => {
    setStep('choose-type')
    setUserType(null)
  }

  const title = mode === 'login' ? 'Entrar' : 'Criar conta'
  const chooseSubtitle =
    mode === 'login'
      ? 'Selecione seu perfil para acessar sua área.'
      : 'Escolha seu perfil para se cadastrar.'

  const userTypeLabel = userType === 'cliente' ? 'Cliente' : 'Proprietário'
  const formSubtitle =
    mode === 'login' ? `Entrando como ${userTypeLabel}` : `Criando conta como ${userTypeLabel}`

  const switchModeLabel =
    mode === 'login' ? 'Ainda não tem conta? Criar conta' : 'Já tem conta? Entrar'
  const switchModeTarget: 'login' | 'register' = mode === 'login' ? 'register' : 'login'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {title}
            </h2>
            {step === 'choose-type' && (
              <p className="text-sm text-gray-600 mt-1">
                {chooseSubtitle}
              </p>
            )}
            {step === 'form' && userType && (
              <p className="text-sm text-gray-600 mt-1">
                {formSubtitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-7 py-6">
          {step === 'choose-type' ? (
            /* Escolha de Tipo de Usuário */
            <div className="space-y-3">
              <button
                onClick={() => handleUserTypeSelect('cliente')}
                className="w-full flex items-center gap-4 p-5 text-left border-2 border-gray-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 group"
              >
                <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {mode === 'login' ? 'Entrar como Cliente' : 'Cadastrar como Cliente'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Encontrar imóveis para comprar ou alugar
                  </p>
                </div>
              </button>

              <button
                onClick={() => handleUserTypeSelect('proprietario')}
                className="w-full flex items-center gap-4 p-5 text-left border-2 border-gray-300 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all duration-200 group"
              >
                <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                  <Building2 className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {mode === 'login' ? 'Entrar como Proprietário' : 'Cadastrar como Proprietário'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Anunciar imóveis para venda ou locação
                  </p>
                </div>
              </button>

              {/* Corretor: hoje é acesso ao painel admin (não há cadastro público aqui).
                  Para evitar confusão, exibimos no modal de "Entrar" e, no de cadastro,
                  mostramos como "Acesso do corretor". */}
              {mode === 'login' ? (
                <button
                  onClick={handleCorretorClick}
                  className="w-full flex items-center gap-4 p-5 text-left border-2 border-gray-300 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all duration-200 group"
                >
                  <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                    <Briefcase className="w-6 h-6 text-purple-700" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Entrar como Corretor</h3>
                    <p className="text-sm text-gray-600">Acesso ao painel administrativo</p>
                  </div>
                </button>
              ) : (
                <button
                  onClick={handleCorretorClick}
                  className="w-full flex items-center gap-4 p-5 text-left border-2 border-gray-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all duration-200 group"
                >
                  <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                    <Briefcase className="w-6 h-6 text-purple-700" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Acesso do Corretor</h3>
                    <p className="text-sm text-gray-600">Já tem acesso? Entre pelo painel</p>
                  </div>
                </button>
              )}

              {onChangeMode && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => onChangeMode(switchModeTarget)}
                    className="w-full text-center text-sm font-medium text-blue-700 hover:text-blue-800 transition-colors"
                  >
                    {switchModeLabel}
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Formulário de Login ou Cadastro */
            <div>
              {mode === 'login' && userType && (
                <LoginForm
                  userType={userType}
                  onBack={handleBack}
                  onSuccess={onClose}
                  redirectTo={redirectTo}
                />
              )}
              {mode === 'register' && userType && (
                <RegisterForm
                  userType={userType}
                  onBack={handleBack}
                  onSuccess={onClose}
                />
              )}

              {onChangeMode && (
                <div className="pt-4">
                  <button
                    type="button"
                    onClick={() => onChangeMode(switchModeTarget)}
                    className="w-full text-center text-sm font-medium text-blue-700 hover:text-blue-800 transition-colors"
                  >
                    {switchModeLabel}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

