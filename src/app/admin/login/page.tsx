'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'

function LoginContent() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [requires2FA, setRequires2FA] = useState(false)
  const [twoFAMessage, setTwoFAMessage] = useState('')

  // Multi-tenant & Multi-segment logic
  const [requiresTenantSelection, setRequiresTenantSelection] = useState(false)
  const [requiresSegmentSelection, setRequiresSegmentSelection] = useState(false)
  const [tenants, setTenants] = useState<any[]>([])
  const [segments, setSegments] = useState<any[]>([])
  const [authUserId, setAuthUserId] = useState('')
  const [selectedTenantId, setSelectedTenantId] = useState('')

  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/admin'
  const isCRM = callbackUrl.includes('/crm') || searchParams.get('system') === 'crm'

  // Blindagem: Garantir que a tela comece SEMPRE no form de login
  useEffect(() => {
    // Tolerância Zero: Limpeza de pré-sessão para evitar vazamento de dados
    setRequiresTenantSelection(false);
    setRequiresSegmentSelection(false);
    setTenants([]);
    setSegments([]);
    setError('');

    // Opcional: Limpar resíduos do localStorage para segurança extra
    if (typeof window !== 'undefined') {
      localStorage.removeItem('admin-user-data-temporary');
    }
  }, []);

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
          isCRM,
          tenantId: selectedTenantId || undefined,
          twoFactorCode: requires2FA ? twoFactorCode : undefined
        }),
      })

      const data = await response.json()

      if (response.ok && (data.success || data.requires2FA)) {
        if (data.requires2FA) {
          setRequires2FA(true)
          setTwoFAMessage(data.message || 'Código de verificação enviado')
          setLoading(false)
          return
        }

        if (data.requiresTenantSelection) {
          setRequiresTenantSelection(true)
          setTenants(data.tenants)
          setAuthUserId(data.user?.id || '')
          setLoading(false)
          return
        }

        completeAuth(data)
      } else {
        setError(data.error || data.message || 'Credenciais inválidas')
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectTenant = async (tenantId: string) => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, tenantId, isCRM }),
      })
      const data = await response.json()
      
      if (response.ok && (data.success || data.requires2FA)) {
        if (data.requires2FA) {
          setSelectedTenantId(tenantId)
          setRequires2FA(true)
          setRequiresTenantSelection(false)
          setTwoFAMessage(data.message || 'Código de verificação enviado para seu e-mail')
          setLoading(false)
          return
        }

        completeAuth(data)
      } else {
        setError(data.error || 'Erro na seleção da empresa')
      }
    } catch (err) {
      setError('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectSegment = async (segmentId: string) => {
    // Super Admin seleciona segmento → autentica no tenant Master diretamente
    // Encontrar o tenant Master na lista já disponível
    const masterTenant = tenants.find((t: any) =>
      t.slug === 'all-business-master' ||
      t.name?.toLowerCase().includes('all business') ||
      t.name?.toLowerCase().includes('master')
    ) || tenants[0]

    if (masterTenant) {
      await handleSelectTenant(masterTenant.id)
    } else {
      setError('Tenant Master não encontrado. Contate o suporte.')
    }
  }


  const completeAuth = (data: any) => {
    const token = data.data?.token || data.token
    const user = data.data?.user || data.user

    if (token) {
      localStorage.setItem('admin_auth_token', token)
      localStorage.setItem('admin-auth-token', token)
      localStorage.setItem('admin-user-data', JSON.stringify({
        ...user,
        at: Date.now()
      }))
    }

    try {
      const nome = user?.nome || ''
      const isCorretor = !!user?.creci || !!user?.is_corretor
      localStorage.setItem(
        'admin-last-auth-user',
        JSON.stringify({
          nome,
          userType: isCorretor ? 'corretor' : 'admin',
          at: Date.now()
        })
      )
      window.dispatchEvent(new Event('admin-auth-changed'))
    } catch { }

    if (user?.require_password_change) {
      window.location.href = '/admin/reset-password'
      return
    }

    window.location.href = callbackUrl
  }


  return (
    <div className={`min-h-screen flex items-center justify-center transition-colors duration-1000 py-12 px-4 sm:px-6 lg:px-8 ${isCRM ? 'bg-[#020617]' : 'bg-gradient-to-br from-blue-50 to-indigo-100'
      }`}>
      <div className="max-w-md w-full space-y-8">
        <div className="text-center flex flex-col items-center">
          {isCRM ? (
            // Fundo branco opaco do asset novo (sem transparência) — badge branca
            // arredondada evita caixa branca crua contra o fundo escuro do CRM.
            <div className="h-32 w-32 flex items-center justify-center rounded-full bg-white shadow-[0_0_25px_rgba(59,130,246,0.5)] transition-all duration-700 hover:scale-110">
              <img
                src="/Assets/artemis4_light_b.png"
                alt="Artemis"
                className="h-24 w-24 object-contain"
              />
            </div>
          ) : (
            <div className="mx-auto h-20 w-20 flex items-center justify-center rounded-full bg-white shadow-lg">
              <Image
                src="/Assets/artemis4_light_b.png"
                alt="Artemis4"
                width={128}
                height={128}
                className="h-24 w-24 object-contain"
                priority
              />
            </div>
          )}
          <h2 className={`mt-6 text-center text-4xl font-black italic uppercase tracking-tight ${isCRM ? 'text-white' : 'text-gray-900'}`}>
            {isCRM ? (
              <>
                <span className="text-gray-400">Olhos de</span>{' '}
                <span className="text-blue-600 drop-shadow-sm">Águia</span>
              </>
            ) : (
              'Artemis4'
            )}
          </h2>
          <p className="mt-2 text-center text-[10px] font-black uppercase tracking-[0.3em] ml-1">
            <span className={isCRM ? 'text-blue-400' : 'text-gray-600'}>
              {isCRM ? '' : 'Acesso ao Sistema'}
            </span>
          </p>
        </div>

        <div className={`py-8 px-6 shadow-xl rounded-3xl transition-all duration-700 ${isCRM ? 'bg-white/5 border border-white/10 backdrop-blur-xl' : 'bg-white'
          }`}>
          {!requiresTenantSelection ? (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="username" className={`block text-xs font-black uppercase tracking-widest mb-2 ml-1 ${isCRM ? 'text-gray-400' : 'text-gray-700'}`}>
                    Usuário Master
                  </label>

                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    className={`w-full px-4 py-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 ${isCRM ? 'bg-white/5 border border-white/10 text-white placeholder-gray-600' : 'border border-gray-300 text-gray-900 bg-white shadow-sm'
                      }`}
                    placeholder="Digite seu usuário"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={loading || requires2FA}
                  />
                </div>
                <div>
                  <label htmlFor="password" className={`block text-xs font-black uppercase tracking-widest mb-2 ml-1 ${isCRM ? 'text-gray-400' : 'text-gray-700'}`}>
                    Senha de Acesso
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      className={`w-full px-4 py-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 pr-12 ${isCRM ? 'bg-white/5 border border-white/10 text-white placeholder-gray-600' : 'border border-gray-300 text-gray-900 bg-white shadow-sm'
                        }`}
                      placeholder="Digite sua senha"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading || requires2FA}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={`absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-black/5 transition-colors ${isCRM ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-600'
                        }`}
                    >
                      {showPassword ? (
                        <EyeSlashIcon className="h-5 w-5" />
                      ) : (
                        <EyeIcon className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                {requires2FA && (
                  <div className="animate-in slide-in-from-top-4 duration-300">
                    <label htmlFor="2fa" className="block text-sm font-medium text-gray-700 mb-1 text-center">
                      Código de Verificação 2FA
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      className="w-full px-4 py-3 border-2 border-blue-200 rounded-lg text-center text-2xl font-bold tracking-[0.5em] focus:ring-2 focus:ring-blue-500 text-gray-900"
                      placeholder="000000"
                      value={twoFactorCode}
                      onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                      disabled={loading}
                      autoFocus
                    />
                  </div>
                )}
              </div>

              {error && (
                <div className={`rounded-xl p-3 text-sm text-center font-medium animate-shake border ${isCRM ? 'bg-red-500/20 border-red-500/30 text-red-200' : 'bg-red-50 border-red-200 text-red-800'
                  }`}>
                  {error}
                </div>
              )}

              {twoFAMessage && !error && (
                <div className={`rounded-xl p-3 text-[10px] text-center font-black uppercase tracking-widest border animate-pulse ${isCRM ? 'bg-blue-500/20 border-blue-500/30 text-blue-200' : 'bg-blue-50 border-blue-200 text-blue-800'
                  }`}>
                  {twoFAMessage}
                </div>
              )}


              <button
                type="submit"
                disabled={loading}
                className={`w-full flex justify-center py-4 px-4 border border-transparent text-sm font-black rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all shadow-lg uppercase tracking-widest ${isCRM
                  ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.4)]'
                  : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
                  }`}
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  requires2FA ? 'Confirmar Acesso' : 'Entrar no Sistema'
                )}
              </button>
            </form>
          ) : (
            <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-6 py-2">
              <div className="text-center">
                <p className={`font-black uppercase tracking-[0.2em] text-[10px] ${isCRM ? 'text-blue-400' : 'text-gray-500'}`}>
                  Selecione o Contexto de Negócio
                </p>
                <h3 className={`text-lg font-black mt-1 ${isCRM ? 'text-white' : 'text-gray-900'}`}>Gestão de Unidade</h3>
              </div>

              <div className="grid grid-cols-1 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {tenants.map((tenant) => (
                  <button
                    key={tenant.id}
                    onClick={() => handleSelectTenant(tenant.id)}
                    className={`w-full p-5 flex items-center justify-between rounded-[1.5rem] border-2 transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] group text-left ${isCRM
                      ? 'bg-white/5 border-white/10 hover:bg-white/10'
                      : 'bg-white border-gray-100'
                      }`}
                    style={{
                      borderColor: !isCRM && tenant.segment_color ? `${tenant.segment_color}20` : undefined,
                      borderLeftWidth: '6px',
                      borderLeftColor: tenant.segment_color || '#2563eb'
                    }}
                  >
                    <div className="flex items-center space-x-4">
                      {tenant.logo ? (
                        <div className="flex-shrink-0 h-12 w-12 rounded-xl border border-gray-100/50 bg-white shadow-sm flex items-center justify-center p-1.5 overflow-hidden">
                          <img
                            src={tenant.logo}
                            alt={tenant.name}
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                      ) : (
                        <div
                          className="flex-shrink-0 h-12 w-12 rounded-xl shadow-inner flex items-center justify-center text-white font-black text-lg p-1.5"
                          style={{ backgroundColor: tenant.segment_color || '#2563eb' }}
                        >
                          {tenant.name?.charAt(0).toUpperCase()}
                        </div>
                      )}

                      <div className="flex flex-col">
                        <span className={`font-black uppercase text-xs tracking-tight leading-none mb-1.5 ${isCRM ? 'text-white' : 'text-gray-900'}`}>
                          {tenant.name}
                        </span>
                        <div className="flex items-center">
                          <span className="text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-400 border border-gray-200">
                            {tenant.segment_name || 'Geral'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div
                      className="h-8 w-8 rounded-lg flex items-center justify-center text-white transition-all shadow-lg"
                      style={{ backgroundColor: tenant.segment_color || '#2563eb' }}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>

              <button
                onClick={() => setRequiresTenantSelection(false)}
                className="w-full text-center text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors pt-2"
              >
                Voltar ao Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-blue-50" />}>
      <LoginContent />
    </Suspense>
  )
}