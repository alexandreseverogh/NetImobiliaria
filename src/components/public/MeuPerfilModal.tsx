'use client'

import React, { useState, useEffect } from 'react'
import { User, Mail, Phone, MapPin, LogOut, Save, Building2, X, Home, Eye, EyeOff } from 'lucide-react'
import { useEstadosCidadesPublic } from '@/hooks/useEstadosCidadesPublic'
import { usePublicAuth } from '@/hooks/usePublicAuth'
import { formatCPF, formatTelefone, formatCEP, validateEmail } from '@/lib/utils/formatters'
import { buscarEnderecoPorCep } from '@/lib/utils/geocoding'


interface MeuPerfilModalProps {
  isOpen: boolean
  onClose: () => void
  initialMode?: 'details' | 'imoveis'
}

export default function MeuPerfilModal({ isOpen, onClose, initialMode = 'details' }: MeuPerfilModalProps) {
  const { estados, getCidadesPorEstado } = useEstadosCidadesPublic()
  const { logout } = usePublicAuth()

  const [userData, setUserData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [buscandoCep, setBuscandoCep] = useState(false)
  const [emailValidating, setEmailValidating] = useState(false)
  const [emailExists, setEmailExists] = useState(false)
  const [emailPendingValidation, setEmailPendingValidation] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showImoveisModal, setShowImoveisModal] = useState(false)
  const [imoveis, setImoveis] = useState<any[]>([])
  const [loadingImoveis, setLoadingImoveis] = useState(false)
  const [errorImoveis, setErrorImoveis] = useState('')
  const [showInteresseModal, setShowInteresseModal] = useState(false)
  const [imoveisInteresse, setImoveisInteresse] = useState<any[]>([])
  const [loadingInteresse, setLoadingInteresse] = useState(false)
  const [errorInteresse, setErrorInteresse] = useState('')
  const [showNoImoveisModal, setShowNoImoveisModal] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    estado_fk: '',
    cidade_fk: '',
    cep: '',
    endereco: '',
    bairro: '',
    numero: '',
    complemento: '',
    password: '',
    confirmPassword: ''
  })

  const cidades = formData.estado_fk ? getCidadesPorEstado(formData.estado_fk) : []

  // Carregar dados quando modal abrir
  useEffect(() => {
    if (!isOpen) {
      // Quando modal fecha, não fazer nada - manter usuário logado
      // Não resetar estados para não interferir na autenticação
      return
    }

    // Resetar apenas estados de UI quando modal abre, não dados de autenticação
    setError('')
    setSuccessMessage('')
    setIsEditing(false)

    const loadUserData = async () => {
      console.log('🔍 [MEU PERFIL MODAL] Iniciando carregamento...')
      const token = localStorage.getItem('public-auth-token')
      const userDataLocal = localStorage.getItem('public-user-data')

      // Verificar se token e dados existem antes de continuar
      if (!token || !userDataLocal) {
        console.log('❌ [MEU PERFIL MODAL] Sem token ou dados locais')
        setError('Você precisa estar logado para acessar seu perfil')
        setLoading(false)
        // Não fechar modal automaticamente - deixar usuário ver a mensagem de erro
        return
      }

      // Primeiro, tentar carregar dados do localStorage como fallback
      if (userDataLocal && !token) {
        try {
          const localData = JSON.parse(userDataLocal)
          setUserData(localData)
          setFormData({
            nome: localData.nome || '',
            email: localData.email || '',
            telefone: localData.telefone || '',
            estado_fk: localData.estado_fk || '',
            cidade_fk: localData.cidade_fk || '',
            cep: localData.cep || '',
            endereco: localData.endereco || '',
            bairro: localData.bairro || '',
            numero: localData.numero || '',
            complemento: localData.complemento || '',
            password: '',
            confirmPassword: ''
          })
          setLoading(false)
          return
        } catch (e) {
          console.error('❌ [MEU PERFIL MODAL] Erro ao parsear dados locais:', e)
        }
      }


      try {
        const response = await fetch('/api/public/auth/profile', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        if (response.ok) {
          const data = await response.json()

          if (data.success && data.data) {
            setUserData(data.data)
            setFormData({
              nome: data.data.nome || '',
              email: data.data.email || '',
              telefone: data.data.telefone || '',
              estado_fk: data.data.estado_fk || '',
              cidade_fk: data.data.cidade_fk || '',
              cep: data.data.cep || '',
              endereco: data.data.endereco || '',
              bairro: data.data.bairro || '',
              numero: data.data.numero || '',
              complemento: data.data.complemento || '',
              password: '',
              confirmPassword: ''
            })
          } else if (userDataLocal) {
            // Fallback para dados locais
            const localData = JSON.parse(userDataLocal)
            setUserData(localData)
            setFormData({
              nome: localData.nome || '',
              email: localData.email || '',
              telefone: localData.telefone || '',
              estado_fk: localData.estado_fk || '',
              cidade_fk: localData.cidade_fk || '',
              cep: localData.cep || '',
              endereco: localData.endereco || '',
              bairro: localData.bairro || '',
              numero: localData.numero || '',
              complemento: localData.complemento || '',
              password: '',
              confirmPassword: ''
            })
          } else {
            setError('Erro ao carregar dados do perfil')
          }
        } else {
          if (userDataLocal && response.status !== 401) {
            const localData = JSON.parse(userDataLocal)
            setUserData(localData)
            setFormData({
              nome: localData.nome || '',
              email: localData.email || '',
              telefone: localData.telefone || '',
              estado_fk: localData.estado_fk || '',
              cidade_fk: localData.cidade_fk || '',
              cep: localData.cep || '',
              endereco: localData.endereco || '',
              bairro: localData.bairro || '',
              numero: localData.numero || '',
              complemento: localData.complemento || '',
              password: '',
              confirmPassword: ''
            })
            setError('Erro ao atualizar dados do perfil. Dados locais exibidos.')
          } else if (response.status === 401) {
            // Sessão expirada - apenas mostrar erro, não fazer logout automático
            setError('Sessão expirada. Por favor, faça login novamente.')
            // Não remover localStorage nem fechar modal automaticamente
            // Deixar usuário decidir se quer fazer logout ou tentar novamente
          } else {
            setError('Erro ao carregar dados do perfil')
          }
        }
      } catch (error: any) {
        console.error('❌ [MEU PERFIL MODAL] Erro ao carregar dados:', error)

        if (userDataLocal) {
          try {
            const localData = JSON.parse(userDataLocal)
            setUserData(localData)
            setFormData({
              nome: localData.nome || '',
              email: localData.email || '',
              telefone: localData.telefone || '',
              estado_fk: localData.estado_fk || '',
              cidade_fk: localData.cidade_fk || '',
              cep: localData.cep || '',
              endereco: localData.endereco || '',
              bairro: localData.bairro || '',
              numero: localData.numero || '',
              complemento: localData.complemento || '',
              password: '',
              confirmPassword: ''
            })
            setError('Erro de conexão. Dados locais exibidos.')
          } catch (e) {
            setError('Erro ao carregar dados do perfil')
          }
        } else {
          setError('Erro ao carregar dados do perfil')
        }
      } finally {
        setLoading(false)
      }
    }

    loadUserData()
  }, [isOpen, onClose])

  // Buscar endereço automaticamente quando CEP for informado
  useEffect(() => {
    if (!isEditing || !isOpen) return

    const cep = formData.cep
    if (!cep) return

    const cepLimpo = cep.replace(/\D/g, '')
    if (cepLimpo.length !== 8) return

    const buscarEndereco = async () => {
      setBuscandoCep(true)
      try {
        const enderecoData = await buscarEnderecoPorCep(cepLimpo)
        if (enderecoData) {
          setFormData(prev => ({
            ...prev,
            endereco: enderecoData.logradouro || '',
            bairro: enderecoData.bairro || '',
            estado_fk: enderecoData.uf || '',
            cidade_fk: enderecoData.localidade || '',
            numero: prev.cep === cep ? prev.numero : ''
          }))
        }
      } catch (error) {
        console.error('❌ Erro ao buscar CEP:', error)
      } finally {
        setBuscandoCep(false)
      }
    }

    const timeoutId = setTimeout(buscarEndereco, 500)
    return () => clearTimeout(timeoutId)
  }, [formData.cep, isEditing, isOpen])

  // Verificar Email com debounce
  useEffect(() => {
    if (!isEditing || !isOpen) {
      setEmailPendingValidation(false)
      return
    }

    const email = formData.email
    if (!email || !validateEmail(email) || email === userData?.email) {
      setEmailExists(false)
      setEmailPendingValidation(false)
      return
    }

    setEmailPendingValidation(true)
    const timeoutId = setTimeout(async () => {
      try {
        const response = await fetch(`/api/public/auth/check-email?email=${encodeURIComponent(email)}&userType=${userData?.userType || 'cliente'}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('public-auth-token')}`,
            'Content-Type': 'application/json'
          }
        })
        const data = await response.json()
        setEmailExists(data.exists || false)
      } catch (error) {
        console.error('Erro ao verificar email:', error)
      } finally {
        setEmailPendingValidation(false)
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [formData.email, isEditing, userData?.email, userData?.userType, isOpen])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target

    let formattedValue = value
    if (name === 'telefone') {
      formattedValue = formatTelefone(value)
    } else if (name === 'cep') {
      formattedValue = formatCEP(value)
    }

    setFormData(prev => ({
      ...prev,
      [name]: formattedValue
    }))

    if (name === 'estado_fk') {
      setFormData(prev => ({
        ...prev,
        estado_fk: value,
        cidade_fk: ''
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')
    setErrors({})
    setSaving(true)

    const token = localStorage.getItem('public-auth-token')
    if (!token) {
      setError('Sessão expirada. Por favor, faça login novamente.')
      setSaving(false)
      return
    }

    const validationErrors: Record<string, string> = {}

    if (!formData.nome || formData.nome.trim().length === 0) {
      validationErrors.nome = 'Nome é obrigatório'
    }
    if (!formData.telefone) {
      validationErrors.telefone = 'Telefone é obrigatório'
    }
    if (!formData.email || !formData.email.includes('@')) {
      validationErrors.email = 'Email é obrigatório e deve ser válido'
    }
    if (!formData.cep || formData.cep.replace(/\D/g, '').length !== 8) {
      validationErrors.cep = 'CEP é obrigatório e deve ter 8 dígitos'
    }
    if (!formData.endereco) {
      validationErrors.endereco = 'Endereço é obrigatório'
    }
    if (!formData.bairro) {
      validationErrors.bairro = 'Bairro é obrigatório'
    }
    if (!formData.numero) {
      validationErrors.numero = 'Número é obrigatório'
    }
    if (!formData.estado_fk) {
      validationErrors.estado_fk = 'Estado é obrigatório'
    }
    if (!formData.cidade_fk) {
      validationErrors.cidade_fk = 'Cidade é obrigatória'
    }

    if (formData.password && formData.password.length < 6) {
      validationErrors.password = 'A senha deve ter no mínimo 6 caracteres'
    }

    if (formData.password && formData.password !== formData.confirmPassword) {
      validationErrors.confirmPassword = 'As senhas não coincidem'
    }

    if (emailExists) {
      validationErrors.email = 'Email já cadastrado'
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      setError('Por favor, corrija os erros antes de salvar')
      setSaving(false)
      return
    }

    try {
      const dataToSend: Partial<typeof formData> = { ...formData }
      if (!dataToSend.password) {
        delete dataToSend.password
      }

      const response = await fetch('/api/public/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(dataToSend)
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setSuccessMessage('Perfil atualizado com sucesso!')
        setIsEditing(false)
        setUserData(data.data)
        setFormData(prev => ({ ...prev, password: '' }))

        // Atualizar localStorage
        localStorage.setItem('public-user-data', JSON.stringify(data.data))

        // Disparar evento para atualizar AuthButtons
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('public-auth-changed'))
        }
      } else {
        setError(data.message || 'Erro ao atualizar perfil')
      }
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error)
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setSaving(false)
      setShowPassword(false)
      setShowConfirmPassword(false)
    }
  }

  const handleLogout = async () => {
    console.log('🔍 [MEU PERFIL MODAL] Executando Logout Completo via Hook...')
    onClose()
    await logout()
  }


  const handleCadastrarImovel = async () => {
    try {
      // 1. Gerar token admin temporário (necessário para consultar API admin)
      const publicToken = localStorage.getItem('public-auth-token')
      const authResponse = await fetch('/api/public/auth/generate-admin-token', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicToken}`, // Token público
          'Content-Type': 'application/json'
        }
      })

      if (!authResponse.ok) {
        throw new Error('Falha ao autenticar como proprietário')
      }

      const authData = await authResponse.json()
      const adminToken = authData.adminToken

      // Salvar tokens
      localStorage.setItem('admin-auth-token', adminToken)
      localStorage.setItem('admin-user-data', JSON.stringify(authData.userData))

      // 2. Redirecionar para criação de imóvel em nova janela
      const proprietarioUuid = userData?.uuid || userData?.id

      window.open(
        `/admin/imoveis/novo?fromProprietario=true&proprietario_uuid=${proprietarioUuid}&noSidebar=true`,
        '_blank',
        'noopener,noreferrer'
      )
    } catch (error) {
      console.error('Erro ao acessar cadastro:', error)
      alert('Erro ao acessar área de cadastro. Tente novamente.')
    }
  }

  const handleVerImoveis = async () => {
    try {
      // 1. Gerar token admin temporário (necessário para consultar API admin)
      const publicToken = localStorage.getItem('public-auth-token')
      const authResponse = await fetch('/api/public/auth/generate-admin-token', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!authResponse.ok) {
        throw new Error('Falha ao autenticar como proprietário')
      }

      const authData = await authResponse.json()
      const adminToken = authData.adminToken

      // Salvar tokens
      localStorage.setItem('admin-auth-token', adminToken)
      localStorage.setItem('admin-user-data', JSON.stringify(authData.userData))

      // 2. Verificar se existem imóveis cadastrados
      const proprietarioUuid = userData?.uuid || userData?.id
      const checkResponse = await fetch(`/api/admin/imoveis?proprietario_uuid=${proprietarioUuid}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminToken}`, // Usando o token gerado
          'Content-Type': 'application/json'
        }
      })

      if (checkResponse.ok) {
        const checkData = await checkResponse.json()
        const hasImoveis = checkData.data && checkData.data.length > 0

        if (!hasImoveis) {
          // Mostrar modal informando que não há imóveis cadastrados
          setShowNoImoveisModal(true)
          return
        }
      }

      // 3. Se existem imóveis, abrir a página CRUD em uma nova janela
      // Usar window.open para manter o modal do proprietário aberto na janela original
      window.open(
        `/admin/imoveis?fromProprietario=true&proprietario_uuid=${proprietarioUuid}&noSidebar=true`,
        '_blank', // Abre em nova aba/janela
        'noopener,noreferrer' // Boas práticas de segurança
      )
    } catch (error) {
      console.error('Erro ao verificar imóveis:', error)
      setLoading(false)
      alert('Erro ao verificar seus imóveis. Tente novamente.')
    }
  }

  const handleVerImoveisInteresse = async () => {
    setShowInteresseModal(true)
    setLoadingInteresse(true)
    setErrorInteresse('')

    const userDataLocal = localStorage.getItem('public-user-data')
    if (!userDataLocal) {
      setErrorInteresse('Dados do usuário não encontrados')
      setLoadingInteresse(false)
      return
    }

    try {
      const user = JSON.parse(userDataLocal)
      if (!user.uuid) {
        setErrorInteresse('UUID do cliente não encontrado')
        setLoadingInteresse(false)
        return
      }

      const publicToken = localStorage.getItem('public-auth-token')
      const response = await fetch(`/api/public/imoveis/prospects?cliente_uuid=${user.uuid}`, {
        headers: {
          'Authorization': `Bearer ${publicToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          setImoveisInteresse(data.data)
        } else {
          setErrorInteresse('Erro ao carregar imóveis de interesse')
        }
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido' }))
        setErrorInteresse(errorData.message || 'Erro ao carregar imóveis de interesse')
      }
    } catch (error: any) {
      console.error('Erro ao carregar imóveis de interesse:', error)
      setErrorInteresse('Erro de conexão ao carregar imóveis de interesse')
    } finally {
      setLoadingInteresse(false)
    }
  }

  const formatCurrency = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '-'
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatNumber = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '-'
    return value.toString()
  }

  const formatDate = (date: string | Date | null | undefined): string => {
    if (!date) return '-'
    try {
      const d = new Date(date)
      if (isNaN(d.getTime())) return '-'
      const day = String(d.getDate()).padStart(2, '0')
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const year = d.getFullYear()
      return `${day}/${month}/${year}`
    } catch {
      return '-'
    }
  }

  const formatEnderecoCompleto = (imovel: any): string => {
    const partes: string[] = []

    if (imovel.endereco) partes.push(imovel.endereco)
    if (imovel.numero) partes.push(imovel.numero)
    if (imovel.complemento) partes.push(imovel.complemento)
    if (imovel.bairro) partes.push(imovel.bairro)
    if (imovel.cidade) partes.push(imovel.cidade)
    if (imovel.estado) partes.push(imovel.estado)
    if (imovel.cep) partes.push(`CEP: ${imovel.cep}`)

    return partes.length > 0 ? partes.join(', ') : 'Endereço não informado'
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
        <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl my-8 max-h-[95vh] overflow-hidden flex flex-col">
          {/* Header Compacto */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-green-100 rounded-full border border-green-200 shadow-sm text-green-600">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold text-gray-900 leading-tight">
                      {userData?.userType === 'cliente' ? 'Meu Perfil' : 'Portal do Proprietário'}
                    </h1>
                    {userData && (
                      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border ${userData.userType === 'cliente'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-green-50 text-green-700 border-green-200'
                        }`}>
                        {userData.userType === 'cliente' ? 'Cliente' : 'Proprietário'}
                      </span>
                    )}
                  </div>
                  {userData && (
                    <p className="text-sm text-gray-600 font-medium">{userData.nome}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  Sair
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
              </div>
            ) : error && !userData ? (
              <div className="text-center py-20 text-red-600 font-medium">
                <p>{error}</p>
              </div>
            ) : userData ? (
              <div className="space-y-4">
                {(successMessage || error) && (
                  <div className={`p-3 rounded-lg text-xs font-medium border animate-in fade-in slide-in-from-top-2 ${successMessage ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
                    }`}>
                    {successMessage || error}
                  </div>
                )}

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50/50 border-b border-gray-100">
                    <div>
                      <h2 className="text-sm font-bold text-gray-900 uppercase tracking-tight">Dados Cadastrais</h2>
                    </div>
                    {!isEditing && (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="px-3 py-1 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-all border border-blue-200 flex items-center gap-1.5 shadow-sm"
                      >
                        <Save className="w-3.5 h-3.5" />
                        Editar Dados
                      </button>
                    )}
                  </div>

                  <div className="p-4">
                    {!isEditing ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                          <div className="flex items-center gap-2 p-2 bg-gray-50/50 rounded-lg hover:bg-white border border-transparent hover:border-blue-100 transition-all">
                            <User className="w-4 h-4 text-gray-400" />
                            <div className="min-w-0">
                              <p className="text-[9px] text-gray-400 uppercase font-bold">Nome</p>
                              <p className="text-xs font-semibold text-gray-800 truncate">{userData.nome}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 p-2 bg-gray-50/50 rounded-lg hover:bg-white border border-transparent hover:border-blue-100 transition-all">
                            <Mail className="w-4 h-4 text-gray-400" />
                            <div className="min-w-0">
                              <p className="text-[9px] text-gray-400 uppercase font-bold">Email</p>
                              <p className="text-xs font-semibold text-gray-800 truncate">{userData.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 p-2 bg-gray-50/50 rounded-lg hover:bg-white border border-transparent hover:border-blue-100 transition-all">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <div className="min-w-0">
                              <p className="text-[9px] text-gray-400 uppercase font-bold">WhatsApp</p>
                              <p className="text-xs font-semibold text-gray-800">{userData.telefone || '-'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 p-2 bg-gray-50/50 rounded-lg">
                            <User className="w-4 h-4 text-gray-400" />
                            <div className="min-w-0">
                              <p className="text-[9px] text-gray-400 uppercase font-bold">CPF</p>
                              <p className="text-xs font-semibold text-gray-800">{userData.cpf ? formatCPF(userData.cpf) : '-'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 p-2 bg-gray-50/50 rounded-lg">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            <div className="min-w-0">
                              <p className="text-[9px] text-gray-400 uppercase font-bold">Cidade/Estado</p>
                              <p className="text-xs font-semibold text-gray-800 truncate">{userData.cidade_fk || '-'} / {userData.estado_fk || '-'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 p-2 bg-gray-50/50 rounded-lg">
                            <Save className="w-4 h-4 text-gray-400" />
                            <div className="min-w-0">
                              <p className="text-[9px] text-gray-400 uppercase font-bold">Senha</p>
                              <p className="text-xs font-semibold text-gray-800">••••••••</p>
                            </div>
                          </div>
                          {(userData.endereco || userData.bairro) && (
                            <div className="flex items-start gap-2 p-2 bg-gray-50/80 rounded-lg md:col-span-2 lg:col-span-3 border border-gray-100">
                              <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                              <div>
                                <p className="text-[9px] text-gray-400 uppercase font-bold">Endereço Completo</p>
                                <p className="text-xs font-semibold text-gray-800">
                                  {userData.endereco && `${userData.endereco}`}
                                  {userData.numero && `, ${userData.numero}`}
                                  {userData.complemento && ` - ${userData.complemento}`}
                                  {userData.bairro && ` - ${userData.bairro}`}
                                  {userData.cep && ` • CEP: ${userData.cep}`}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        {(userData.userType === 'proprietario' || userData.userType === 'cliente') && (
                          <div className="pt-3 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                            {userData.userType === 'proprietario' && (
                              <>
                                <button onClick={handleCadastrarImovel} className="px-4 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white text-[10px] font-bold rounded-lg uppercase tracking-wider shadow-sm flex items-center justify-center gap-2 hover:from-green-700 transition-all">
                                  <Building2 className="w-4 h-4" /> Cadastrar Imóvel
                                </button>
                                <button onClick={handleVerImoveis} className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white text-[10px] font-bold rounded-lg uppercase tracking-wider shadow-sm flex items-center justify-center gap-2 hover:from-blue-700 transition-all">
                                  <Home className="w-4 h-4" /> Meus Imóveis
                                </button>
                              </>
                            )}
                            {userData.userType === 'cliente' && (
                              <button onClick={handleVerImoveisInteresse} className="col-span-1 sm:col-span-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white text-[10px] font-bold rounded-lg uppercase tracking-wider shadow-sm flex items-center justify-center gap-2 hover:from-blue-700 transition-all">
                                <Home className="w-4 h-4" /> Imóveis de Interesse
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="md:col-span-1">
                            <label className="block text-[9px] uppercase font-bold text-gray-400 mb-0.5 ml-1">Nome *</label>
                            <input name="nome" type="text" className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 transition-all" value={formData.nome} onChange={handleChange} />
                          </div>
                          <div className="md:col-span-1">
                            <label className="block text-[9px] uppercase font-bold text-gray-400 mb-0.5 ml-1">Email *</label>
                            <input name="email" type="email" className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 transition-all" value={formData.email} onChange={handleChange} />
                          </div>
                          <div className="md:col-span-1">
                            <label className="block text-[9px] uppercase font-bold text-gray-400 mb-0.5 ml-1">Telefone *</label>
                            <input name="telefone" type="text" className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 transition-all" value={formData.telefone} onChange={handleChange} />
                          </div>
                          <div className="md:col-span-1">
                            <label className="block text-[9px] uppercase font-bold text-gray-400 mb-0.5 ml-1">CEP *</label>
                            <input name="cep" type="text" className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 transition-all" value={formData.cep} onChange={handleChange} />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-[9px] uppercase font-bold text-gray-400 mb-0.5 ml-1">Endereço *</label>
                            <input name="endereco" type="text" className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 transition-all" value={formData.endereco} onChange={handleChange} />
                          </div>
                          <div className="md:col-span-1">
                            <label className="block text-[9px] uppercase font-bold text-gray-400 mb-0.5 ml-1">Bairro *</label>
                            <input name="bairro" type="text" className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 transition-all" value={formData.bairro} onChange={handleChange} />
                          </div>
                          <div className="md:col-span-1">
                            <label className="block text-[9px] uppercase font-bold text-gray-400 mb-0.5 ml-1 text-blue-600">Nova Senha</label>
                            <div className="relative">
                              <input name="password" type={showPassword ? 'text' : 'password'} className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg pr-10" value={formData.password} onChange={handleChange} />
                              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors">
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>
                          <div className="md:col-span-1">
                            <label className="block text-[9px] uppercase font-bold text-gray-400 mb-0.5 ml-1 text-blue-600">Confirmar</label>
                            <div className="relative">
                              <input name="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} className={`w-full px-3 py-1.5 text-sm border rounded-lg pr-10 ${errors.confirmPassword ? 'border-red-500' : 'border-gray-300'}`} value={formData.confirmPassword} onChange={handleChange} />
                              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors">
                                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                          <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 text-[10px] font-bold text-gray-500 uppercase">Cancelar</button>
                          <button type="submit" disabled={saving} className="px-6 py-2 bg-blue-600 text-white text-[10px] font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 uppercase tracking-widest shadow-sm">
                            {saving ? 'Gravando...' : 'Salvar'}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Modal de Imóveis Cadastrados */}
      {
        showImoveisModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="relative w-full max-w-[95vw] xl:max-w-[98vw] bg-white rounded-3xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 border-b border-gray-200 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      Meus Imóveis Cadastrados
                    </h2>
                    <p className="text-sm text-blue-100 mt-1">
                      {imoveis.length} {imoveis.length === 1 ? 'imóvel encontrado' : 'imóveis encontrados'}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowImoveisModal(false)}
                    className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {loadingImoveis && (
                  <div className="text-center py-12 text-gray-500">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    Carregando imóveis...
                  </div>
                )}

                {errorImoveis && (
                  <div className="text-center py-12 text-red-500">
                    <p>{errorImoveis}</p>
                  </div>
                )}

                {!loadingImoveis && !errorImoveis && imoveis.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <p>Nenhum imóvel cadastrado ainda.</p>
                  </div>
                )}

                {!loadingImoveis && !errorImoveis && imoveis.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 rounded-xl overflow-hidden">
                      <thead className="bg-gradient-to-r from-blue-600 to-indigo-700">
                        <tr>
                          <th className="px-2 py-3 text-left text-xs font-bold text-white uppercase tracking-wider rounded-tl-xl">Estado</th>
                          <th className="px-2 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Cidade</th>
                          <th className="px-2 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Finalidade</th>
                          <th className="px-2 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Preço</th>
                          <th className="px-2 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Condomínio</th>
                          <th className="px-2 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">IPTU</th>
                          <th className="px-2 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Taxa Extra</th>
                          <th className="px-2 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Área Total</th>
                          <th className="px-2 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Quartos</th>
                          <th className="px-2 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Suítes</th>
                          <th className="px-2 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Banheiros</th>
                          <th className="px-2 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Garagens</th>
                          <th className="px-2 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Varanda</th>
                          <th className="px-2 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Andar</th>
                          <th className="px-2 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Total Andares</th>
                          <th className="px-2 py-3 text-left text-xs font-bold text-white uppercase tracking-wider rounded-tr-xl">Data Cadastro</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {imoveis.map((imovel: any, index: number) => (
                          <React.Fragment key={imovel.id || `imovel-${index}`}>
                            <tr
                              key={imovel.id || index}
                              className={`transition-all duration-200 ${index % 2 === 0
                                ? 'bg-gradient-to-r from-blue-50/50 to-indigo-50/30 hover:from-blue-100/70 hover:to-indigo-100/50'
                                : 'bg-white hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50/30'
                                }`}
                            >
                              <td className="px-2 py-2.5 text-sm text-gray-900">{imovel.estado || '-'}</td>
                              <td className="px-2 py-2.5 text-sm text-gray-900">{imovel.cidade || '-'}</td>
                              <td className="px-2 py-2.5 text-sm text-gray-900">{imovel.finalidade || '-'}</td>
                              <td className="px-2 py-2.5 text-sm font-semibold text-green-600">{formatCurrency(imovel.preco)}</td>
                              <td className="px-2 py-2.5 text-sm text-gray-900">{formatCurrency(imovel.condominio)}</td>
                              <td className="px-2 py-2.5 text-sm text-gray-900">{formatCurrency(imovel.iptu)}</td>
                              <td className="px-2 py-2.5 text-sm text-gray-900">{formatCurrency(imovel.taxa_extra)}</td>
                              <td className="px-2 py-2.5 text-sm text-gray-900">{formatNumber(imovel.area_total)} m²</td>
                              <td className="px-2 py-2.5 text-sm text-gray-900">{formatNumber(imovel.quartos)}</td>
                              <td className="px-2 py-2.5 text-sm text-gray-900">{formatNumber(imovel.suites)}</td>
                              <td className="px-2 py-2.5 text-sm text-gray-900">{formatNumber(imovel.banheiros)}</td>
                              <td className="px-2 py-2.5 text-sm text-gray-900">{formatNumber(imovel.vagas_garagem)}</td>
                              <td className="px-2 py-2.5 text-sm text-gray-900">{imovel.varanda ? 'Sim' : 'Não'}</td>
                              <td className="px-2 py-2.5 text-sm text-gray-900">{formatNumber(imovel.andar)}</td>
                              <td className="px-2 py-2.5 text-sm text-gray-900">{formatNumber(imovel.total_andares)}</td>
                              <td className="px-2 py-2.5 text-sm text-gray-900">{formatDate(imovel.created_at)}</td>
                            </tr>
                            {/* Linha de endereço completo */}
                            <tr className={`transition-all duration-200 border-t border-gray-200/50 ${index % 2 === 0
                              ? 'bg-gradient-to-r from-gray-50/70 to-blue-50/40'
                              : 'bg-gray-50/40'
                              }`}>
                              <td colSpan={16} className="px-4 py-2.5 text-sm text-gray-700">
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                                  <span className="font-semibold text-gray-700">Endereço:</span>
                                  <span className="text-gray-800 break-words">
                                    {formatEnderecoCompleto(imovel)}
                                    {imovel.finalidade && ` - ${imovel.finalidade}`}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-gray-200 p-6 bg-gray-50 flex-shrink-0">
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowImoveisModal(false)}
                    className="px-6 py-2.5 bg-gradient-to-r from-gray-600 to-gray-700 text-white text-sm font-medium rounded-lg hover:from-gray-700 hover:to-gray-800 transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Modal de Imóveis de Interesse (Clientes) */}
      {
        showInteresseModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="relative w-full max-w-[95vw] xl:max-w-[98vw] bg-white rounded-3xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 border-b border-gray-200 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      Imóveis de meu interesse
                    </h2>
                    <p className="text-sm text-blue-100 mt-1">
                      {imoveisInteresse.length} {imoveisInteresse.length === 1 ? 'imóvel encontrado' : 'imóveis encontrados'}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowInteresseModal(false)}
                    className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {loadingInteresse && (
                  <div className="text-center py-12 text-gray-500">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    Carregando imóveis de interesse...
                  </div>
                )}

                {errorInteresse && (
                  <div className="text-center py-12 text-red-500">
                    <p>{errorInteresse}</p>
                  </div>
                )}

                {!loadingInteresse && !errorInteresse && imoveisInteresse.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <p>Você ainda não demonstrou interesse em nenhum imóvel.</p>
                  </div>
                )}

                {!loadingInteresse && !errorInteresse && imoveisInteresse.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 rounded-xl overflow-hidden">
                      <thead className="bg-gradient-to-r from-slate-700 to-slate-800">
                        <tr>
                          <th className="px-2 py-3 text-left text-xs font-bold text-white uppercase tracking-wider rounded-tl-xl">Estado</th>
                          <th className="px-2 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Cidade</th>
                          <th className="px-2 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Finalidade</th>
                          <th className="px-2 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Preço</th>
                          <th className="px-2 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Condomínio</th>
                          <th className="px-2 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">IPTU</th>
                          <th className="px-2 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Taxa Extra</th>
                          <th className="px-2 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Área Total</th>
                          <th className="px-2 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Quartos</th>
                          <th className="px-2 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Suítes</th>
                          <th className="px-2 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Banheiros</th>
                          <th className="px-2 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Garagens</th>
                          <th className="px-2 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Varanda</th>
                          <th className="px-2 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Andar</th>
                          <th className="px-2 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Total Andares</th>
                          <th className="px-2 py-3 text-center text-xs font-bold text-white uppercase tracking-wider rounded-tr-xl">Data de Interesse</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {imoveisInteresse.map((item: any, index: number) => (
                          <React.Fragment key={item.id || `interesse-${index}`}>
                            <tr
                              className={`transition-all duration-200 ${index % 2 === 0
                                ? 'bg-gradient-to-r from-blue-50/50 to-indigo-50/30 hover:from-blue-100/70 hover:to-indigo-100/50'
                                : 'bg-white hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50/30'
                                }`}
                            >
                              <td className="px-2 py-2.5 text-sm text-gray-900">{item.estado_fk || '-'}</td>
                              <td className="px-2 py-2.5 text-sm text-gray-900">{item.cidade_fk || '-'}</td>
                              <td className="px-2 py-2.5 text-sm text-gray-900">{item.finalidade || '-'}</td>
                              <td className="px-2 py-2.5 text-sm font-semibold text-green-600">{formatCurrency(item.preco)}</td>
                              <td className="px-2 py-2.5 text-sm text-gray-900">{formatCurrency(item.condominio)}</td>
                              <td className="px-2 py-2.5 text-sm text-gray-900">{formatCurrency(item.iptu)}</td>
                              <td className="px-2 py-2.5 text-sm text-gray-900">{formatCurrency(item.taxa_extra)}</td>
                              <td className="px-2 py-2.5 text-sm text-gray-900">{formatNumber(item.area_total)} m²</td>
                              <td className="px-2 py-2.5 text-sm text-gray-900">{formatNumber(item.quartos)}</td>
                              <td className="px-2 py-2.5 text-sm text-gray-900">{formatNumber(item.suites)}</td>
                              <td className="px-2 py-2.5 text-sm text-gray-900">{formatNumber(item.banheiros)}</td>
                              <td className="px-2 py-2.5 text-sm text-gray-900">{formatNumber(item.vagas_garagem)}</td>
                              <td className="px-2 py-2.5 text-sm text-gray-900">{formatNumber(item.varanda)}</td>
                              <td className="px-2 py-2.5 text-sm text-gray-900">{formatNumber(item.andar)}</td>
                              <td className="px-2 py-2.5 text-sm text-gray-900">{formatNumber(item.total_andares)}</td>
                              <td className="px-2 py-2.5 text-sm text-gray-900 text-center">{formatDate(item.created_at)}</td>
                            </tr>
                            {/* Linha de endereço completo */}
                            <tr className={`transition-all duration-200 border-t border-gray-200/50 ${index % 2 === 0
                              ? 'bg-gradient-to-r from-gray-50/70 to-blue-50/40'
                              : 'bg-gray-50/40'
                              }`}>
                              <td colSpan={16} className="px-4 py-2.5 text-sm text-gray-700">
                                <div className="flex items-center justify-between gap-4">
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                    <span className="font-semibold text-gray-700">Endereço:</span>
                                    <span className="text-gray-800 break-words">
                                      {item.endereco || ''}
                                      {item.numero && `, ${item.numero}`}
                                      {item.complemento && ` - ${item.complemento}`}
                                      {item.bairro && ` - ${item.bairro}`}
                                      {item.cidade_fk && `, ${item.cidade_fk}`}
                                      {item.estado_fk && ` - ${item.estado_fk}`}
                                      {item.cep && ` • CEP: ${item.cep}`}
                                      {item.finalidade && ` - ${item.finalidade}`}
                                      {item.corretor_nome && (
                                        <>
                                          {' • '}
                                          <span className="font-semibold text-blue-700">Corretor:</span>
                                          {` ${item.corretor_nome}`}
                                          {item.corretor_email && (
                                            <>
                                              {' • '}
                                              <span className="font-semibold text-blue-700">Email:</span>
                                              {` ${item.corretor_email}`}
                                            </>
                                          )}
                                          {item.corretor_telefone && (
                                            <>
                                              {' • '}
                                              <span className="font-semibold text-blue-700">Tel:</span>
                                              {` ${formatTelefone(item.corretor_telefone)}`}
                                            </>
                                          )}
                                        </>
                                      )}
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => window.open(`/imoveis/${item.id_imovel}`, '_blank')}
                                    className="flex-shrink-0 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg"
                                  >
                                    Ver Detalhes
                                  </button>
                                </div>
                              </td>
                            </tr>
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-gray-200 p-6 bg-gray-50 flex-shrink-0">
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowInteresseModal(false)}
                    className="px-6 py-2.5 bg-gradient-to-r from-gray-600 to-gray-700 text-white text-sm font-medium rounded-lg hover:from-gray-700 hover:to-gray-800 transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Modal de Nenhum Imóvel Cadastrado */}
      {
        showNoImoveisModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
              {/* Header com gradiente */}
              <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-6">
                <div className="flex items-center justify-center">
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                    <Building2 className="w-8 h-8 text-white" />
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-8 text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Nenhum Imóvel Cadastrado
                </h2>
                <p className="text-gray-600 text-lg mb-6">
                  Ainda não existem imóveis cadastrados para você
                </p>
                <p className="text-sm text-gray-500 mb-8">
                  Comece cadastrando seu primeiro imóvel clicando no botão "Cadastrar Imóvel"
                </p>

                {/* Botão Fechar */}
                <button
                  onClick={() => setShowNoImoveisModal(false)}
                  className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-base font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )
      }
    </>
  )
}

