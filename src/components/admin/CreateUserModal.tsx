'use client'

import { useState, useEffect } from 'react'
import { useApi } from '@/hooks/useApi'
// import { XMarkIcon } from '@heroicons/react/24/outline'

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
  roleId: number | null
  ativo: boolean
}

export default function CreateUserModal({ isOpen, onClose, onSuccess, roles }: CreateUserModalProps) {
  const { post } = useApi()
  const [form, setForm] = useState<CreateUserForm>({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    nome: '',
    telefone: '',
    roleId: null,
    ativo: true
  })
  
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof CreateUserForm, string>>>({})

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
        roleId: null,
        ativo: true
      })
      setErrors({})
    }
  }, [isOpen])

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
    }

    if (!form.password) {
      newErrors.password = 'Senha é obrigatória'
    } else if (form.password.length < 8) {
      newErrors.password = 'Senha deve ter pelo menos 8 caracteres'
    }

    if (form.password !== form.confirmPassword) {
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
        roleId: form.roleId,
        ativo: form.ativo
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
          roleId: null,
          ativo: true
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
    // Formatar telefone automaticamente
    if (field === 'telefone' && typeof value === 'string') {
      const formattedValue = formatPhoneNumber(value)
      setForm(prev => ({ ...prev, [field]: formattedValue }))
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
      if (form.password !== form.confirmPassword) {
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
                  onBlur={() => handleInputBlur('email')}
                  className={`w-full rounded-lg border px-3 py-2.5 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${
                    errors.email ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Digite o email"
                  autoComplete="off"
                />
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

            {/* Terceira linha: Perfil */}
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

            {/* Quarta linha: Senha e Confirmar Senha */}
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

            {/* Campo Ativo */}
            <div className="flex items-center space-x-3 pt-4">
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
