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
  tipo_corretor: 'Interno' | 'Externo' | null
  google_refresh_token: string
  google_calendar_authorized: boolean
  custom_data: Record<string, any>
}

export default function CreateUserModal({ isOpen, onClose, onSuccess, roles }: CreateUserModalProps) {
  const { post, get } = useApi()
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
    is_plantonista: false,
    tipo_corretor: 'Interno',
    google_refresh_token: '',
    google_calendar_authorized: false,
    custom_data: {}
  })

  const [dynamicFields, setDynamicFields] = useState<any[]>([])

  const [foto, setFoto] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fotoInputId = 'admin-user-foto-input'

  const [existingUserId, setExistingUserId] = useState<string | null>(null)
  const [existingUserMessage, setExistingUserMessage] = useState<string | null>(null)

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
        is_plantonista: false,
        tipo_corretor: 'Interno',
        google_refresh_token: '',
        google_calendar_authorized: false,
        custom_data: {}
      })
      setDynamicFields([])
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
      lastValidatedEmailRef.current = ''
      lastValidatedCpfRef.current = ''
      cpfExistsCacheRef.current.clear()
      setFoto(null)
      setPreviewUrl(null)
      setExistingUserId(null)
      setExistingUserMessage(null)
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
      setExistingUserId(null)
      setExistingUserMessage(null)
      try {
        const res = await fetch(`/api/admin/usuarios/buscar-por-cpf?cpf=${encodeURIComponent(cpfDigits)}`, {
          method: 'GET',
          cache: 'no-store',
          signal: controller.signal
        })
        const data = await res.json().catch(() => null)
        
        if (res.ok && data?.found) {
          if (data.alreadyInTenant) {
            // Usuário já pertence a esta unidade! Bloquear ação.
            setCpfAvailable(false)
            cpfExistsCacheRef.current.set(cpfDigits, true) // Tratado como "já existe" de forma restritiva
            lastValidatedCpfRef.current = cpfDigits
            
            setErrors(prev => ({
              ...prev,
              cpf: 'Este usuário já está cadastrado na sua unidade. Para alterar seus dados, utilize a Edição na lista de usuários.'
            }))
            
            // Não preenche os dados, força o administrador a cancelar e ir editar o usuário existente
          } else {
            // Usuário existe globalmente mas NÃO está nesta unidade - Lógica de Vínculo (Onboarding suave)
            setCpfAvailable(false) // Tecnicalmente não disponível para criação DO ZERO
            cpfExistsCacheRef.current.set(cpfDigits, true)
            lastValidatedCpfRef.current = cpfDigits
            
            setExistingUserId(data.user.id)
            setExistingUserMessage('Este usuário já possui conta na plataforma. Ao salvar, ele será vinculado à sua unidade com o perfil selecionado.')
            
            setForm(prev => ({
              ...prev,
              nome: data.user.nome || prev.nome,
              email: data.user.email || prev.email,
              username: data.user.username || prev.username,
              telefone: data.user.telefone || prev.telefone,
              password: 'nao-alterar', // Senha não será alterada no vínculo
              confirmPassword: 'nao-alterar'
            }))
            
            // Limpar erros dos campos preenchidos
            setErrors(prev => ({
              ...prev,
              cpf: undefined,
              nome: undefined,
              email: undefined,
              username: undefined,
              telefone: undefined,
              password: undefined,
              confirmPassword: undefined
            }))
          }
        } else {
          // CPF Livre para novo cadastro global
          setCpfAvailable(true)
          cpfExistsCacheRef.current.set(cpfDigits, false)
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
    }, 400)

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

  // Buscar campos dinâmicos quando o perfil muda
  useEffect(() => {
    if (form.roleId) {
      const fetchFields = async () => {
        try {
          const response = await get(`/api/admin/perfis/${form.roleId}`)
          if (response.ok) {
            const data = await response.json()
            setDynamicFields(data.custom_fields || [])
            setForm(prev => ({ ...prev, custom_data: {} }))
          }
        } catch (error) {
          console.error('Erro ao buscar campos dinâmicos:', error)
        }
      }
      fetchFields()
    } else {
      setDynamicFields([])
    }
  }, [form.roleId])

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
    } else if (emailAvailable === false && !existingUserId) {
      newErrors.email = 'Este e-mail já está cadastrado para outro usuário'
    } else if (emailPendingValidation || emailChecking) {
      newErrors.email = 'Aguarde a validação do e-mail'
    }

    if (!form.cpf.trim()) {
      newErrors.cpf = 'CPF é obrigatório'
    } else if (!validateCPF(form.cpf)) {
      newErrors.cpf = 'CPF inválido'
    } else if (cpfAvailable === false && !existingUserId) {
      newErrors.cpf = 'Este CPF já está cadastrado para outro usuário'
    } else if (cpfPendingValidation || cpfChecking) {
      newErrors.cpf = 'Aguarde a validação do CPF'
    }

    if (!existingUserId) {
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
      const fd = new FormData()
      if (existingUserId) fd.append('existingUserId', existingUserId)
      fd.append('username', form.username.trim())
      fd.append('email', form.email.trim())
      fd.append('nome', form.nome.trim())
      fd.append('telefone', form.telefone.trim())
      fd.append('cpf', form.cpf.replace(/\D/g, ''))
      if (form.roleId) fd.append('roleId', form.roleId.toString())
      if (!existingUserId) fd.append('password', form.password)
      fd.append('ativo', String(form.ativo))
      fd.append('isencao', String(form.isencao))
      fd.append('is_plantonista', String(form.is_plantonista))
      if (form.tipo_corretor) fd.append('tipo_corretor', form.tipo_corretor)
      fd.append('google_refresh_token', form.google_refresh_token)
      fd.append('google_calendar_authorized', String(form.google_calendar_authorized))
      fd.append('custom_data', JSON.stringify(form.custom_data))

      if (foto) {
        fd.append('foto', foto)
      }

      const response = await post('/api/admin/usuarios', fd)

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
          isencao: false,
          is_plantonista: false,
          tipo_corretor: 'Interno',
          google_refresh_token: '',
          google_calendar_authorized: false,
          custom_data: {}
        })
        setFoto(null)
        setPreviewUrl(null)
        setExistingUserId(null)
        setExistingUserMessage(null)

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
        <div className="relative w-full max-w-4xl transform rounded-2xl bg-white p-5 shadow-2xl transition-all max-h-[95vh] flex flex-col">
          {/* Header */}
          <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
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
          <form onSubmit={handleSubmit} className="overflow-y-auto pr-1 space-y-4">
            {existingUserId && existingUserMessage && (
              <div className="mb-4 rounded-xl bg-amber-50 p-4 border border-amber-200 shadow-sm animate-in fade-in slide-in-from-top-2">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-bold text-amber-800">Atenção: Vínculo de Conta Existente</h3>
                    <div className="mt-1 text-sm text-amber-700">
                      <p>{existingUserMessage}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Coluna Foto */}
              <div className="md:col-span-1 flex flex-col items-center border-r border-gray-50 pr-4">
                <div className="relative group mb-2">
                  <div className={`w-24 h-24 rounded-full border-2 flex items-center justify-center overflow-hidden bg-white shadow-sm ${previewUrl ? 'border-blue-100' : 'border-gray-100'}`}>
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    )}
                    <label
                      htmlFor={fotoInputId}
                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                    >
                      <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </label>
                  </div>
                </div>

                <input
                  id={fotoInputId}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null
                    setFoto(file)
                    if (file) {
                      const url = URL.createObjectURL(file)
                      setPreviewUrl(url)
                    }
                  }}
                />
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Foto Perfil</p>
              </div>

              {/* Coluna Dados Principal */}
              <div className="md:col-span-3 space-y-4">

            {/* Primeira linha: CPF (O Gatilho) */}
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
                    const ok = validateCpfForBlur()
                    if (!ok) {
                      setTimeout(() => cpfInputRef.current?.focus(), 0)
                    }
                  }}
                  className={`w-full rounded-lg border px-3 py-2.5 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${errors.cpf ? 'border-red-300' : 'border-gray-300'
                    }`}
                  placeholder="000.000.000-00"
                  autoComplete="off"
                  ref={cpfInputRef}
                />
                {!errors.cpf && !cpfChecking && !cpfPendingValidation && cpfAvailable === true && (
                  <p className="mt-1 text-xs text-emerald-600">CPF disponível</p>
                )}
                {errors.cpf && (
                  <p className="mt-1 text-sm text-red-600">{errors.cpf}</p>
                )}
              </div>
              <div /> {/* Div vazia para manter o grid alinhado */}
            </div>

            {/* Segunda linha: Nome e Username */}
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
                  disabled={!!existingUserId}
                  className={`w-full rounded-lg border px-3 py-2.5 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${errors.nome ? 'border-red-300' : 'border-gray-300'
                    } ${existingUserId ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white'}`}
                  placeholder="Digite o nome completo"
                />
                {errors.nome && (
                  <p className="mt-1 text-sm text-red-600">{errors.nome}</p>
                )}
              </div>

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
                  disabled={!!existingUserId}
                  className={`w-full rounded-lg border px-3 py-2.5 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${errors.username ? 'border-red-300' : 'border-gray-300'
                    } ${existingUserId ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white'}`}
                  placeholder="Digite o username"
                  autoComplete="off"
                />
                {errors.username && (
                  <p className="mt-1 text-sm text-red-600">{errors.username}</p>
                )}
              </div>
            </div>

            {/* Terceira linha: Email e Telefone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  disabled={!!existingUserId}
                  className={`w-full rounded-lg border px-3 py-2.5 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${errors.email ? 'border-red-300' : 'border-gray-300'
                    } ${existingUserId ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white'}`}
                  placeholder="Digite o email"
                  autoComplete="off"
                  ref={emailInputRef}
                />
                {!errors.email && (emailChecking || emailPendingValidation) && (
                  <p className="mt-1 text-xs text-gray-500">Verificando disponibilidade do e-mail...</p>
                )}
                {!errors.email && !emailChecking && !emailPendingValidation && emailAvailable === false && !existingUserId && (
                  <p className="mt-1 text-sm text-red-600">Este e-mail já está cadastrado para outro usuário</p>
                )}
                {!errors.email && !emailChecking && !emailPendingValidation && emailAvailable === true && (
                  <p className="mt-1 text-xs text-emerald-600">E-mail disponível</p>
                )}
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
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
                  disabled={!!existingUserId}
                  className={`w-full rounded-lg border px-3 py-2.5 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${errors.telefone ? 'border-red-300' : 'border-gray-300'
                    } ${existingUserId ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white'}`}
                  placeholder="Apenas os números"
                />
                {errors.telefone && (
                  <p className="mt-1 text-sm text-red-600">{errors.telefone}</p>
                )}
              </div>
            </div>

            {/* Quarta linha: Perfil */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Perfil */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Perfil *
                </label>
                <select
                  value={form.roleId || ''}
                  onChange={(e) => handleInputChange('roleId', parseInt(e.target.value) || null)}
                  onBlur={() => handleInputBlur('roleId')}
                  className={`w-full rounded-lg border px-3 py-2.5 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${errors.roleId ? 'border-red-300' : 'border-gray-300'
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

            {/* Campos Dinâmicos (Metadados) */}
            {dynamicFields.length > 0 && (
              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></div>
                  <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest">Informações Complementares do Perfil</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {dynamicFields.map((field) => (
                    <div key={field.id}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {field.field_label} {field.is_required && '*'}
                      </label>
                      
                      {field.field_type === 'select' ? (
                        <select
                          value={form.custom_data[field.field_name] || ''}
                          onChange={(e) => {
                            setForm(prev => ({
                              ...prev,
                              custom_data: {
                                ...prev.custom_data,
                                [field.field_name]: e.target.value
                              }
                            }))
                          }}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                          required={field.is_required}
                        >
                          <option value="">Selecione...</option>
                          {field.field_options?.split(',').filter(Boolean).map((opt: string) => (
                            <option key={opt.trim()} value={opt.trim()}>
                              {opt.trim()}
                            </option>
                          ))}
                        </select>
                      ) : field.field_type === 'boolean' ? (
                        <div className="flex items-center space-x-3 py-2 bg-gray-50/50 px-3 rounded-lg border border-dashed border-gray-200">
                          <input
                            type="checkbox"
                            id={`field_${field.field_name}`}
                            checked={form.custom_data[field.field_name] === true || form.custom_data[field.field_name] === 'true'}
                            onChange={(e) => {
                              setForm(prev => ({
                                ...prev,
                                custom_data: {
                                  ...prev.custom_data,
                                  [field.field_name]: e.target.checked
                                }
                              }))
                            }}
                            className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition-all cursor-pointer"
                          />
                          <label htmlFor={`field_${field.field_name}`} className="text-sm text-gray-600 cursor-pointer select-none">
                            Sim
                          </label>
                        </div>
                      ) : (
                        <input
                          type={field.field_type === 'date' ? 'date' : field.field_type === 'number' ? 'number' : 'text'}
                          value={form.custom_data[field.field_name] || ''}
                          onChange={(e) => {
                            setForm(prev => ({
                              ...prev,
                              custom_data: {
                                ...prev.custom_data,
                                [field.field_name]: e.target.value
                              }
                            }))
                          }}
                          className="w-full rounded-lg border px-3 py-2.5 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all border-gray-300"
                          placeholder={`Digite o ${field.field_label}`}
                          required={field.is_required}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quinta linha: Senha e Confirmar Senha */}
            {!existingUserId && (
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
                    className={`w-full rounded-lg border px-3 py-2.5 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${errors.password ? 'border-red-300' : 'border-gray-300'
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
                    className={`w-full rounded-lg border px-3 py-2.5 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                      }`}
                    placeholder="Confirme a senha"
                    autoComplete="new-password"
                  />
                  {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
                  )}
                </div>
              </div>
            )}

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

              {/* Removido campos hardcoded de isenção e plantonista por solicitação do usuário */}
            </div>

            {/* Seção Google Calendar Removida por solicitação */}
          </div>
        </div>

        {/* Botões - Compactos - Fora do Grid mas dentro do Form */}
        <div className="flex space-x-3 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all font-medium text-sm"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium text-sm"
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
