'use client'

import React, { useState, useEffect } from 'react'
import { User, Mail, Phone, MapPin, LogOut, Save, Building2, X, Home } from 'lucide-react'
import { useEstadosCidadesPublic } from '@/hooks/useEstadosCidadesPublic'
import { formatCPF, formatTelefone, formatCEP, validateEmail } from '@/lib/utils/formatters'
import { buscarEnderecoPorCep } from '@/lib/utils/geocoding'

interface MeuPerfilModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function MeuPerfilModal({ isOpen, onClose }: MeuPerfilModalProps) {
  const { estados, getCidadesPorEstado } = useEstadosCidadesPublic()
  
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
    password: ''
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
            password: ''
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
              password: ''
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
              password: ''
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
              password: ''
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
              password: ''
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
    }
  }

  const handleLogout = () => {
    // Botão "Sair" agora apenas fecha o modal, mantendo o usuário logado
    // (mesmo comportamento do botão "X")
    console.log('🔍 [MEU PERFIL MODAL] Botão Sair clicado - apenas fechando modal, mantendo usuário logado')
    onClose()
  }

  const handleVerImoveis = async () => {
    setShowImoveisModal(true)
    setLoadingImoveis(true)
    setErrorImoveis('')

    const token = localStorage.getItem('public-auth-token')
    if (!token) {
      setErrorImoveis('Token de autenticação não encontrado')
      setLoadingImoveis(false)
      return
    }

    try {
      const response = await fetch('/api/public/auth/meus-imoveis', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          setImoveis(data.data)
        } else {
          setErrorImoveis('Erro ao carregar imóveis')
        }
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido' }))
        setErrorImoveis(errorData.message || 'Erro ao carregar imóveis')
      }
    } catch (error: any) {
      console.error('Erro ao carregar imóveis:', error)
      setErrorImoveis('Erro de conexão ao carregar imóveis')
    } finally {
      setLoadingImoveis(false)
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

      const response = await fetch(`/api/public/imoveis/prospects?cliente_uuid=${user.uuid}`, {
        headers: {
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
        <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl my-8 max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-16 h-16 flex items-center justify-center bg-green-100 rounded-full">
                  <User className={`w-8 h-8 ${
                    userData?.userType === 'cliente' ? 'text-blue-600' : 'text-green-600'
                  }`} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Meu Perfil
                  </h1>
                  {userData && (
                    <p className="text-sm text-gray-600 mt-1">
                      Bem-vindo(a), {userData.nome}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sair
                </button>
                {/* Botão Fechar - apenas fecha o modal, mantém usuário logado */}
                <button
                  onClick={() => {
                    console.log('🔍 [MEU PERFIL MODAL] Botão Fechar clicado - verificando localStorage antes de fechar')
                    const token = localStorage.getItem('public-auth-token')
                    const userData = localStorage.getItem('public-user-data')
                    console.log('🔍 [MEU PERFIL MODAL] Token existe?', !!token)
                    console.log('🔍 [MEU PERFIL MODAL] UserData existe?', !!userData)
                    // Apenas fechar modal - não fazer logout
                    onClose()
                    // Verificar novamente após fechar para garantir que não foi limpo
                    setTimeout(() => {
                      const tokenAfter = localStorage.getItem('public-auth-token')
                      const userDataAfter = localStorage.getItem('public-user-data')
                      console.log('🔍 [MEU PERFIL MODAL] Após fechar - Token existe?', !!tokenAfter)
                      console.log('🔍 [MEU PERFIL MODAL] Após fechar - UserData existe?', !!userDataAfter)
                      if (!tokenAfter || !userDataAfter) {
                        console.error('❌ [MEU PERFIL MODAL] ERRO: localStorage foi limpo ao fechar modal!')
                      }
                    }, 100)
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Fechar (permanecer logado)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Carregando...</p>
                </div>
              </div>
            ) : error && !userData ? (
              <div className="text-center py-12 text-red-600">
                <p>{error}</p>
              </div>
            ) : userData ? (
              <>
                {/* Tipo de Usuário */}
                <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-xl border border-blue-100 mb-6">
                  <div className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg ${
                    userData.userType === 'cliente' ? 'bg-blue-100' : 'bg-green-100'
                  }`}>
                    <User className={`w-5 h-5 ${
                      userData.userType === 'cliente' ? 'text-blue-600' : 'text-green-600'
                    }`} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Tipo de Conta</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {userData.userType === 'cliente' ? 'Cliente' : 'Proprietário'}
                    </p>
                  </div>
                </div>

                {/* Mensagens */}
                {successMessage && (
                  <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
                    {successMessage}
                  </div>
                )}
                {error && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
                    {error}
                  </div>
                )}

                {/* Formulário */}
                <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 mb-1">Meus Dados</h2>
                      <p className="text-sm text-gray-600">Visualize e edite suas informações pessoais</p>
                    </div>
                    {!isEditing && (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200"
                      >
                        Editar
                      </button>
                    )}
                  </div>

                  {/* Exibição dos dados quando não está editando */}
                  {!isEditing && (
                    <div className="space-y-3 mb-6">
                      {/* Nome */}
                      <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <User className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-500 uppercase tracking-wide">Nome</p>
                          <p className="text-sm font-medium text-gray-900 break-words">{userData.nome}</p>
                        </div>
                      </div>

                      {/* Email */}
                      <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <Mail className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-500 uppercase tracking-wide">Email</p>
                          <p className="text-sm font-medium text-gray-900 break-words">{userData.email}</p>
                        </div>
                      </div>

                      {/* Telefone */}
                      {userData.telefone && (
                        <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                          <Phone className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-500 uppercase tracking-wide">Telefone</p>
                            <p className="text-sm font-medium text-gray-900">{userData.telefone}</p>
                          </div>
                        </div>
                      )}

                      {/* CPF */}
                      {userData.cpf && (
                        <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                          <User className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-500 uppercase tracking-wide">CPF</p>
                            <p className="text-sm font-medium text-gray-900">{formatCPF(userData.cpf)}</p>
                          </div>
                        </div>
                      )}

                      {/* Endereço */}
                      {(userData.endereco || userData.bairro) && (
                        <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                          <MapPin className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-500 uppercase tracking-wide">Endereço</p>
                            <p className="text-sm font-medium text-gray-900 break-words">
                              {userData.endereco && `${userData.endereco}`}
                              {userData.numero && `, ${userData.numero}`}
                              {userData.complemento && ` - ${userData.complemento}`}
                              {userData.bairro && ` - ${userData.bairro}`}
                              {userData.cidade_fk && `, ${userData.cidade_fk}`}
                              {userData.estado_fk && ` - ${userData.estado_fk}`}
                              {userData.cep && ` • CEP: ${userData.cep}`}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Botões para proprietários */}
                      {userData.userType === 'proprietario' && (
                        <div className="pt-4 border-t border-gray-200">
                          <div className="flex flex-col sm:flex-row gap-3">
                            <button
                              onClick={() => {
                                onClose()
                                setTimeout(() => {
                                  window.location.href = '/admin/imoveis/novo?noSidebar=true'
                                }, 100)
                              }}
                              className="flex-1 px-5 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white text-sm font-medium rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                            >
                              <Building2 className="w-4 h-4" />
                              Cadastrar Imóvel
                            </button>
                            <button
                              onClick={handleVerImoveis}
                              className="flex-1 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                            >
                              <Home className="w-4 h-4" />
                              Imóveis Cadastrados
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Botão para clientes */}
                      {userData.userType === 'cliente' && (
                        <div className="pt-4 border-t border-gray-200">
                          <button
                            onClick={handleVerImoveisInteresse}
                            className="w-full px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white text-sm font-medium rounded-lg hover:from-blue-700 hover:to-indigo-800 transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                          >
                            <Home className="w-4 h-4" />
                            Imóveis de meu interesse
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Formulário de edição */}
                  {isEditing && (
                    <form onSubmit={handleSubmit} className="space-y-6">
                      {/* Informações Pessoais */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Nome */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nome Completo *
                          </label>
                          <input
                            name="nome"
                            type="text"
                            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              errors.nome ? 'border-red-500 bg-red-50' : 'border-gray-300'
                            }`}
                            value={formData.nome}
                            onChange={handleChange}
                          />
                          {errors.nome && <p className="text-red-500 text-sm mt-1">{errors.nome}</p>}
                        </div>

                        {/* CPF (não editável) */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            CPF
                          </label>
                          <input
                            type="text"
                            disabled
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                            value={userData.cpf ? formatCPF(userData.cpf) : ''}
                          />
                        </div>

                        {/* Email */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email *
                          </label>
                          <div className="relative">
                            <input
                              name="email"
                              type="email"
                              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                errors.email || emailExists ? 'border-red-500 bg-red-50' : 'border-gray-300'
                              }`}
                              value={formData.email}
                              onChange={handleChange}
                            />
                            {emailPendingValidation && (
                              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                              </div>
                            )}
                            {emailExists && !emailPendingValidation && (
                              <p className="text-red-500 text-sm mt-1">Email já cadastrado</p>
                            )}
                          </div>
                          {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                        </div>

                        {/* Telefone */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Telefone *
                          </label>
                          <input
                            name="telefone"
                            type="text"
                            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              errors.telefone ? 'border-red-500 bg-red-50' : 'border-gray-300'
                            }`}
                            value={formData.telefone}
                            onChange={handleChange}
                          />
                          {errors.telefone && <p className="text-red-500 text-sm mt-1">{errors.telefone}</p>}
                        </div>
                      </div>

                      {/* Endereço */}
                      <div className="border-t pt-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Endereço</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* CEP */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              CEP *
                            </label>
                            <div className="relative">
                              <input
                                name="cep"
                                type="text"
                                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                  errors.cep ? 'border-red-500 bg-red-50' : 'border-gray-300'
                                }`}
                                value={formData.cep}
                                onChange={handleChange}
                              />
                              {buscandoCep && (
                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                </div>
                              )}
                            </div>
                            {errors.cep && <p className="text-red-500 text-sm mt-1">{errors.cep}</p>}
                          </div>

                          {/* Endereço */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Endereço *
                            </label>
                            <input
                              name="endereco"
                              type="text"
                              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                errors.endereco ? 'border-red-500 bg-red-50' : 'border-gray-300'
                              }`}
                              value={formData.endereco}
                              onChange={handleChange}
                            />
                            {errors.endereco && <p className="text-red-500 text-sm mt-1">{errors.endereco}</p>}
                          </div>

                          {/* Número */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Número *
                            </label>
                            <input
                              name="numero"
                              type="text"
                              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                errors.numero ? 'border-red-500 bg-red-50' : 'border-gray-300'
                              }`}
                              value={formData.numero}
                              onChange={handleChange}
                            />
                            {errors.numero && <p className="text-red-500 text-sm mt-1">{errors.numero}</p>}
                          </div>

                          {/* Complemento */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Complemento
                            </label>
                            <input
                              name="complemento"
                              type="text"
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              value={formData.complemento}
                              onChange={handleChange}
                            />
                          </div>

                          {/* Bairro */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Bairro *
                            </label>
                            <input
                              name="bairro"
                              type="text"
                              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                errors.bairro ? 'border-red-500 bg-red-50' : 'border-gray-300'
                              }`}
                              value={formData.bairro}
                              onChange={handleChange}
                            />
                            {errors.bairro && <p className="text-red-500 text-sm mt-1">{errors.bairro}</p>}
                          </div>

                          {/* Estado */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Estado *
                            </label>
                            <select
                              name="estado_fk"
                              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                errors.estado_fk ? 'border-red-500 bg-red-50' : 'border-gray-300'
                              }`}
                              value={formData.estado_fk}
                              onChange={handleChange}
                            >
                              <option value="">Selecione o estado</option>
                              {estados.map((estado) => (
                                <option key={estado.id} value={estado.sigla}>
                                  {estado.nome}
                                </option>
                              ))}
                            </select>
                            {errors.estado_fk && <p className="text-red-500 text-sm mt-1">{errors.estado_fk}</p>}
                          </div>

                          {/* Cidade */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Cidade *
                            </label>
                            <select
                              name="cidade_fk"
                              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                errors.cidade_fk ? 'border-red-500 bg-red-50' : 'border-gray-300'
                              }`}
                              value={formData.cidade_fk}
                              onChange={handleChange}
                              disabled={!formData.estado_fk}
                            >
                              <option value="">Selecione a cidade</option>
                              {cidades.map((cidade) => (
                                <option key={cidade.id} value={cidade.nome}>
                                  {cidade.nome}
                                </option>
                              ))}
                            </select>
                            {errors.cidade_fk && <p className="text-red-500 text-sm mt-1">{errors.cidade_fk}</p>}
                          </div>

                          {/* Senha */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Nova Senha (opcional)
                            </label>
                            <input
                              name="password"
                              type="password"
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              value={formData.password}
                              onChange={handleChange}
                              placeholder="Deixe em branco para manter a senha atual"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Botões */}
                      <div className="flex items-center justify-end gap-3 pt-4 border-t">
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditing(false)
                            setErrors({})
                            setError('')
                            setSuccessMessage('')
                            // Reset form data to userData
                            setFormData({
                              nome: userData.nome || '',
                              email: userData.email || '',
                              telefone: userData.telefone || '',
                              estado_fk: userData.estado_fk || '',
                              cidade_fk: userData.cidade_fk || '',
                              cep: userData.cep || '',
                              endereco: userData.endereco || '',
                              bairro: userData.bairro || '',
                              numero: userData.numero || '',
                              complemento: userData.complemento || '',
                              password: ''
                            })
                          }}
                          className="px-5 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={saving}
                          className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {saving ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              Salvando...
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4" />
                              Salvar Alterações
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Modal de Imóveis Cadastrados */}
      {showImoveisModal && (
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
                        <>
                          <tr 
                            key={imovel.id || index} 
                            className={`transition-all duration-200 ${
                              index % 2 === 0 
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
                          <tr className={`transition-all duration-200 border-t border-gray-200/50 ${
                            index % 2 === 0 
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
                        </>
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
      )}

      {/* Modal de Imóveis de Interesse (Clientes) */}
      {showInteresseModal && (
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
                        <th className="px-2 py-3 text-left text-xs font-bold text-white uppercase tracking-wider rounded-tr-xl">Data de Interesse</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {imoveisInteresse.map((item: any, index: number) => (
                        <React.Fragment key={item.id || `interesse-${index}`}>
                          <tr 
                            className={`transition-all duration-200 ${
                              index % 2 === 0 
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
                            <td className="px-2 py-2.5 text-sm text-gray-900">{item.varanda ? 'Sim' : 'Não'}</td>
                            <td className="px-2 py-2.5 text-sm text-gray-900">{formatNumber(item.andar)}</td>
                            <td className="px-2 py-2.5 text-sm text-gray-900">{formatNumber(item.total_andares)}</td>
                            <td className="px-2 py-2.5 text-sm text-gray-900">{formatDate(item.created_at)}</td>
                          </tr>
                          {/* Linha de endereço completo */}
                          <tr className={`transition-all duration-200 border-t border-gray-200/50 ${
                            index % 2 === 0 
                              ? 'bg-gradient-to-r from-gray-50/70 to-blue-50/40' 
                              : 'bg-gray-50/40'
                          }`}>
                            <td colSpan={16} className="px-4 py-2.5 text-sm text-gray-700">
                              <div className="flex items-center gap-2">
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
                  onClick={() => setShowInteresseModal(false)}
                  className="px-6 py-2.5 bg-gradient-to-r from-gray-600 to-gray-700 text-white text-sm font-medium rounded-lg hover:from-gray-700 hover:to-gray-800 transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

