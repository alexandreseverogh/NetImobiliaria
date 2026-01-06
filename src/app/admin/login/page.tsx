'use client'

import { useState } from 'react'
import Image from 'next/image'

export default function AdminLoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [requires2FA, setRequires2FA] = useState(false)
  const [twoFAMessage, setTwoFAMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    console.log('🔍 Tentativa de login:', { username, password: '***', twoFactorCode: requires2FA ? '***' : 'não fornecido' })

    try {
      const response = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          username, 
          password, 
          ...(requires2FA && twoFactorCode && { twoFactorCode })
        }),
      })

      const data = await response.json()
      console.log('🔍 Resposta da API:', data)

      if (response.ok && data.success) {
        console.log('🔍 Login bem-sucedido, redirecionando...')
        // Salvar token e dados do usuário
        if (data.data && data.data.token) {
          localStorage.setItem('auth-token', data.data.token)
          localStorage.setItem('user-data', JSON.stringify(data.data.user))
        }
        // Registrar "último login" (para exibir iniciais no header da landpaging)
        try {
          const nome = data.data?.user?.nome || ''
          const isCorretor = !!data.data?.user?.creci || !!data.data?.user?.is_corretor
          localStorage.setItem(
            'last-auth-user',
            JSON.stringify({
              nome,
              userType: isCorretor ? 'corretor' : 'corretor',
              at: Date.now()
            })
          )
          window.dispatchEvent(new Event('admin-auth-changed'))
        } catch {}
        window.location.href = '/admin'
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-20 w-20 flex items-center justify-center rounded-full bg-white shadow-lg">
            <Image 
              src="/logo.png" 
              alt="Net Imobiliária" 
              width={64}
              height={64}
              className="h-16 w-16 object-contain"
              priority
            />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Net Imobiliária
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sistema Administrativo
          </p>
        </div>

        <div className="bg-white py-8 px-6 shadow-xl rounded-lg">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                  Usuário
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="Digite seu usuário"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading || requires2FA}
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Senha
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="Digite sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading || requires2FA}
                />
              </div>
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
            </div>

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

            <div className="space-y-3">
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
              
              {requires2FA && (
                <>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        setLoading(true)
                        const response = await fetch('/api/admin/auth/2fa/send-code', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ username, password })
                        })
                        const data = await response.json()
                        if (response.ok) {
                          setTwoFAMessage('Novo código enviado por email')
                          setError('')
                          setTwoFactorCode('')
                        } else {
                          setError(data.message || 'Erro ao reenviar código')
                        }
                      } catch (err) {
                        setError('Erro de conexão ao reenviar código')
                      } finally {
                        setLoading(false)
                      }
                    }}
                    disabled={loading}
                    className="w-full flex justify-center py-3 px-4 border border-blue-300 text-sm font-medium rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 disabled:opacity-50"
                  >
                    📧 Reenviar Código
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRequires2FA(false)
                      setTwoFactorCode('')
                      setTwoFAMessage('')
                      setError('')
                    }}
                    className="w-full flex justify-center py-3 px-4 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                  >
                    Voltar
                  </button>
                </>
              )}
            </div>
          </form>
        </div>

        <div className="text-center mt-6">
          <p className="text-xs text-gray-500">
            Use as credenciais do banco de dados
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Ex: admin/admin123 ou corretor1/corretor123
          </p>
        </div>
      </div>
    </div>
  )
}