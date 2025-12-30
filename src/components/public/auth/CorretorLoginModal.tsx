'use client'

import { useEffect, useState } from 'react'
import { X, Eye, EyeOff } from 'lucide-react'
import UserSuccessModal from '@/components/public/auth/UserSuccessModal'

interface CorretorLoginModalProps {
  isOpen: boolean
  onClose: () => void
  redirectTo?: string
}

export default function CorretorLoginModal({ isOpen, onClose, redirectTo = '/admin' }: CorretorLoginModalProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [requires2FA, setRequires2FA] = useState(false)
  const [twoFAMessage, setTwoFAMessage] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [successOpen, setSuccessOpen] = useState(false)
  const [successUser, setSuccessUser] = useState<{
    id: string
    nome: string
    email: string
    telefone?: string
    cpf?: string
    creci?: string
    isencao?: boolean
    fotoDataUrl?: string
  } | null>(null)

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
    setSuccessOpen(false)
    setSuccessUser(null)
  }, [isOpen])

  if (!isOpen) return null

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
        if (data.data?.token) {
          localStorage.setItem('auth-token', data.data.token)
        }
        if (data.data?.user) {
          localStorage.setItem('user-data', JSON.stringify(data.data.user))
        }

        const u = data.data?.user
        if (u?.nome && u?.email) {
          const fotoBase64 = u.foto as string | null | undefined
          const fotoMime = (u.foto_tipo_mime as string | null | undefined) || 'image/jpeg'
          const fotoDataUrl = fotoBase64 ? `data:${fotoMime};base64,${fotoBase64}` : undefined
          const successPayload = {
            id: u.id,
            nome: u.nome,
            email: u.email,
            telefone: u.telefone || undefined,
            cpf: u.cpf || undefined,
            creci: u.creci || undefined,
            isencao: !!u.isencao,
            fotoDataUrl
          }

          // Persistir dados do corretor para reabrir o modal ao voltar de fluxos do admin (ex.: Novo Proprietário)
          try {
            sessionStorage.setItem('corretor_success_user', JSON.stringify(successPayload))
          } catch {}

          setSuccessUser(successPayload)
          setSuccessOpen(true)
          return
        }

        // fallback: se não vier user, segue fluxo antigo
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

  if (successOpen && successUser) {
    return (
      <UserSuccessModal
        isOpen={true}
        onClose={() => {
          setSuccessOpen(false)
          setSuccessUser(null)
          onClose()
        }}
        userData={{
          id: successUser.id,
          nome: successUser.nome,
          email: successUser.email,
          telefone: successUser.telefone,
          cpf: successUser.cpf,
          creci: successUser.creci,
          isencao: successUser.isencao,
          fotoDataUrl: successUser.fotoDataUrl,
          userType: 'corretor'
        }}
        redirectTo={redirectTo}
      />
    )
  }

  const update2FACodeAt = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(0, 1)
    const arr = twoFactorCode.split('')
    arr[index] = digit
    const next = arr.join('').slice(0, 6)
    setTwoFactorCode(next)

    if (digit && index < 5) {
      const nextInput = document.getElementById(`corretor-2fa-${index + 1}`)
      nextInput?.focus()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Entrar</h2>
            <p className="text-sm text-gray-600 mt-1">Entrando como Corretor</p>
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
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
                      className="w-12 h-12 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      value={twoFactorCode[index] || ''}
                      onChange={(e) => update2FACodeAt(index, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Backspace' && !twoFactorCode[index] && index > 0) {
                          const prevInput = document.getElementById(`corretor-2fa-${index - 1}`)
                          prevInput?.focus()
                        }
                      }}
                      disabled={loading}
                    />
                  ))}
                </div>
                <p className="text-xs text-gray-500 text-center mt-2">
                  Digite o código de 6 dígitos enviado para seu email
                </p>
              </div>
            )}

            {twoFAMessage && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
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
              className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {loading ? (requires2FA ? 'Verificando...' : 'Entrando...') : requires2FA ? 'Verificar Código' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}


