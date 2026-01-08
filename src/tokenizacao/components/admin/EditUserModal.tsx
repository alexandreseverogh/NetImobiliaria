/* eslint-disable */
'use client'

import { useState, useEffect } from 'react'
import PermissionGuard from './PermissionGuard'

interface User {
  id: string
  username: string
  email: string
  nome: string
  telefone: string
  ativo: boolean
  role_name?: string
  role_id?: number
}

interface UserRole {
  id: number
  name: string
  description: string
  level: number
}

interface EditUserModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  user: User | null
  roles: UserRole[]
}

export default function EditUserModal({ isOpen, onClose, onSuccess, user, roles }: EditUserModalProps) {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    nome: '',
    telefone: '',
    ativo: true,
    password: '',
    confirmPassword: '',
    roleId: null as number | null
  })
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username,
        email: user.email,
        nome: user.nome,
        telefone: user.telefone || '',
        ativo: user.ativo,
        password: '',
        confirmPassword: '',
        roleId: user.role_id || null
      })
      setErrors({})
    }
  }, [user])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.username.trim()) {
      newErrors.username = 'Username Ã© obrigatÃ³rio'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'E-mail Ã© obrigatÃ³rio'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'E-mail invÃ¡lido'
    }

    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome Ã© obrigatÃ³rio'
    }

    // ValidaÃ§Ã£o do telefone (se fornecido)
    if (formData.telefone.trim()) {
      const telefone = formData.telefone.trim()
      // Aceitar formatos: (81) 99999-9999, (81) 999999999, (81) 9999-9999
      const telefoneRegex = /^\(\d{2}\) \d{4,5}-?\d{4}$/
      if (!telefoneRegex.test(telefone)) {
        newErrors.telefone = 'Telefone deve estar no formato (81) 99999-9999 ou (81) 9999-9999'
      }
    }

    if (!formData.roleId) {
      newErrors.roleId = 'Perfil Ã© obrigatÃ³rio'
    }

    if (formData.password && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'As senhas nÃ£o coincidem'
    }

    if (formData.password && formData.password.length < 8) {
      newErrors.password = 'A senha deve ter pelo menos 8 caracteres'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setLoading(true)
    try {
      const updateData: any = {}

      // SÃ³ incluir campos que tÃªm valores vÃ¡lidos
      if (formData.username.trim()) {
        updateData.username = formData.username.trim()
      }
      
      if (formData.email.trim()) {
        updateData.email = formData.email.trim()
      }
      
      if (formData.nome.trim()) {
        updateData.nome = formData.nome.trim()
      }
      
      if (formData.telefone.trim()) {
        updateData.telefone = formData.telefone.trim()
      }
      
      updateData.ativo = formData.ativo
      
      if (formData.roleId) {
        updateData.roleId = formData.roleId
      }

      // SÃ³ incluir senha se foi fornecida
      if (formData.password.trim()) {
        updateData.password = formData.password
      }

      console.log('ðŸ“¤ Dados sendo enviados para atualizaÃ§Ã£o:', updateData)
      console.log('ðŸ†” ID do usuÃ¡rio:', user?.id)
      
      const response = await fetch(`/api/admin/usuarios/${user?.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      if (response.ok) {
        onSuccess()
        onClose()
        alert('UsuÃ¡rio atualizado com sucesso!')
      } else {
        const error = await response.json()
        let errorMessage = `Erro ao atualizar usuÃ¡rio: ${error.error || 'Erro desconhecido'}`
        
        // Mostrar detalhes de validaÃ§Ã£o se disponÃ­veis
        if (error.details && Array.isArray(error.details)) {
          errorMessage += '\n\nDetalhes:\n' + error.details.join('\n')
        }
        
        alert(errorMessage)
      }
    } catch (error) {
      console.error('Erro ao atualizar usuÃ¡rio:', error)
      alert('Erro ao atualizar usuÃ¡rio. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!user) return

    const confirmMessage = `Tem certeza que deseja excluir o usuÃ¡rio "${user.username}"?\n\nEsta aÃ§Ã£o nÃ£o pode ser desfeita e o usuÃ¡rio serÃ¡ removido permanentemente do sistema.`
    
    if (!confirm(confirmMessage)) {
      return
    }

    setDeleting(true)
    try {
      const response = await fetch(`/api/admin/usuarios/${user.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        onSuccess()
        onClose()
        alert('UsuÃ¡rio excluÃ­do com sucesso!')
      } else {
        const error = await response.json()
        alert(`Erro ao excluir usuÃ¡rio: ${error.error || 'Erro desconhecido'}`)
      }
    } catch (error) {
      console.error('Erro ao excluir usuÃ¡rio:', error)
      alert('Erro ao excluir usuÃ¡rio. Tente novamente.')
    } finally {
      setDeleting(false)
    }
  }

  // FunÃ§Ã£o para formatar telefone automaticamente
  const formatPhoneNumber = (value: string): string => {
    // Remove tudo que nÃ£o Ã© nÃºmero
    const numbers = value.replace(/\D/g, '')
    
    // Aplica formataÃ§Ã£o baseada no nÃºmero de dÃ­gitos
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

  const handleInputChange = (field: string, value: string | boolean | number | null) => {
    // Formatar telefone automaticamente
    if (field === 'telefone' && typeof value === 'string') {
      const formattedValue = formatPhoneNumber(value)
      setFormData(prev => ({ ...prev, [field]: formattedValue }))
    } else {
      setFormData(prev => ({ ...prev, [field]: value }))
    }
    
    // Limpar erro do campo quando usuÃ¡rio comeÃ§ar a digitar
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  if (!isOpen || !user) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 w-full max-w-4xl">
        <div className="bg-white rounded-2xl shadow-2xl p-6">
          <div className="flex items-center justify-between mb-6 border-b border-gray-200 pb-4">
            <h3 className="text-xl font-semibold text-gray-900">Editar UsuÃ¡rio</h3>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

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
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2.5 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${
                    errors.username ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Digite o username"
                />
                {errors.username && (
                  <p className="text-red-500 text-xs mt-1">{errors.username}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-mail *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2.5 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${
                    errors.email ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Digite o e-mail"
                />
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1">{errors.email}</p>
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
                  value={formData.nome}
                  onChange={(e) => handleInputChange('nome', e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2.5 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${
                    errors.nome ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Digite o nome completo"
                />
                {errors.nome && (
                  <p className="text-red-500 text-xs mt-1">{errors.nome}</p>
                )}
              </div>

              {/* Telefone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefone
                </label>
                <input
                  type="tel"
                  value={formData.telefone}
                  onChange={(e) => handleInputChange('telefone', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  placeholder="Digite apenas os nÃºmeros (formataÃ§Ã£o automÃ¡tica)"
                />
                {errors.telefone && (
                  <p className="text-red-500 text-xs mt-1">{errors.telefone}</p>
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
                  value={formData.roleId || ''}
                  onChange={(e) => handleInputChange('roleId', parseInt(e.target.value) || null)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                >
                  <option value="">Selecione um perfil</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name} - {role.description}
                    </option>
                  ))}
                </select>
                {errors.roleId && (
                  <p className="text-red-500 text-xs mt-1">{errors.roleId}</p>
                )}
              </div>
            </div>

            {/* Quarta linha: Status */}
            <div className="grid grid-cols-1 gap-4">
              {/* Status */}
              <div className="flex items-center justify-center">
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <input
                    type="checkbox"
                    id="ativo"
                    checked={formData.ativo}
                    onChange={(e) => handleInputChange('ativo', e.target.checked)}
                    className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition-all"
                  />
                  <label htmlFor="ativo" className="block text-sm font-medium text-gray-900">
                    UsuÃ¡rio ativo
                  </label>
                </div>
              </div>
            </div>

            {/* Quarta linha: Nova Senha e Confirmar Senha */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nova Senha */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nova Senha (deixe em branco para manter a atual)
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2.5 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${
                    errors.password ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Digite a nova senha"
                />
                {errors.password && (
                  <p className="text-red-500 text-xs mt-1">{errors.password}</p>
                )}
              </div>

              {/* Confirmar Senha */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmar Nova Senha
                </label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2.5 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${
                    errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Confirme a nova senha"
                />
                {errors.confirmPassword && (
                  <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>
                )}
              </div>
            </div>

            {/* BotÃµes */}
            <div className="flex space-x-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-all font-medium"
              >
                Cancelar
              </button>
              
              <PermissionGuard resource="usuarios" action="DELETE">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting || loading}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
                >
                  {deleting ? 'Excluindo...' : 'Excluir'}
                </button>
              </PermissionGuard>
              
              <button
                type="submit"
                disabled={loading || deleting}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
              >
                {loading ? 'Salvando...' : 'Salvar AlteraÃ§Ãµes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}


