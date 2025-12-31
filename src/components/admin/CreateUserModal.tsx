'use client'

import { useState, useEffect, useRef } from 'react'
import { useApi } from '@/hooks/useApi'
// import { XMarkIcon } from '@heroicons/react/24/outline'
import { formatCPF, validateCPF } from '@/lib/utils/formatters'

interface UserRole {
  id: number
  name: string
  description: string
  level: number
}

interface CreateUserModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  roles: UserRole[]
}

interface CreateUserForm {
  username: string
  email: string
  password: string
  confirmPassword: string
  nome: string
  telefone: string
  cpf: string
  roleId: number | null
  ativo: boolean
  isencao: boolean
  is_plantonista: boolean
}

export default function CreateUserModal({ isOpen, onClose, onSuccess, roles }: CreateUserModalProps) {
  const { post } = useApi()
  const emailInputRef = useRef<HTMLInputElement | null>(null)
  const cpfInputRef = useRef<HTMLInputElement | null>(null)
  const [form, setForm] = useState<CreateUserForm>({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    nome: '',
    telefone: '',
    cpf: '',
    roleId: null,
    ativo: true,
    isencao: false,
    is_plantonista: false
  })
  
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof CreateUserForm, string>>>({})
  const [emailChecking, setEmailChecking] = useState(false)
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null)
  const [cpfChecking, setCpfChecking] = useState(false)
  const [cpfAvailable, setCpfAvailable] = useState<boolean | null>(null)
  const [emailPendingValidation, setEmailPendingValidation] = useState(false)
  const [cpfPendingValidation, setCpfPendingValidation] = useState(false)

  const lastValidatedEmailRef = useRef<string>('')
  const lastValidatedCpfRef = useRef<string>('')
  const cpfAbortRef = useRef<AbortController | null>(null)
  const cpfExistsCacheRef = useRef<Map<string, boolean>>(new Map())
  const emailDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cpfDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Limpar formulário sempre que o modal abrir
  useEffect(() => {
    if (isOpen) {
      setForm({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        nome: '',
        telefone: '',
        cpf: '',
        roleId: null,
        ativo: true,
        isencao: false,
        is_plantonista: false
      })
      setErrors({})
      setEmailChecking(false)
      setEmailAvailable(null)
      setCpfChecking(false)
      setCpfAvailable(null)
      setEmailPendingValidation(false)
      setCpfPendingValidation(false)
      lastValidatedEmailRef.current = ''
      lastValidatedCpfRef.current = ''
      cpfExistsCacheRef.current.clear()
    }
  }, [isOpen])

  // Validação online de e-mail (disponibilidade)
  useEffect(() => {
    const email = form.email.trim().toLowerCase()
    setEmailAvailable(null)
    setEmailChecking(false)
    
    if (emailDebounceRef.current) {
      clearTimeout(emailDebounceRef.current)
      emailDebounceRef.current = null
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailPendingValidation(false)
      return
    }

    // Cache: se já checamos esse e-mail nesta sessão do modal
    if (email === lastValidatedEmailRef.current) {
      setEmailPendingValidation(false)
      return
    }

    // bloquear saída do campo enquanto valida online
    setEmailPendingValidation(true)
    emailDebounceRef.current = setTimeout(async () => {
      setEmailChecking(true)
      try {
        const res = await fetch(`/api/public/users/check-email?email=${encodeURIComponent(email)}`, {
          method: 'GET',
          cache: 'no-store'
        })
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
    }, 400)

    return () => {
      if (emailDebounceRef.current) clearTimeout(emailDebounceRef.current)
      emailDebounceRef.current = null
    }
  }, [form.email])

  // Validação online de CPF (disponibilidade)
  useEffect(() => {
    const cpfDigits = form.cpf.replace(/\D/g, '')
    setCpfAvailable(null)
    setCpfChecking(false)

    if (cpfDebounceRef.current) {
      clearTimeout(cpfDebounceRef.current)
      cpfDebounceRef.current = null
    }

    if (!cpfDigits || !validateCPF(cpfDigits)) {
      setCpfPendingValidation(false)
      return
    }

    // Cache: se já checamos esse CPF nesta sessão do modal
    const cached = cpfExistsCacheRef.current.get(cpfDigits)
    if (cached !== undefined) {
      setCpfAvailable(!cached) // available = !exists
      setCpfChecking(false)
      setCpfPendingValidation(false)
      lastValidatedCpfRef.current = cpfDigits
      return
    }

    // Cancelar checagem anterior
    if (cpfAbortRef.current) {
      cpfAbortRef.current.abort()
    }
    const controller = new AbortController()
    cpfAbortRef.current = controller

    // bloquear saída do campo enquanto valida online
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
      } catch (error: any) {
        if (error?.name !== 'AbortError') {
          console.error('Erro ao verificar CPF:', error)
        }
      } finally {
        setCpfChecking(false)
        setCpfPendingValidation(false)
      }
    }, 200)

    return () => {
      if (cpfDebounceRef.current) clearTimeout(cpfDebounceRef.current)
      cpfDebounceRef.current = null
    }
  }, [form.cpf])

  // Validação online (UX): senhas precisam ser iguais enquanto o usuário digita
  useEffect(() => {
    // Só mostrar mismatch depois que o usuário começou a preencher a confirmação
    if (!form.confirmPassword) {
      if (errors.confirmPassword === 'Senhas não coincidem') {
        setErrors(prev => ({ ...prev, confirmPassword: undefined }))
      }
      return
    }

    if (form.password !== form.confirmPassword) {
      if (errors.confirmPassword !== 'Senhas não coincidem') {
        setErrors(prev => ({ ...prev, confirmPassword: 'Senhas não coincidem' }))
      }
    } else {
      if (errors.confirmPassword === 'Senhas não coincidem') {
        setErrors(prev => ({ ...prev, confirmPassword: undefined }))
      }
    }
  }, [form.password, form.confirmPassword])

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof CreateUserForm, string>> = {}

    if (!form.username.trim()) {
      newErrors.username = 'Username é obrigatório'
    } else if (form.username.length < 3) {
      newErrors.username = 'Username deve ter pelo menos 3 caracteres'
    }

    if (!form.email.trim()) {
      newErrors.email = 'Email é obrigatório'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Email inválido'
    } else if (emailAvailable === false) {
      newErrors.email = 'Este e-mail já está cadastrado para outro usuário'
    } else if (emailPendingValidation || emailChecking) {
      newErrors.email = 'Aguarde a validação do e-mail'
    }

    if (!form.cpf.trim()) {
      newErrors.cpf = 'CPF é obrigatório'
    } else if (!validateCPF(form.cpf)) {
      newErrors.cpf = 'CPF inválido'
    } else if (cpfAvailable === false) {
      newErrors.cpf = 'Este CPF já está cadastrado para outro usuário'
    } else if (cpfPendingValidation || cpfChecking) {
      newErrors.cpf = 'Aguarde a validação do CPF'
    }

    if (!form.password) {
      newErrors.password = 'Senha é obrigatória'
    } else if (form.password.length < 8) {
      newErrors.password = 'Senha deve ter pelo menos 8 caracteres'
    }

    if (!form.confirmPassword) {
      newErrors.confirmPassword = 'Confirmar senha é obrigatório'
    } else if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = 'Senhas não coincidem'
    }

    if (!form.nome.trim()) {
      newErrors.nome = 'Nome é obrigatório'
    }

    if (!form.telefone.trim()) {
      newErrors.telefone = 'Telefone é obrigatório'
    } else {
      const telefone = form.telefone.trim()
      // Aceitar formatos: (81) 99999-9999, (81) 999999999, (81) 9999-9999
      const telefoneRegex = /^\(\d{2}\) \d{4,5}-?\d{4}$/
      if (!telefoneRegex.test(telefone)) {
        newErrors.telefone = 'Telefone deve estar no formato (81) 99999-9999 ou (81) 9999-9999'
      }
    }

    if (!form.roleId) {
      newErrors.roleId = 'Perfil é obrigatório'
    }

    console.log('🔍 Validação do formulário:', { form, errors: newErrors })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)
    
    try {
      const requestData = {
        username: form.username,
        email: form.email,
        password: form.password,
        nome: form.nome,
        telefone: form.telefone,
        cpf: form.cpf.replace(/\D/g, ''),
        roleId: form.roleId,
        ativo: form.ativo,
        isencao: form.isencao,
        is_plantonista: form.is_plantonista
      }
      
      console.log('📤 Dados sendo enviados para a API:', requestData)
      
      const response = await post('/api/admin/usuarios', requestData)

      if (response.ok) {
        const data = await response.json()
        console.log('Usuário criado:', data)
        
        // Limpar formulário
        setForm({
          username: '',
          email: '',
          password: '',
          confirmPassword: '',
          nome: '',
          telefone: '',
          cpf: '',
          roleId: null,
          ativo: true,
          isencao: false
          ,
          is_plantonista: false
        })

        onSuccess()
        onClose()
      } else {
        const errorData = await response.json()
        console.error('Erro ao criar usuário:', errorData)
        
        let errorMessage = `Erro ao criar usuário: ${errorData.error || 'Erro desconhecido'}`
        
        // Mostrar detalhes de validação se disponíveis
        if (errorData.details && Array.isArray(errorData.details)) {
          errorMessage += '\n\nDetalhes:\n' + errorData.details.join('\n')
        }
        
        alert(errorMessage)
      }
    } catch (error) {
      console.error('Erro ao criar usuário:', error)
      alert('Erro ao criar usuário. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  // Função para formatar telefone automaticamente
  const formatPhoneNumber = (value: string): string => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '')
    
    // Aplica formatação baseada no número de dígitos
    if (numbers.length <= 2) {
      return numbers
    } else if (numbers.length <= 6) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`
    } else if (numbers.length <= 10) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`
    } else {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`
    }
  }

  const handleInputChange = (field: keyof CreateUserForm, value: string | number | boolean | null) => {
    // IMPORTANTÍSSIMO: marcar validação pendente imediatamente
    if (field === 'email') {
      const emailNow = String(value || '').trim().toLowerCase()
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNow) && emailNow !== lastValidatedEmailRef.current) {
        setEmailPendingValidation(true)
      }
    }
    if (field === 'cpf') {
      const cpfDigits = String(value || '').replace(/\D/g, '')
      if (cpfDigits.length === 11 && validateCPF(cpfDigits) && cpfDigits !== lastValidatedCpfRef.current) {
        setCpfPendingValidation(true)
      }
    }

    // Formatar telefone automaticamente
    if (field === 'telefone' && typeof value === 'string') {
      const formattedValue = formatPhoneNumber(value)
      setForm(prev => ({ ...prev, [field]: formattedValue }))
    } else if (field === 'cpf' && typeof value === 'string') {
      const formattedCpf = formatCPF(value)
      setForm(prev => ({ ...prev, [field]: formattedCpf }))
    } else {
      setForm(prev => ({ ...prev, [field]: value }))
    }
    
    // Limpar erro do campo quando usuário começar a digitar
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const handleInputBlur = (field: keyof CreateUserForm) => {
    // Validar campo específico quando usuário sair dele
    const newErrors: Partial<Record<keyof CreateUserForm, string>> = {}

    if (field === 'username') {
      if (!form.username.trim()) {
        newErrors.username = 'Username é obrigatório'
      } else if (form.username.length < 3) {
        newErrors.username = 'Username deve ter pelo menos 3 caracteres'
      }
    }

    if (field === 'email') {
      if (!form.email.trim()) {
        newErrors.email = 'Email é obrigatório'
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
        newErrors.email = 'Email inválido'
      } else if (emailAvailable === false) {
        newErrors.email = 'Este e-mail já está cadastrado para outro usuário'
      }
    }

    if (field === 'cpf') {
      if (!form.cpf.trim()) {
        newErrors.cpf = 'CPF é obrigatório'
      } else if (!validateCPF(form.cpf)) {
        newErrors.cpf = 'CPF inválido'
      } else if (cpfAvailable === false) {
        newErrors.cpf = 'Este CPF já está cadastrado para outro usuário'
      }
    }

    if (field === 'password') {
      if (!form.password) {
        newErrors.password = 'Senha é obrigatória'
      } else if (form.password.length < 8) {
        newErrors.password = 'Senha deve ter pelo menos 8 caracteres'
      }
    }

    if (field === 'confirmPassword') {
      if (!form.confirmPassword) {
        newErrors.confirmPassword = 'Confirmar senha é obrigatório'
      } else if (form.password !== form.confirmPassword) {
        newErrors.confirmPassword = 'Senhas não coincidem'
      }
    }

    if (field === 'nome') {
      if (!form.nome.trim()) {
        newErrors.nome = 'Nome é obrigatório'
      }
    }

    if (field === 'telefone') {
      if (!form.telefone.trim()) {
        newErrors.telefone = 'Telefone é obrigatório'
      } else {
        const telefone = form.telefone.trim()
        const telefoneRegex = /^\(\d{2}\) \d{4,5}-?\d{4}$/
        if (!telefoneRegex.test(telefone)) {
          newErrors.telefone = 'Telefone deve estar no formato (81) 99999-9999 ou (81) 9999-9999'
        }
      }
    }

    if (field === 'roleId') {
      if (!form.roleId) {
        newErrors.roleId = 'Perfil é obrigatório'
      }
    }

    // Atualizar apenas o erro do campo específico
    if (Object.keys(newErrors).length > 0) {
      setErrors(prev => ({ ...prev, ...newErrors }))
    }
  }

  const validateEmailForBlur = (): boolean => {
    const email = form.email.trim()
    if (!email) return false
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false
    if (emailPendingValidation || emailChecking) return false
    if (emailAvailable === false) return false
    return true
  }

  const validateCpfForBlur = (): boolean => {
    const cpfDigits = form.cpf.replace(/\D/g, '')
    if (!cpfDigits || cpfDigits.length < 11) return false
    if (!validateCPF(cpfDigits)) return false
    if (cpfPendingValidation || cpfChecking) return false
    if (cpfAvailable === false) return false
    return true
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />
        
        {/* Modal */}
        <div className="relative w-full max-w-4xl transform rounded-2xl bg-white p-6 shadow-2xl transition-all">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between border-b border-gray-200 pb-4">
            <h3 className="text-xl font-semibold text-gray-900">
              Novo Usuário
            </h3>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Primeira linha: Username e Email */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username *
                </label>
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  onBlur={() => handleInputBlur('username')}
                  className={`w-full rounded-lg border px-3 py-2.5 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${
                    errors.username ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Digite o username"
                  autoComplete="off"
                />
                {errors.username && (
                  <p className="mt-1 text-sm text-red-600">{errors.username}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Tab') {
                      // não permitir sair do campo se inválido/duplicado/ainda verificando
                      const ok = validateEmailForBlur()
                      if (!ok) {
                        e.preventDefault()
                        setTimeout(() => emailInputRef.current?.focus(), 0)
                      }
                    }
                  }}
                  onBlur={() => {
                    handleInputBlur('email')
                    const ok = validateEmailForBlur()
                    if (!ok) {
                      setTimeout(() => emailInputRef.current?.focus(), 0)
                    }
                  }}
                  className={`w-full rounded-lg border px-3 py-2.5 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${
                    errors.email ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Digite o email"
                  autoComplete="off"
                  ref={emailInputRef}
                />
                {!errors.email && (emailChecking || emailPendingValidation) && (
                  <p className="mt-1 text-xs text-gray-500">Verificando disponibilidade do e-mail...</p>
                )}
                {!errors.email && !emailChecking && !emailPendingValidation && emailAvailable === false && (
                  <p className="mt-1 text-sm text-red-600">Este e-mail já está cadastrado para outro usuário</p>
                )}
                {!errors.email && !emailChecking && !emailPendingValidation && emailAvailable === true && (
                  <p className="mt-1 text-xs text-emerald-600">E-mail disponível</p>
                )}
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </div>
            </div>

            {/* Segunda linha: Nome e Telefone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nome */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={(e) => handleInputChange('nome', e.target.value)}
                  onBlur={() => handleInputBlur('nome')}
                  className={`w-full rounded-lg border px-3 py-2.5 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${
                    errors.nome ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Digite o nome completo"
                />
                {errors.nome && (
                  <p className="mt-1 text-sm text-red-600">{errors.nome}</p>
                )}
              </div>

              {/* Telefone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefone *
                </label>
                <input
                  type="tel"
                  value={form.telefone}
                  onChange={(e) => handleInputChange('telefone', e.target.value)}
                  onBlur={() => handleInputBlur('telefone')}
                  className={`w-full rounded-lg border px-3 py-2.5 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${
                    errors.telefone ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Digite apenas os números (formatação automática)"
                />
                {errors.telefone && (
                  <p className="mt-1 text-sm text-red-600">{errors.telefone}</p>
                )}
              </div>
            </div>

            {/* Terceira linha: CPF */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CPF *
                </label>
                <input
                  type="text"
                  value={form.cpf}
                  onChange={(e) => handleInputChange('cpf', e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Tab') {
                      const ok = validateCpfForBlur()
                      if (!ok) {
                        e.preventDefault()
                        setTimeout(() => cpfInputRef.current?.focus(), 0)
                      }
                    }
                  }}
                  onBlur={() => {
                    handleInputBlur('cpf')
                    const cpfDigits = form.cpf.replace(/\D/g, '')
                    const ok = validateCpfForBlur()
                    if (!ok) {
                      // Não permitir sair do campo CPF se inválido/duplicado
                      setTimeout(() => cpfInputRef.current?.focus(), 0)
                    }
                  }}
                  className={`w-full rounded-lg border px-3 py-2.5 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${
                    errors.cpf ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="000.000.000-00"
                  autoComplete="off"
                  ref={cpfInputRef}
                />
                {!errors.cpf && (cpfChecking || cpfPendingValidation) && (
                  <p className="mt-1 text-xs text-gray-500">Verificando CPF...</p>
                )}
                {!errors.cpf && !cpfChecking && !cpfPendingValidation && cpfAvailable === false && (
                  <p className="mt-1 text-sm text-red-600">Este CPF já está cadastrado para outro usuário</p>
                )}
                {!errors.cpf && !cpfChecking && !cpfPendingValidation && cpfAvailable === true && (
                  <p className="mt-1 text-xs text-emerald-600">CPF disponível</p>
                )}
                {errors.cpf && (
                  <p className="mt-1 text-sm text-red-600">{errors.cpf}</p>
                )}
              </div>
              <div />
            </div>

            {/* Quarta linha: Perfil */}
            <div className="grid grid-cols-1 gap-4">
              {/* Perfil */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Perfil *
                </label>
                <select
                  value={form.roleId || ''}
                  onChange={(e) => handleInputChange('roleId', parseInt(e.target.value) || null)}
                  onBlur={() => handleInputBlur('roleId')}
                  className={`w-full rounded-lg border px-3 py-2.5 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${
                    errors.roleId ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">Selecione um perfil</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name} - {role.description}
                    </option>
                  ))}
                </select>
                {errors.roleId && (
                  <p className="mt-1 text-sm text-red-600">{errors.roleId}</p>
                )}
              </div>
            </div>

            {/* Quinta linha: Senha e Confirmar Senha */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Senha */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Senha *
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  onBlur={() => handleInputBlur('password')}
                  className={`w-full rounded-lg border px-3 py-2.5 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${
                    errors.password ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Digite a senha"
                  autoComplete="new-password"
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                )}
              </div>

              {/* Confirmar Senha */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmar Senha *
                </label>
                <input
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  onBlur={() => handleInputBlur('confirmPassword')}
                  className={`w-full rounded-lg border px-3 py-2.5 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${
                    errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Confirme a senha"
                  autoComplete="new-password"
                />
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
                )}
              </div>
            </div>

            {/* Campos de Status e Isenção */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="ativo"
                  checked={form.ativo}
                  onChange={(e) => handleInputChange('ativo', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="ativo" className="text-sm font-medium text-gray-700">
                  Usuário ativo
                </label>
              </div>

              {roles.find(r => r.id === form.roleId)?.name === 'Corretor' && (
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 px-3 py-2 bg-amber-50 rounded-lg border border-amber-100">
                    <input
                      type="checkbox"
                      id="isencao"
                      checked={form.isencao}
                      onChange={(e) => handleInputChange('isencao', e.target.checked)}
                      className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-amber-300 rounded"
                    />
                    <label htmlFor="isencao" className="text-sm font-medium text-amber-900">
                      Isenção de Mensalidade
                    </label>
                  </div>

                  <div className="flex items-center space-x-3 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
                    <input
                      type="checkbox"
                      id="is_plantonista"
                      checked={form.is_plantonista}
                      onChange={(e) => handleInputChange('is_plantonista', e.target.checked)}
                      className="h-4 w-4 text-slate-700 focus:ring-slate-500 border-slate-300 rounded"
                    />
                    <label htmlFor="is_plantonista" className="text-sm font-medium text-slate-900">
                      Corretor plantonista (fallback)
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Botões */}
            <div className="flex space-x-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-all font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
              >
                {loading ? 'Criando...' : 'Criar Usuário'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
