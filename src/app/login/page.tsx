'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

export default function LoginPage() {
  const searchParams = useSearchParams()
  const system = searchParams.get('system') || 'admin'
  const isCRM = system === 'crm'
  
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [error, setError] = useState('')
  const [requires2FA, setRequires2FA] = useState(false)
  const { login, loading } = useAuth()

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
    <div className={`min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-1000 ${isCRM ? 'bg-[#020617]' : 'bg-gray-50'}`}>
      <div className={`max-w-md w-full space-y-8 p-10 rounded-3xl transition-all duration-1000 ${isCRM ? 'bg-white/5 border border-white/10 backdrop-blur-xl' : ''}`}>
        <div className="flex flex-col items-center">
          {isCRM ? (
            <img 
              src="/olhos-de-aguia-logo.png" 
              alt="Olhos de Águia" 
              className="h-32 w-auto drop-shadow-[0_0_25px_rgba(59,130,246,0.5)] transition-all duration-700 hover:scale-105" 
            />
          ) : (
            <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-blue-100 shadow-inner">
               <span className="text-3xl">🏠</span>
            </div>
          )}
          
          <h2 className={`mt-6 text-center text-4xl font-black tracking-tight italic uppercase ${isCRM ? 'text-gray-900' : 'text-blue-900'}`}>
            {isCRM ? (
              <>
                <span className="text-gray-400">Olhos de</span>{' '}
                <span className="text-blue-600 drop-shadow-sm">Águia</span>
              </>
            ) : (
              'Imovitec'
            )}
          </h2>
          
          <p className="mt-2 text-center text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] ml-1">
            {isCRM ? '' : 'Sistema Administrativo'}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
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
                className={`appearance-none rounded-none relative block w-full px-4 py-3 border placeholder-gray-500 rounded-t-xl focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm transition-all ${
                  isCRM ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-gray-300 text-gray-900'
                }`}
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
                className={`appearance-none rounded-none relative block w-full px-4 py-3 border placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm transition-all ${
                  requires2FA ? '' : 'rounded-b-xl'
                } ${
                  isCRM ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-gray-300 text-gray-900'
                }`}
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
              className={`group relative w-full flex justify-center py-4 px-4 border border-transparent text-sm font-bold uppercase tracking-widest rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 ${
                isCRM 
                  ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_30px_rgba(37,99,235,0.6)]' 
                  : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 focus:ring-offset-2'
              }`}
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
