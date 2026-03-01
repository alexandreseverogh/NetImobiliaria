'use client'

import { useEffect, useState } from 'react'
import { X, Eye, EyeOff } from 'lucide-react'
interface CorretorLoginModalProps {
  isOpen: boolean
  onClose: () => void
  redirectTo?: string
  afterLoginRedirectTo?: string
}

export default function CorretorLoginModal({
  isOpen,
  onClose,
  redirectTo = '/admin',
  afterLoginRedirectTo
}: CorretorLoginModalProps) {
  const [view, setView] = useState<'login' | 'forgot-request' | 'forgot-verify' | 'forgot-reset'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [requires2FA, setRequires2FA] = useState(false)
  const [twoFAMessage, setTwoFAMessage] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [forgotPasswordStatus, setForgotPasswordStatus] = useState({ loading: false, message: '', success: false })

  useEffect(() => {
    if (!isOpen) return
    setUsername('')
    setPassword('')
    setTwoFactorCode('')
    setError('')
    setLoading(false)
    setRequires2FA(false)
    setTwoFAMessage('')
    setShowPassword(false)
    setShowConfirmPassword(false)
    setView('login')
    setEmail('')
    setNewPassword('')
    setConfirmPassword('')
    setResetToken('')
    setForgotPasswordStatus({ loading: false, message: '', success: false })
  }, [isOpen])

  if (!isOpen) return null

  const handleForgotPasswordRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setForgotPasswordStatus({ loading: true, message: '', success: false })

    try {
      const resp = await fetch('/api/public/auth/forgot-password/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, userType: 'corretor' })
      })
      const data = await resp.json()
      if (data.success) {
        setForgotPasswordStatus({ loading: false, message: data.message, success: true })
        setView('forgot-verify')
        setTwoFactorCode('')
      } else {
        setError(data.message)
        setForgotPasswordStatus({ loading: false, message: '', success: false })
      }
    } catch {
      setError('Erro ao solicitar recuperação.')
      setForgotPasswordStatus({ loading: false, message: '', success: false })
    }
  }

  const handleForgotPasswordVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setForgotPasswordStatus({ loading: true, message: '', success: false })

    try {
      const resp = await fetch('/api/public/auth/forgot-password/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: twoFactorCode, userType: 'corretor' })
      })
      const data = await resp.json()
      if (data.success) {
        setResetToken(data.resetToken)
        setView('forgot-reset')
        setForgotPasswordStatus({ loading: false, message: '', success: false })
      } else {
        setError(data.message)
        setForgotPasswordStatus({ loading: false, message: '', success: false })
      }
    } catch {
      setError('Erro ao validar código.')
      setForgotPasswordStatus({ loading: false, message: '', success: false })
    }
  }

  const handleForgotPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (newPassword !== confirmPassword) {
      setError('As senhas não conferem.')
      return
    }

    setForgotPasswordStatus({ loading: true, message: '', success: false })

    try {
      const resp = await fetch('/api/public/auth/forgot-password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetToken, newPassword })
      })
      const data = await resp.json()
      if (data.success) {
        setForgotPasswordStatus({ loading: false, message: data.message, success: true })
        setTimeout(() => {
          setView('login')
          setError('')
          setForgotPasswordStatus({ loading: false, message: '', success: false })
          setPassword('')
        }, 3000)
      } else {
        setError(data.message)
        setForgotPasswordStatus({ loading: false, message: '', success: false })
      }
    } catch {
      setError('Erro ao redefinir senha.')
      setForgotPasswordStatus({ loading: false, message: '', success: false })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password,
          ...(requires2FA && twoFactorCode && { twoFactorCode })
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        const u = data.data?.user

        // 🔒 VALIDAÇÃO DE PERFIL: Trava de segurança no Frontend (Aplicada ANTES de qualquer redirect)
        const roleName = String(u?.role_name || '').toLowerCase()
        const isCorretor = roleName.includes('corretor') || roleName.includes('admin')

        if (!isCorretor) {
          setError('Essa área é restrita ao perfil de Corretor.')
          localStorage.removeItem('auth-token')
          localStorage.removeItem('user-data')
          localStorage.removeItem('last-auth-user')
          setLoading(false)
          return
        }

        if (data.data?.token) {
          localStorage.setItem('auth-token', data.data.token)
        }
        if (u) {
          localStorage.setItem('user-data', JSON.stringify({
            ...u,
            at: Date.now()
          }))
        }
        try {
          localStorage.setItem(
            'last-auth-user',
            JSON.stringify({
              nome: u?.nome || '',
              userType: 'corretor',
              at: Date.now()
            })
          )
          localStorage.removeItem('public-last-auth-user')
          localStorage.removeItem('public-auth-token')
          localStorage.removeItem('public-user-data')

          window.dispatchEvent(new Event('public-corretor-auth-changed'))
        } catch { }

        if (afterLoginRedirectTo) {
          onClose()
          window.location.href = afterLoginRedirectTo
          return
        }

        const buildSuccessAndRedirect = (u: any) => {
          const fotoBase64 = u?.foto as string | null | undefined
          const fotoMime = (u?.foto_tipo_mime as string | null | undefined) || 'image/jpeg'
          const fotoDataUrl = fotoBase64 ? `data:${fotoMime};base64,${fotoBase64}` : undefined
          const successPayload = {
            id: u.id,
            nome: u.nome,
            email: u.email,
            userType: 'corretor',
            telefone: u.telefone || undefined,
            cpf: u.cpf || undefined,
            creci: u.creci || undefined,
            isencao: !!u.isencao,
            fotoDataUrl
          }

          try {
            sessionStorage.setItem('corretor_success_user', JSON.stringify(successPayload))
          } catch { }

          try {
            const to = redirectTo || '/landpaging?corretor_home=true'
            if (String(to).startsWith('/landpaging')) {
              try {
                if (typeof window !== 'undefined' && window.location?.pathname?.startsWith('/landpaging')) {
                  window.dispatchEvent(new CustomEvent('open-corretor-home-modal', { detail: successPayload }))
                  onClose()
                  return
                }
              } catch { }

              try {
                sessionStorage.setItem('suppress-geolocation-detect-once', 'true')
                sessionStorage.setItem('suppress-geolocation-modal-once', 'true')
              } catch { }
              onClose()
              window.location.href = to
              return
            }
          } catch { }

          onClose()
          window.location.href = redirectTo
        }

        if (u?.nome && u?.email) {
          buildSuccessAndRedirect(u)
          return
        }

        try {
          const token = data.data?.token || localStorage.getItem('auth-token')
          if (token) {
            const meResp = await fetch('/api/admin/auth/me', {
              method: 'GET',
              headers: { Authorization: `Bearer ${token}` }
            })
            const meData = await meResp.json().catch(() => null)
            if (meResp.ok && meData?.success && meData?.user?.nome && meData?.user?.email) {
              try {
                localStorage.setItem('user-data', JSON.stringify(meData.user))
              } catch { }
              buildSuccessAndRedirect(meData.user)
              return
            }
          }
        } catch { }

        onClose()
        window.location.href = redirectTo
        return
      }

      if (data.requires2FA) {
        setRequires2FA(true)
        setTwoFAMessage(data.message || 'Código de verificação enviado por email')
        setError('')
      } else {
        setError(data.message || 'Erro ao fazer login')
        setRequires2FA(false)
        setTwoFactorCode('')
        setTwoFAMessage('')
      }
    } catch (err) {
      console.error('Erro no login do corretor:', err)
      setError('Erro de conexão. Tente novamente.')
      setRequires2FA(false)
      setTwoFactorCode('')
      setTwoFAMessage('')
    } finally {
      setLoading(false)
    }
  }

  const update2FACodeAt = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(0, 1)
    const arr = twoFactorCode.split('')
    arr[index] = digit
    const next = arr.join('').slice(0, 6)
    setTwoFactorCode(next)

    const inputId = view === 'forgot-verify' ? `forgot-corretor-2fa-${index + 1}` : `corretor-2fa-${index + 1}`
    if (digit && index < 5) {
      const nextInput = document.getElementById(inputId)
      nextInput?.focus()
    }
  }

  const title = view === 'login' ? 'Entrar' : 'Recuperação de Senha'
  const subtitle = view === 'login' ? 'Entrando como Corretor' : 'Portal do Corretor'

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl my-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-7 py-6">
          {view === 'login' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Usuário</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading || requires2FA}
                  autoComplete="off"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="Seu usuário ou email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading || requires2FA}
                    autoComplete="new-password"
                    className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Digite sua senha"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    disabled={loading || requires2FA}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  >
                    {showPassword ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                  </button>
                </div>
                <div className="flex justify-end mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setView('forgot-request')
                      setError('')
                    }}
                    className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    Esqueci minha senha
                  </button>
                </div>
              </div>

              {requires2FA && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Código de Verificação</label>
                  <div className="flex justify-center space-x-2">
                    {[0, 1, 2, 3, 4, 5].map((index) => (
                      <input
                        key={index}
                        id={`corretor-2fa-${index}`}
                        type="text"
                        maxLength={1}
                        className="w-12 h-12 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        value={twoFactorCode[index] || ''}
                        onChange={(e) => update2FACodeAt(index, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Backspace' && !twoFactorCode[index] && index > 0) {
                            document.getElementById(`corretor-2fa-${index - 1}`)?.focus()
                          }
                        }}
                        disabled={loading}
                      />
                    ))}
                  </div>
                </div>
              )}

              {twoFAMessage && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-xs text-blue-800 italic">
                  {twoFAMessage}
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-md transition-all disabled:opacity-50"
              >
                {loading ? (requires2FA ? 'Verificando...' : 'Entrando...') : requires2FA ? 'Verificar Código' : 'Entrar'}
              </button>
            </form>
          )}

          {view === 'forgot-request' && (
            <div className="space-y-4">
              <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-700">
                Digite seu e-mail de corretor para receber um código de recuperação.
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="seu@email.com"
                />
              </div>
              {error && <div className="text-sm text-red-600">{error}</div>}
              <button
                onClick={handleForgotPasswordRequest}
                disabled={forgotPasswordStatus.loading || !email}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-all"
              >
                {forgotPasswordStatus.loading ? 'Enviando...' : 'Enviar Código'}
              </button>
              <button
                onClick={() => setView('login')}
                className="w-full text-center text-sm text-gray-500 hover:underline"
              >
                Voltar ao Login
              </button>
            </div>
          )}

          {view === 'forgot-verify' && (
            <div className="space-y-4 text-center">
              <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-700 text-left">
                Código enviado! Digite os 6 dígitos que você recebeu por e-mail.
              </div>
              <div className="flex justify-center space-x-2">
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <input
                    key={index}
                    id={`forgot-corretor-2fa-${index}`}
                    type="text"
                    maxLength={1}
                    className="w-11 h-11 text-center text-xl font-bold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    value={twoFactorCode[index] || ''}
                    onChange={(e) => update2FACodeAt(index, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Backspace' && !twoFactorCode[index] && index > 0) {
                        document.getElementById(`forgot-corretor-2fa-${index - 1}`)?.focus()
                      }
                    }}
                  />
                ))}
              </div>
              {error && <div className="text-sm text-red-600">{error}</div>}
              <button
                onClick={handleForgotPasswordVerify}
                disabled={forgotPasswordStatus.loading || twoFactorCode.length < 6}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {forgotPasswordStatus.loading ? 'Validando...' : 'Validar Código'}
              </button>
              <button onClick={() => setView('forgot-request')} className="text-sm text-gray-500 hover:underline">
                Reenviar código
              </button>
            </div>
          )}

          {view === 'forgot-reset' && (
            <form onSubmit={handleForgotPasswordReset} className="space-y-4">
              <div className="bg-green-50 p-3 rounded-lg text-xs text-green-700 mb-2">
                Código validado! Escolha sua nova senha de corretor.
              </div>
              {forgotPasswordStatus.success ? (
                <div className="p-4 bg-green-100 text-green-800 rounded-lg text-sm font-medium">
                  {forgotPasswordStatus.message} Conteúdo sendo atualizado...
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nova Senha</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                        placeholder="Mínimo 6 caracteres"
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                        {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Senha</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                        placeholder="Repita a nova senha"
                      />
                      <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                        {showConfirmPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  {error && <div className="text-sm text-red-600">{error}</div>}
                  <button
                    type="submit"
                    disabled={forgotPasswordStatus.loading || !newPassword || newPassword !== confirmPassword}
                    className="w-full py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
                  >
                    {forgotPasswordStatus.loading ? 'Salvando...' : 'Redefinir Senha'}
                  </button>
                </>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  )
}


