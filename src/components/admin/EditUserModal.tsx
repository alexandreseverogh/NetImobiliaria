'use client'

import { useState, useEffect } from 'react'
import { useApi } from '@/hooks/useApi'
import PermissionGuard from './PermissionGuard'

interface User {
  id: string
  username: string
  email: string
  nome: string
  telefone: string
  ativo: boolean
  isencao?: boolean
  is_plantonista?: boolean
  tipo_corretor?: 'Interno' | 'Externo' | null
  role_name?: string
  role_id?: number
  foto?: string | null // Base64 or URL
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
  const { put, delete: del } = useApi()
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    nome: '',
    telefone: '',
    ativo: true,
    isencao: false,
    is_plantonista: false,
    tipo_corretor: null as 'Interno' | 'Externo' | null,
    password: '',
    confirmPassword: '',
    roleId: null as number | null
  })
  const [foto, setFoto] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fotoInputId = 'edit-user-foto-input'

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
        isencao: user.isencao || false,
        is_plantonista: user.is_plantonista || false,
        tipo_corretor: user.tipo_corretor || null,
        password: '',
        confirmPassword: '',
        roleId: user.role_id || null
      })
      setErrors({})
      setFoto(null)
      setPreviewUrl(null)

      // Buscar detalhes completos do usuário (incluindo foto)
      const fetchUserDetails = async () => {
        try {
          const res = await fetch(`/api/admin/usuarios/${user.id}`)
          if (res.ok) {
            const data = await res.json()
            if (data.success && data.user) {
              if (data.user.foto) {
                setPreviewUrl(`data:${data.user.foto_tipo_mime || 'image/jpeg'};base64,${data.user.foto}`)
              }
            }
          }
        } catch (err) {
          console.error('Erro ao buscar foto do usuário:', err)
        }
      }
      fetchUserDetails()
    }
  }, [user])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.username.trim()) {
      newErrors.username = 'Username é obrigatório'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'E-mail é obrigatório'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'E-mail inválido'
    }

    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome é obrigatório'
    }

    // Validação do telefone (se fornecido)
    if (formData.telefone.trim()) {
      const telefone = formData.telefone.trim()
      // Aceitar formatos: (81) 99999-9999, (81) 999999999, (81) 9999-9999
      const telefoneRegex = /^\(\d{2}\) \d{4,5}-?\d{4}$/
      if (!telefoneRegex.test(telefone)) {
        newErrors.telefone = 'Telefone deve estar no formato (81) 99999-9999 ou (81) 9999-9999'
      }
    }

    if (!formData.roleId) {
      newErrors.roleId = 'Perfil é obrigatório'
    }

    if (formData.password && !formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirmar senha é obrigatório'
    } else if (formData.password && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'As senhas não coincidem'
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

      // Só incluir campos que têm valores válidos
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
      updateData.isencao = formData.isencao
      updateData.is_plantonista = formData.is_plantonista
      updateData.tipo_corretor = formData.tipo_corretor

      if (formData.roleId) {
        updateData.roleId = formData.roleId
      }

      // Só incluir senha se foi fornecida
      if (formData.password.trim()) {
        updateData.password = formData.password
      }

      console.log('📤 Dados sendo enviados para atualização (FormData)')

      const fd = new FormData()
      // Só incluir campos que têm valores válidos ou alterados
      if (formData.username.trim()) fd.append('username', formData.username.trim())
      if (formData.email.trim()) fd.append('email', formData.email.trim())
      if (formData.nome.trim()) fd.append('nome', formData.nome.trim())
      if (formData.telefone.trim()) fd.append('telefone', formData.telefone.trim())

      fd.append('ativo', String(formData.ativo))
      fd.append('isencao', String(formData.isencao))
      fd.append('is_plantonista', String(formData.is_plantonista))
      if (formData.tipo_corretor) fd.append('tipo_corretor', formData.tipo_corretor)

      if (formData.roleId) fd.append('roleId', formData.roleId.toString())

      if (formData.password.trim()) {
        fd.append('password', formData.password)
      }

      if (foto) {
        fd.append('foto', foto)
      }

      // Recuperar token para autenticação
      let token = localStorage.getItem('auth-token')
      if (!token) {
        const cookies = document.cookie.split(';')
        const tokenCookie = cookies.find(cookie => cookie.trim().startsWith('accessToken='))
        if (tokenCookie) {
          token = tokenCookie.split('=')[1]
        }
      }

      const headers: Record<string, string> = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch(`/api/admin/usuarios/${user?.id}`, {
        method: 'PUT',
        headers,
        body: fd
      })

      if (response.ok) {
        onSuccess()
        onClose()
        alert('Usuário atualizado com sucesso!')
      } else {
        const error = await response.json()
        let errorMessage = `Erro ao atualizar usuário: ${error.error || 'Erro desconhecido'}`

        // Mostrar detalhes de validação se disponíveis
        if (error.details && Array.isArray(error.details)) {
          errorMessage += '\n\nDetalhes:\n' + error.details.join('\n')
        }

        alert(errorMessage)
      }
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error)
      alert('Erro ao atualizar usuário. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!user) return

    const confirmMessage = `Tem certeza que deseja excluir o usuário "${user.username}"?\n\nEsta ação não pode ser desfeita e o usuário será removido permanentemente do sistema.`

    if (!confirm(confirmMessage)) {
      return
    }

    setDeleting(true)
    try {
      const response = await del(`/api/admin/usuarios/${user.id}`)

      if (response.ok) {
        onSuccess()
        onClose()
        alert('Usuário excluído com sucesso!')
      } else {
        const error = await response.json()
        alert(`Erro ao excluir usuário: ${error.error || 'Erro desconhecido'}`)
      }
    } catch (error) {
      console.error('Erro ao excluir usuário:', error)
      alert('Erro ao excluir usuário. Tente novamente.')
    } finally {
      setDeleting(false)
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

  const handleInputChange = (field: string, value: string | boolean | number | null) => {
    // Formatar telefone automaticamente
    if (field === 'telefone' && typeof value === 'string') {
      const formattedValue = formatPhoneNumber(value)
      setFormData(prev => ({ ...prev, [field]: formattedValue }))
    } else {
      setFormData(prev => ({ ...prev, [field]: value }))
    }

    // Limpar erro do campo quando usuário começar a digitar
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  if (!isOpen || !user) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 w-full max-w-4xl">
        <div className="bg-white rounded-2xl shadow-2xl p-6">
          <div className="flex items-center justify-between mb-6 border-b border-gray-200 pb-4">
            <h3 className="text-xl font-semibold text-gray-900">Editar Usuário</h3>
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
            {/* Foto (Topo) */}
            <div className="flex justify-center mb-6">
              <div className="w-full flex flex-col items-center">
                <div className="relative mb-4">
                  <div className={`w-32 h-32 rounded-full border-4 flex items-center justify-center overflow-hidden bg-white shadow-sm ${previewUrl ? 'border-blue-100' : 'border-gray-100'
                    }`}>
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    )}
                  </div>
                  <label
                    htmlFor={fotoInputId}
                    className="absolute bottom-1 right-1 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 cursor-pointer shadow-md transition-colors"
                    title="Alterar foto"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </label>
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
                    } else {
                      // Se cancelar, manter a foto anterior (se houver) ou limpar?
                      // Melhor manter a que veio do banco se não escolheu nova
                      // Mas se setFoto(null), vai enviar null.
                      // Se setPreviewUrl(null), vai mostrar vazio.
                      // Vamos apenas não mudar o preview se cancelar (ou o browser handle limpa?)
                    }
                  }}
                />
                <p className="text-xs text-gray-500">
                  {foto ? foto.name : 'Clique no ícone para alterar a foto'}
                </p>
              </div>
            </div>

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
                  className={`w-full rounded-lg border px-3 py-2.5 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${errors.username ? 'border-red-300' : 'border-gray-300'
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
                  className={`w-full rounded-lg border px-3 py-2.5 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${errors.email ? 'border-red-300' : 'border-gray-300'
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
                  className={`w-full rounded-lg border px-3 py-2.5 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${errors.nome ? 'border-red-300' : 'border-gray-300'
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
                  placeholder="Digite apenas os números (formatação automática)"
                />
                {errors.telefone && (
                  <p className="text-red-500 text-xs mt-1">{errors.telefone}</p>
                )}
              </div>
            </div>

            {/* Terceira linha: Perfil */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              {/* Tipo de Corretor (Apenas se o perfil for Corretor) */}
              {roles.find(r => r.id === formData.roleId)?.name === 'Corretor' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Corretor *
                  </label>
                  <select
                    value={formData.tipo_corretor || ''}
                    onChange={(e) => handleInputChange('tipo_corretor', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  >
                    <option value="Interno">Interno</option>
                    <option value="Externo">Externo</option>
                  </select>
                </div>
              )}
            </div>

            {/* Quarta linha: Status e Isenção */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="ativo"
                  checked={formData.ativo}
                  onChange={(e) => handleInputChange('ativo', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="ativo" className="text-sm font-medium text-gray-700">
                  Usuário ativo
                </label>
              </div>

              {roles.find(r => r.id === formData.roleId)?.name === 'Corretor' && (
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 px-3 py-2 bg-amber-50 rounded-lg border border-amber-100">
                    <input
                      type="checkbox"
                      id="isencao"
                      checked={formData.isencao}
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
                      checked={formData.is_plantonista}
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
                  className={`w-full rounded-lg border px-3 py-2.5 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${errors.password ? 'border-red-300' : 'border-gray-300'
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
                  className={`w-full rounded-lg border px-3 py-2.5 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                    }`}
                  placeholder="Confirme a nova senha"
                />
                {errors.confirmPassword && (
                  <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>
                )}
              </div>
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
                {loading ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

