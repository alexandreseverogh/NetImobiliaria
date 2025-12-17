'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [error, setError] = useState('')
  const [csrfToken, setCsrfToken] = useState('')
  const [requires2FA, setRequires2FA] = useState(false)
  const { login, loading } = useAuth()

  // Gerar token CSRF simples
  useEffect(() => {
    setCsrfToken(Math.random().toString(36).substring(2, 15))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validação de entrada
    if (!username.trim() || !password.trim()) {
      setError('Por favor, preencha todos os campos')
      return
    }

    if (username.length < 3) {
      setError('Usuário deve ter pelo menos 3 caracteres')
      return
    }

    if (password.length < 6) {
      setError('Senha deve ter pelo menos 6 caracteres')
      return
    }

    try {
      const result = await login(username.trim(), password.trim(), twoFactorCode.trim())

      if (!result.success) {
        if (result.requires2FA) {
          setRequires2FA(true)
          setError('Código de verificação enviado por email. Digite o código abaixo.')
        } else {
          setError(result.error || 'Credenciais inválidas')
        }
      }
    } catch (error) {
      console.error('Erro no login:', error)
      setError('Erro de conexão. Tente novamente.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100">
            <span className="text-2xl">🏠</span>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Net Imobiliária
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sistema Administrativo
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <input type="hidden" name="csrf" value={csrfToken} />
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="username" className="sr-only">
                Usuário
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Usuário"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Senha
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm ${requires2FA ? 'rounded-none' : 'rounded-b-md'}`}
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
            {requires2FA && (
              <div className="mt-4 animate-fadeIn">
                <label htmlFor="twoFactorCode" className="block text-sm font-medium text-gray-700 mb-2">
                  🔐 Código de Verificação
                </label>
                <input
                  id="twoFactorCode"
                  name="twoFactorCode"
                  type="text"
                  required
                  className="appearance-none rounded-md relative block w-full px-4 py-3 border-2 border-blue-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-lg font-mono tracking-widest shadow-sm"
                  placeholder="000000"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value)}
                  disabled={loading}
                  maxLength={6}
                  style={{ letterSpacing: '0.5em' }}
                  autoFocus
                />
                <p className="mt-1 text-xs text-gray-500 text-center">
                  Digite o código de 6 dígitos recebido por email
                </p>
              </div>
            )}
          </div>

          {/* Mensagem de erro */}
          {error && !requires2FA && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
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

          {/* Mensagem informativa de 2FA */}
          {requires2FA && (
            <div className="rounded-md bg-blue-50 border border-blue-200 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <div className="text-sm text-blue-700">
                    <div className="font-medium text-blue-800 mb-1">
                      📧 Código de verificação enviado!
                    </div>
                    <div className="text-blue-600">
                      Verifique seu email e digite o código de 6 dígitos no campo abaixo.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {requires2FA ? 'Verificando código...' : 'Entrando...'}
                </div>
              ) : (
                requires2FA ? '🔐 Verificar e Entrar' : 'Entrar'
              )}
            </button>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              Use as credenciais do banco de dados
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Ex: admin/admin123 ou corretor1/corretor123
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
