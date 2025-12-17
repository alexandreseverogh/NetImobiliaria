'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Eye, EyeOff } from 'lucide-react'
import UserSuccessModal from './UserSuccessModal'

interface LoginFormProps {
  userType: 'cliente' | 'proprietario'
  onBack: () => void
  onSuccess: () => void
  redirectTo?: string
}

export default function LoginForm({ userType, onBack, onSuccess, redirectTo }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [requires2FA, setRequires2FA] = useState(false)
  const [twoFAMessage, setTwoFAMessage] = useState('')
  const [isReady, setIsReady] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [loggedInUser, setLoggedInUser] = useState<any>(null)
  const [showPassword, setShowPassword] = useState(false)

  // Forçar limpeza dos campos quando o componente montar
  useEffect(() => {
    setEmail('')
    setPassword('')
    setTwoFactorCode('')
    setError('')
    setRequires2FA(false)
    setTwoFAMessage('')
    
    // Remover readonly após 100ms (técnica anti-autocomplete)
    const timer = setTimeout(() => {
      setIsReady(true)
    }, 100)
    
    return () => clearTimeout(timer)
  }, [userType]) // Limpa quando trocar de tipo (cliente/proprietario)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/public/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          userType,
          ...(requires2FA && twoFactorCode && { twoFactorCode })
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // Login bem-sucedido
        localStorage.setItem('public-auth-token', data.data.token)
        localStorage.setItem('public-user-data', JSON.stringify(data.data.user))
        
        // Se for proprietário e houver redirectTo, usar autenticação admin primeiro
        if (userType === 'proprietario' && redirectTo) {
          // Fazer login na API admin também para acessar área admin
          try {
            // Tentar primeiro com email, depois com username se disponível
            const adminLoginResponse = await fetch('/api/admin/auth/login', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                username: email, // Tentar com email primeiro
                password: password,
              }),
            })
            
            const adminLoginData = await adminLoginResponse.json()
            
            if (adminLoginResponse.ok && adminLoginData.success && adminLoginData.data?.token) {
              // Salvar token admin
              localStorage.setItem('auth-token', adminLoginData.data.token)
              if (adminLoginData.data.user) {
                localStorage.setItem('user-data', JSON.stringify(adminLoginData.data.user))
              }
              
              // Aguardar um pouco para garantir que o token foi salvo
              await new Promise(resolve => setTimeout(resolve, 100))
            } else {
              // Se login admin falhar, pode ser que o proprietário não tenha conta admin
              // Tentar redirecionar mesmo assim - o middleware vai tratar
              console.warn('Login admin falhou:', adminLoginData.message || 'Erro desconhecido')
              console.warn('Tentando redirecionar mesmo assim - o usuário pode precisar fazer login admin separadamente')
            }
          } catch (adminError: any) {
            console.error('Erro ao fazer login admin:', adminError)
            // Se houver erro de rede ou outro erro crítico, não bloquear o fluxo
            // O modal ainda será exibido, mas pode não conseguir acessar a área admin
          }
        }
        
        // Exibir modal de sucesso com dados do usuário
        setLoggedInUser(data.data.user)
        setShowSuccessModal(true)
        
        // Disparar evento customizado para atualizar AuthButtons após um pequeno delay
        // para garantir que o localStorage foi atualizado
        if (typeof window !== 'undefined') {
          setTimeout(() => {
            window.dispatchEvent(new Event('public-auth-changed'))
          }, 100)
        }
      } else if (data.requires2FA) {
        // 2FA necessário
        setRequires2FA(true)
        setTwoFAMessage(data.message || 'Código de verificação enviado por email')
        setError('')
      } else {
        setError(data.message || 'Erro ao fazer login')
        setRequires2FA(false)
        setTwoFactorCode('')
        setTwoFAMessage('')
      }
    } catch (error) {
      console.error('Erro na requisição:', error)
      setError('Erro de conexão. Tente novamente.')
      setRequires2FA(false)
      setTwoFactorCode('')
      setTwoFAMessage('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Botão Voltar */}
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </button>

      {/* Email */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          data-form-type="other"
          readOnly={!isReady}
          onFocus={(e) => {
            if (!isReady) {
              e.target.removeAttribute('readonly')
              setIsReady(true)
            }
          }}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading || requires2FA}
        />
      </div>

      {/* Senha */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
          Senha
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            required
            autoComplete="new-password"
            data-form-type="other"
            readOnly={!isReady}
            onFocus={(e) => {
              if (!isReady) {
                e.target.removeAttribute('readonly')
                setIsReady(true)
              }
            }}
            className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            placeholder="Digite sua senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading || requires2FA}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            disabled={loading || requires2FA}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
          >
            {showPassword ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Código 2FA */}
      {requires2FA && (
        <div>
          <label htmlFor="twoFactorCode" className="block text-sm font-medium text-gray-700 mb-1">
            Código de Verificação
          </label>
          <div className="flex justify-center space-x-2">
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <input
                key={index}
                type="text"
                maxLength={1}
                className="w-12 h-12 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                value={twoFactorCode[index] || ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '')
                  if (value.length <= 1) {
                    const newCode = twoFactorCode.split('')
                    newCode[index] = value
                    setTwoFactorCode(newCode.join('').slice(0, 6))
                    
                    // Auto-focus no próximo campo
                    if (value && index < 5) {
                      const nextInput = document.getElementById(`code-${index + 1}`)
                      nextInput?.focus()
                    }
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Backspace' && !twoFactorCode[index] && index > 0) {
                    const prevInput = document.getElementById(`code-${index - 1}`)
                    prevInput?.focus()
                  }
                }}
                id={`code-${index}`}
                disabled={loading}
              />
            ))}
          </div>
          <p className="text-xs text-gray-500 text-center mt-2">
            Digite o código de 6 dígitos enviado para seu email
          </p>
        </div>
      )}

      {/* Mensagem 2FA */}
      {twoFAMessage && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                {twoFAMessage}
              </h3>
              <p className="text-xs text-blue-600 mt-1">
                Verifique sua caixa de entrada e spam
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Erro */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                {error}
              </h3>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Sucesso */}
      {showSuccessModal && loggedInUser && (
        <UserSuccessModal
          isOpen={showSuccessModal}
          onClose={() => {
            setShowSuccessModal(false)
            onSuccess()
          }}
          userData={loggedInUser}
          redirectTo={redirectTo}
        />
      )}

      {/* Botões */}
      <div className="space-y-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          {loading ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              {requires2FA ? 'Verificando...' : 'Entrando...'}
            </div>
          ) : (
            requires2FA ? 'Verificar Código' : 'Entrar'
          )}
        </button>
      </div>
    </form>
  )
}

