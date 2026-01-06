'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { formatCPF, validateCPF } from '@/lib/utils/formatters'

export default function CadastroCorretorPublicoPage() {
  const router = useRouter()
  const [isEditMode, setIsEditMode] = useState(false)
  const originalEmailRef = useRef<string>('')
  const originalCpfRef = useRef<string>('')
  const originalFotoDataUrlRef = useRef<string | null>(null)
  const originalUsernameRef = useRef<string>('')
  const originalCreciRef = useRef<string>('')
  const originalTelefoneRef = useRef<string>('')
  const originalNomeRef = useRef<string>('')
  const userIdRef = useRef<string | null>(null)

  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [emailChecking, setEmailChecking] = useState(false)
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null)
  const [cpfChecking, setCpfChecking] = useState(false)
  const [cpfAvailable, setCpfAvailable] = useState<boolean | null>(null)
  const [emailPendingValidation, setEmailPendingValidation] = useState(false)
  const [cpfPendingValidation, setCpfPendingValidation] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [cpfError, setCpfError] = useState<string | null>(null)
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null)

  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    nome: '',
    telefone: '',
    cpf: '',
    creci: ''
  })

  const [foto, setFoto] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)

  const emailInputRef = useRef<HTMLInputElement | null>(null)
  const cpfInputRef = useRef<HTMLInputElement | null>(null)
  const confirmPasswordInputRef = useRef<HTMLInputElement | null>(null)
  const lastValidatedEmailRef = useRef<string>('')
  const lastValidatedCpfRef = useRef<string>('')
  const cpfAbortRef = useRef<AbortController | null>(null)
  const cpfExistsCacheRef = useRef<Map<string, boolean>>(new Map())
  const emailDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cpfDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fotoInputId = 'broker-foto-input-public'
  const SUPPRESS_GEOLOCATION_MODAL_KEY = 'suppress-geolocation-modal-once'

  // Detectar modo edição via query param
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const edit = (params.get('edit') || '').toLowerCase() === 'true'
      setIsEditMode(edit)
    } catch {
      setIsEditMode(false)
    }
  }, [])

  // Carregar dados do corretor logado quando em modo edição
  useEffect(() => {
    if (!isEditMode) return
    let cancelled = false

    const applyUser = (u: any) => {
      const id = String(u?.id || u?.uuid || '')
      if (!id) throw new Error('Não foi possível identificar seu usuário. Faça login novamente.')
      userIdRef.current = id

      const username = String(u?.username || '').trim()
      const email = String(u?.email || '').trim()
      const nome = String(u?.nome || '').trim()
      const telefone = String(u?.telefone || '').trim()
      const cpf = String(u?.cpf || '').trim()
      const creci = String(u?.creci || '').trim()

      originalUsernameRef.current = username
      originalEmailRef.current = email.toLowerCase()
      originalNomeRef.current = nome
      originalTelefoneRef.current = telefone
      originalCpfRef.current = String(cpf || '').replace(/\D/g, '')
      originalCreciRef.current = creci

      const fotoBase64 = (u?.foto as string | null | undefined) || null
      const fotoMime = (u?.foto_tipo_mime as string | null | undefined) || 'image/jpeg'
      const fotoDataUrl = fotoBase64 ? `data:${fotoMime};base64,${fotoBase64}` : null
      originalFotoDataUrlRef.current = fotoDataUrl
      setFotoPreview(fotoDataUrl)

      setForm({
        username,
        email,
        password: '',
        confirmPassword: '',
        nome,
        telefone,
        cpf: cpf ? formatCPF(cpf) : '',
        creci
      })

      setEmailAvailable(true)
      setCpfAvailable(true)
      setEmailPendingValidation(false)
      setCpfPendingValidation(false)
    }

    ;(async () => {
      try {
        const token = localStorage.getItem('auth-token')
        const raw = localStorage.getItem('user-data')

        if (!token) {
          setError('Para editar seu cadastro, faça login como corretor.')
          return
        }

        // 1) Preferir user-data local se estiver válido
        if (raw) {
          try {
            const parsed = JSON.parse(raw)
            applyUser(parsed)
            if (!cancelled) setError(null)
            return
          } catch {
            // cai para o fallback abaixo
          }
        }

        // 2) Fallback robusto: buscar via /api/admin/auth/me usando o token atual
        const resp = await fetch('/api/admin/auth/me', {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store'
        })
        const data = await resp.json().catch(() => null)
        if (!resp.ok || !data?.success || !data?.user) {
          throw new Error(data?.error || 'Para editar seu cadastro, faça login como corretor.')
        }

        // Persistir para os próximos fluxos
        try {
          localStorage.setItem('user-data', JSON.stringify(data.user))
        } catch {}

        applyUser(data.user)
        if (!cancelled) setError(null)
      } catch (e: any) {
        if (cancelled) return
        const msg = e?.message || 'Erro ao carregar dados do corretor. Faça login novamente.'
        setError(msg)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isEditMode])

  const getInitials = (nome?: string) => {
    const n = String(nome || '').trim()
    if (!n) return '??'
    const parts = n.split(/\s+/).filter(Boolean)
    const a = parts[0]?.[0] || ''
    const b = (parts.length > 1 ? parts[1]?.[0] : parts[0]?.[1]) || ''
    return (a + b).toUpperCase()
  }

  const handleVoltar = () => {
    try {
      sessionStorage.setItem(SUPPRESS_GEOLOCATION_MODAL_KEY, 'true')
    } catch {}
    // Se estiver editando, voltar para o painel/modal do corretor
    if (isEditMode) {
      router.push('/landpaging?corretor_home=true')
      return
    }
    router.push('/landpaging?corretor_popup=true')
  }

  const onChange = (key: keyof typeof form, value: string) => {
    if (key === 'email') {
      const emailNow = String(value || '').trim().toLowerCase()
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNow) && emailNow !== lastValidatedEmailRef.current) {
        setEmailPendingValidation(true)
      }
    }
    if (key === 'cpf') {
      const cpfDigits = String(value || '').replace(/\D/g, '')
      if (cpfDigits.length === 11 && validateCPF(cpfDigits) && cpfDigits !== lastValidatedCpfRef.current) {
        setCpfPendingValidation(true)
      }
    }
    setForm((p) => ({ ...p, [key]: value }))
  }

  const validate = () => {
    const errs: string[] = []
    if (!form.username.trim() || form.username.trim().length < 3) errs.push('Username deve ter pelo menos 3 caracteres')
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errs.push('Email inválido')
    if (!isEditMode) {
      if (emailAvailable === false) errs.push('Este e-mail já está cadastrado para outro usuário')
      if (emailPendingValidation || emailChecking) errs.push('Aguarde a validação do e-mail')
    } else {
      const emailNow = form.email.trim().toLowerCase()
      if (emailNow !== originalEmailRef.current) {
        if (emailAvailable === false) errs.push('Este e-mail já está cadastrado para outro usuário')
        if (emailPendingValidation || emailChecking) errs.push('Aguarde a validação do e-mail')
      }
    }
    if (!form.nome.trim()) errs.push('Nome é obrigatório')
    if (!form.telefone.trim()) errs.push('Telefone é obrigatório')
    if (form.telefone.trim() && !/^\(\d{2}\)\s\d{9}$/.test(form.telefone.trim())) errs.push('Telefone deve estar no formato (99) 999999999')
    if (!form.cpf.trim()) errs.push('CPF é obrigatório')
    if (form.cpf.trim() && !validateCPF(form.cpf)) errs.push('CPF inválido')
    if (!isEditMode) {
      if (cpfAvailable === false) errs.push('Este CPF já está cadastrado para outro usuário')
      if (cpfPendingValidation || cpfChecking) errs.push('Aguarde a validação do CPF')
    } else {
      const cpfDigits = form.cpf.replace(/\D/g, '')
      if (cpfDigits && cpfDigits !== originalCpfRef.current) {
        if (cpfAvailable === false) errs.push('Este CPF já está cadastrado para outro usuário')
        if (cpfPendingValidation || cpfChecking) errs.push('Aguarde a validação do CPF')
      }
    }
    if (!form.creci.trim()) errs.push('CRECI é obrigatório')
    if (!isEditMode) {
      if (!form.password || form.password.length < 8) errs.push('Senha deve ter pelo menos 8 caracteres')
      if (!form.confirmPassword) errs.push('Confirmar senha é obrigatório')
      if (form.password !== form.confirmPassword) errs.push('Senhas não coincidem')
    } else {
      // Senha opcional na edição: se informar, tem que validar.
      if (form.password) {
        if (form.password.length < 8) errs.push('Senha deve ter pelo menos 8 caracteres')
        if (!form.confirmPassword) errs.push('Confirmar senha é obrigatório')
        if (form.password !== form.confirmPassword) errs.push('Senhas não coincidem')
      }
    }
    if (!isEditMode) {
      if (!foto) errs.push('Foto é obrigatória')
    } else {
      // Na edição: foto é opcional, mas se não houver foto existente, exigir upload.
      const hasExisting = !!originalFotoDataUrlRef.current
      if (!hasExisting && !foto) errs.push('Foto é obrigatória')
    }
    return errs
  }

  const validateCpfForBlur = (): string | null => {
    const cpfDigits = form.cpf.replace(/\D/g, '')
    if (!cpfDigits) return 'CPF é obrigatório'
    if (cpfDigits.length < 11) return 'CPF incompleto'
    if (!validateCPF(cpfDigits)) return 'CPF inválido'
    if (cpfPendingValidation || cpfChecking) return 'Verificando CPF...'
    if (cpfAvailable === false) return 'Este CPF já está cadastrado'
    return null
  }

  const validateEmailForBlur = (): string | null => {
    const email = form.email.trim()
    if (!email) return 'Email é obrigatório'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Email inválido'
    if (emailPendingValidation || emailChecking) return 'Verificando e-mail...'
    if (emailAvailable === false) return 'Este e-mail já está cadastrado'
    return null
  }

  useEffect(() => {
    if (!form.confirmPassword) {
      setConfirmPasswordError(null)
      return
    }
    if (form.password !== form.confirmPassword) setConfirmPasswordError('Senhas não coincidem')
    else setConfirmPasswordError(null)
  }, [form.password, form.confirmPassword])

  useEffect(() => {
    const email = form.email.trim().toLowerCase()
    setEmailAvailable(null)
    setEmailChecking(false)
    setEmailError(null)

    if (emailDebounceRef.current) {
      clearTimeout(emailDebounceRef.current)
      emailDebounceRef.current = null
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailPendingValidation(false)
      return
    }

    if (isEditMode && email === originalEmailRef.current) {
      setEmailAvailable(true)
      setEmailPendingValidation(false)
      return
    }

    if (email === lastValidatedEmailRef.current) {
      setEmailPendingValidation(false)
      return
    }

    setEmailPendingValidation(true)
    emailDebounceRef.current = setTimeout(async () => {
      setEmailChecking(true)
      try {
        const res = await fetch(`/api/public/users/check-email?email=${encodeURIComponent(email)}`, { method: 'GET', cache: 'no-store' })
        const data = await res.json().catch(() => null)
        if (res.ok && data?.success) {
          const available = Boolean(data.available)
          setEmailAvailable(available)
          lastValidatedEmailRef.current = email
        }
      } catch {
        setEmailAvailable(null)
      } finally {
        setEmailChecking(false)
        setEmailPendingValidation(false)
      }
    }, 350)

    return () => {
      if (emailDebounceRef.current) clearTimeout(emailDebounceRef.current)
      emailDebounceRef.current = null
    }
  }, [form.email, isEditMode])

  useEffect(() => {
    const cpfDigits = form.cpf.replace(/\D/g, '')
    setCpfAvailable(null)
    setCpfChecking(false)
    setCpfError(null)

    if (cpfDebounceRef.current) {
      clearTimeout(cpfDebounceRef.current)
      cpfDebounceRef.current = null
    }

    if (!cpfDigits || !validateCPF(cpfDigits)) {
      setCpfPendingValidation(false)
      return
    }

    if (isEditMode && cpfDigits === originalCpfRef.current) {
      setCpfAvailable(true)
      setCpfPendingValidation(false)
      return
    }

    const cached = cpfExistsCacheRef.current.get(cpfDigits)
    if (cached !== undefined) {
      setCpfAvailable(!cached)
      setCpfChecking(false)
      setCpfPendingValidation(false)
      lastValidatedCpfRef.current = cpfDigits
      return
    }

    if (cpfAbortRef.current) cpfAbortRef.current.abort()
    const controller = new AbortController()
    cpfAbortRef.current = controller

    setCpfPendingValidation(true)
    cpfDebounceRef.current = setTimeout(async () => {
      setCpfChecking(true)
      try {
        const res = await fetch(`/api/public/users/check-cpf?cpf=${encodeURIComponent(cpfDigits)}`, {
          method: 'GET',
          cache: 'no-store',
          signal: controller.signal
        })
        const data = await res.json().catch(() => null)
        if (res.ok && data?.success) {
          const available = Boolean(data.available)
          setCpfAvailable(available)
          cpfExistsCacheRef.current.set(cpfDigits, !available)
          lastValidatedCpfRef.current = cpfDigits
        }
      } catch (e: any) {
        if (e?.name !== 'AbortError') setCpfAvailable(null)
      } finally {
        setCpfChecking(false)
        setCpfPendingValidation(false)
      }
    }, 200)

    return () => {
      if (cpfDebounceRef.current) clearTimeout(cpfDebounceRef.current)
      cpfDebounceRef.current = null
    }
  }, [form.cpf, isEditMode])

  const formatTelefone = (value: string): string => {
    const digits = value.replace(/\D/g, '').slice(0, 11)
    if (digits.length <= 2) return digits
    const ddd = digits.slice(0, 2)
    const rest = digits.slice(2)
    return `(${ddd}) ${rest}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const errs = validate()
    if (errs.length > 0) {
      setError(errs.join('\n'))
      return
    }

    setLoading(true)
    try {
      const fd = new FormData()
      if (!isEditMode) {
        fd.set('username', form.username.trim())
        fd.set('email', form.email.trim())
        fd.set('nome', form.nome.trim())
        fd.set('telefone', form.telefone.trim())
        fd.set('password', form.password)
        fd.set('cpf', form.cpf.replace(/\D/g, ''))
        fd.set('creci', form.creci.trim())
        if (foto) fd.set('foto', foto)

        const res = await fetch('/api/public/corretor/register', { method: 'POST', body: fd })
        const data = await res.json().catch(() => null)
        if (!res.ok || !data?.success) {
          const msg = data?.error || `Erro HTTP ${res.status}`
          const details = Array.isArray(data?.details) ? data.details.join('\n') : null
          throw new Error(details ? `${msg}\n${details}` : msg)
        }

        setDone(true)
      } else {
        const token = localStorage.getItem('auth-token')
        const userId = userIdRef.current
        if (!token || !userId) {
          throw new Error('Para editar seu cadastro, faça login como corretor.')
        }

        fd.set('username', form.username.trim())
        fd.set('email', form.email.trim())
        fd.set('nome', form.nome.trim())
        fd.set('telefone', form.telefone.trim())
        fd.set('cpf', form.cpf.replace(/\D/g, ''))
        fd.set('creci', form.creci.trim())
        if (form.password) fd.set('password', form.password)
        if (foto) fd.set('foto', foto)

        const res = await fetch(`/api/admin/usuarios/${encodeURIComponent(userId)}`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` },
          body: fd
        })

        const data = await res.json().catch(() => null)
        if (!res.ok || !data?.success) {
          const msg = data?.error || `Erro HTTP ${res.status}`
          const details = Array.isArray(data?.details) ? data.details.join('\n') : null
          throw new Error(details ? `${msg}\n${details}` : msg)
        }

        // Atualizar user-data/local + sessionStorage do modal do corretor
        try {
          const storedUserData = localStorage.getItem('user-data')
          const current = storedUserData ? JSON.parse(storedUserData) : {}
          const newFotoBase64 = data?.user?.foto
          const newFotoMime = data?.user?.foto_tipo_mime || current?.foto_tipo_mime || 'image/jpeg'
          const merged = {
            ...current,
            username: form.username.trim(),
            email: form.email.trim(),
            nome: form.nome.trim(),
            telefone: form.telefone.trim(),
            cpf: form.cpf.replace(/\D/g, ''),
            creci: form.creci.trim(),
            ...(newFotoBase64 ? { foto: newFotoBase64, foto_tipo_mime: newFotoMime } : {})
          }
          localStorage.setItem('user-data', JSON.stringify(merged))

          const fotoDataUrl = newFotoBase64 ? `data:${newFotoMime};base64,${newFotoBase64}` : (originalFotoDataUrlRef.current || null)
          try {
            const raw = sessionStorage.getItem('corretor_success_user')
            const currentModal = raw ? JSON.parse(raw) : {}
            sessionStorage.setItem(
              'corretor_success_user',
              JSON.stringify({
                ...currentModal,
                id: String(userId),
                nome: form.nome.trim(),
                email: form.email.trim(),
                telefone: form.telefone.trim(),
                cpf: form.cpf,
                creci: form.creci.trim(),
                fotoDataUrl: fotoDataUrl || undefined
              })
            )
          } catch {}
        } catch {}

        setDone(true)
      }
    } catch (err: any) {
      setError(err?.message || 'Erro ao cadastrar corretor')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!done) return
    const t = setTimeout(() => {
      try {
        sessionStorage.setItem(SUPPRESS_GEOLOCATION_MODAL_KEY, 'true')
      } catch {}
      window.location.href = isEditMode ? '/landpaging?corretor_home=true' : '/landpaging?open_corretor_login=true'
    }, 1800)
    return () => clearTimeout(t)
  }, [done, isEditMode])

  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
          <h1 className="text-2xl font-extrabold text-gray-900">{isEditMode ? 'Cadastro atualizado' : 'Cadastro enviado'}</h1>
          <p className="mt-2 text-gray-600">
            {isEditMode
              ? 'Seus dados foram atualizados. Você será redirecionado para o seu painel.'
              : 'Seu usuário de corretor foi criado. Você será direcionado para entrar na plataforma.'}
          </p>
          <a
            href={isEditMode ? '/landpaging?corretor_home=true' : '/landpaging?open_corretor_login=true'}
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
            onClick={() => {
              try {
                sessionStorage.setItem(SUPPRESS_GEOLOCATION_MODAL_KEY, 'true')
              } catch {}
            }}
          >
            {isEditMode ? 'Voltar ao painel' : 'Entrar agora'}
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <button
              onClick={handleVoltar}
              className="inline-flex items-center px-4 py-2 bg-white border-2 border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Voltar
            </button>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900">{isEditMode ? 'Editar cadastro de Corretor' : 'Cadastro de Corretor'}</h1>
          <p className="mt-2 text-gray-600">
            {isEditMode ? (
              <>
                Atualize seus dados. O <strong>CRECI</strong> será validado por nossa equipe.
              </>
            ) : (
              <>
                Preencha seus dados. O <strong>CRECI</strong> será validado por nossa equipe.
              </>
            )}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200/70 ring-1 ring-black/5 p-6 sm:p-8">
          {error && (
            <pre className="whitespace-pre-wrap rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 mb-4">
              {error}
            </pre>
          )}

          <input className="hidden" autoComplete="username" name="fake-username" />
          <input className="hidden" type="password" autoComplete="current-password" name="fake-password" />

          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            {/* Cabeçalho com foto (especialmente importante no modo edição) */}
            <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="relative">
                {fotoPreview ? (
                  <img
                    src={fotoPreview}
                    alt="Foto do corretor"
                    className="h-16 w-16 rounded-full object-cover border-2 border-white shadow"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-blue-600 text-white flex items-center justify-center font-black shadow">
                    {getInitials(form.nome)}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-extrabold text-gray-900 truncate">
                  {form.nome || 'Seu perfil'}
                </div>
                <div className="text-xs text-gray-600 truncate">{form.email || '—'}</div>
                <div className="text-[11px] text-gray-500 mt-1">
                  {isEditMode ? 'Atualize seus dados e salve as alterações.' : 'Complete seu cadastro para começar.'}
                </div>
              </div>
              <label
                htmlFor={fotoInputId}
                className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-bold text-gray-800 hover:bg-gray-50 cursor-pointer whitespace-nowrap"
              >
                {isEditMode ? 'Trocar foto' : 'Enviar foto'}
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">Usuário (username) *</label>
                <input
                  name="broker_username"
                  autoComplete="off"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-300"
                  value={form.username}
                  onChange={(e) => onChange('username', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">Email *</label>
                <input
                  name="broker_email"
                  autoComplete="off"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-300"
                  value={form.email}
                  onChange={(e) => onChange('email', e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Tab') {
                      const msg = validateEmailForBlur()
                      setEmailError(msg)
                      if (msg || emailPendingValidation || emailChecking) {
                        e.preventDefault()
                        setTimeout(() => emailInputRef.current?.focus(), 0)
                      }
                    }
                  }}
                  onBlur={() => {
                    const msg = validateEmailForBlur()
                    setEmailError(msg)
                    if (msg || emailPendingValidation || emailChecking) setTimeout(() => emailInputRef.current?.focus(), 0)
                  }}
                  ref={emailInputRef}
                />
                {emailError && <p className="mt-1 text-sm text-red-600">{emailError}</p>}
                {!emailChecking && !emailPendingValidation && emailAvailable === false && <p className="mt-1 text-sm text-red-600">Este e-mail já está cadastrado</p>}
                {(emailChecking || emailPendingValidation) && <p className="mt-1 text-xs text-gray-500">Verificando e-mail...</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">Nome *</label>
                <input
                  name="broker_nome"
                  autoComplete="off"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-300"
                  value={form.nome}
                  onChange={(e) => onChange('nome', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">Telefone *</label>
                <input
                  name="broker_telefone"
                  autoComplete="off"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-300"
                  value={form.telefone}
                  onChange={(e) => onChange('telefone', formatTelefone(e.target.value))}
                  placeholder="(99) 999999999"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">CPF *</label>
                <input
                  name="broker_cpf"
                  autoComplete="off"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-300"
                  value={form.cpf}
                  onChange={(e) => onChange('cpf', formatCPF(e.target.value))}
                  onKeyDown={(e) => {
                    if (e.key === 'Tab') {
                      const msg = validateCpfForBlur()
                      setCpfError(msg)
                      if (msg || cpfPendingValidation || cpfChecking) {
                        e.preventDefault()
                        setTimeout(() => cpfInputRef.current?.focus(), 0)
                      }
                    }
                  }}
                  onBlur={() => {
                    const msg = validateCpfForBlur()
                    setCpfError(msg)
                    if (msg || cpfPendingValidation || cpfChecking) setTimeout(() => cpfInputRef.current?.focus(), 0)
                  }}
                  placeholder="000.000.000-00"
                  ref={cpfInputRef}
                />
                {cpfError && <p className="mt-1 text-sm text-red-600">{cpfError}</p>}
                {!cpfChecking && !cpfPendingValidation && cpfAvailable === false && <p className="mt-1 text-sm text-red-600">Este CPF já está cadastrado</p>}
                {(cpfChecking || cpfPendingValidation) && <p className="mt-1 text-xs text-gray-500">Verificando CPF...</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">CRECI *</label>
                <input
                  name="broker_creci"
                  autoComplete="off"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-300"
                  value={form.creci}
                  onChange={(e) => onChange('creci', e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                {isEditMode ? 'Foto (opcional)' : 'Foto *'}
              </label>
              <div className="rounded-xl border border-gray-200 bg-white p-3">
                <input
                  id={fotoInputId}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null
                    setFoto(file)
                    if (file) {
                      const reader = new FileReader()
                      reader.onloadend = () => setFotoPreview(reader.result as string)
                      reader.readAsDataURL(file)
                    }
                  }}
                />
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor={fotoInputId}
                    className="inline-flex w-fit items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 cursor-pointer"
                  >
                    Escolher foto
                  </label>
                  <div className="min-w-0">
                    <div className="text-xs text-gray-500">JPG/PNG/WEBP • até 2MB</div>
                    <div className="text-sm font-medium text-gray-800 truncate">
                      {foto ? foto.name : fotoPreview ? 'Foto atual carregada' : 'Nenhum arquivo selecionado'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">
                  {isEditMode ? 'Senha (opcional)' : 'Senha *'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="broker_password"
                    autoComplete="new-password"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 pr-12 outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-300"
                    value={form.password}
                    onChange={(e) => onChange('password', e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center justify-center w-12 text-gray-500 hover:text-gray-700"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">
                  {isEditMode ? 'Confirmar senha (opcional)' : 'Confirmar senha *'}
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="broker_password_confirm"
                    autoComplete="new-password"
                    className={`w-full rounded-xl border px-4 py-3 pr-12 outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-300 ${
                      confirmPasswordError ? 'border-red-300 bg-red-50' : 'border-gray-200'
                    }`}
                    value={form.confirmPassword}
                    onChange={(e) => onChange('confirmPassword', e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Tab') {
                        const invalid = !form.confirmPassword || form.password !== form.confirmPassword
                        if (invalid) {
                          e.preventDefault()
                          setConfirmPasswordError(!form.confirmPassword ? 'Confirmar senha é obrigatório' : 'Senhas não coincidem')
                          setTimeout(() => confirmPasswordInputRef.current?.focus(), 0)
                        }
                      }
                    }}
                    onBlur={() => {
                      const invalid = !form.confirmPassword || form.password !== form.confirmPassword
                      if (invalid) {
                        setConfirmPasswordError(!form.confirmPassword ? 'Confirmar senha é obrigatório' : 'Senhas não coincidem')
                        setTimeout(() => confirmPasswordInputRef.current?.focus(), 0)
                      }
                    }}
                    ref={confirmPasswordInputRef}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center justify-center w-12 text-gray-500 hover:text-gray-700"
                    aria-label={showConfirmPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showConfirmPassword ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                  </button>
                </div>
                {confirmPasswordError && <p className="mt-1 text-sm text-red-600">{confirmPasswordError}</p>}
              </div>
            </div>

            <button
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 text-white font-semibold py-3 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (isEditMode ? 'Salvando...' : 'Enviando...') : (isEditMode ? 'Salvar alterações' : 'Criar conta de corretor')}
            </button>

            <div className="text-center text-xs text-gray-500 pt-1">
              {isEditMode ? (
                <>Dica: após salvar, você volta automaticamente para o seu painel.</>
              ) : (
                <>
                  Já tem conta? Volte e clique em <strong>“entrar na plataforma”</strong>.
                </>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}


