'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { usePermissions } from '@/hooks/usePermissions'

interface Cliente {
  id: number
  nome: string
  cpf: string
  telefone: string
  endereco?: string
  numero?: string
  bairro?: string
  email: string
  estado_fk?: string
  cidade_fk?: string
  cep?: string
}

interface ValidationErrors {
  [key: string]: string
}

export default function EditarClientePage() {
  const router = useRouter()
  const params = useParams()
  const { user } = useAuth()
  const { hasPermission } = usePermissions()
  
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cliente, setCliente] = useState<Cliente | null>(null)
  
  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    telefone: '',
    email: '',
    endereco: '',
    numero: '',
    bairro: '',
    estado: '',
    cidade: '',
    cep: ''
  })
  
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [cpfValidating, setCpfValidating] = useState(false)
  const [cpfExists, setCpfExists] = useState(false)
  const [estadosCidades, setEstadosCidades] = useState({
    estados: [] as Array<{id: string, sigla: string, nome: string}>,
    municipios: [] as Array<{id: string, nome: string}>
  })

  // Verificar permissões
  useEffect(() => {
    if (!user) {
      router.push('/admin/login')
      return
    }

    if (!hasPermission('clientes', 'WRITE')) {
      router.push('/admin')
      return
    }
  }, [user, hasPermission, router])

  // Carregar dados do cliente
  useEffect(() => {
    const loadCliente = async () => {
      if (!params.id) return
      
      try {
        setLoading(true)
        const response = await fetch(`/api/admin/clientes/${params.id}`)
        
        if (!response.ok) {
          throw new Error('Cliente não encontrado')
        }
        
        const clienteData = await response.json()
        setCliente(clienteData)
        
        // Preencher formulário com dados do cliente
        setFormData({
          nome: clienteData.nome || '',
          cpf: clienteData.cpf || '',
          telefone: clienteData.telefone || '',
          email: clienteData.email || '',
          endereco: clienteData.endereco || '',
          numero: clienteData.numero || '',
          bairro: clienteData.bairro || '',
          estado: '', // Será preenchido baseado no estado_fk
          cidade: '', // Será preenchido baseado no cidade_fk
          cep: clienteData.cep || ''
        })
        
      } catch (err) {
        console.error('Erro ao carregar cliente:', err)
        setError('Erro ao carregar dados do cliente')
      } finally {
        setLoading(false)
      }
    }

    loadCliente()
  }, [params.id])

  // Carregar estados
  useEffect(() => {
    const loadEstados = async () => {
      try {
        const municipiosData = await import('@/lib/admin/municipios.json')
        const estadosComId = municipiosData.estados?.map((estado, index) => ({
          id: index.toString(),
          sigla: estado.sigla,
          nome: estado.nome
        })) || []
        setEstadosCidades(prev => ({ ...prev, estados: estadosComId }))
      } catch (err) {
        console.error('Erro ao carregar estados:', err)
      }
    }
    loadEstados()
  }, [])

  // Carregar municípios quando estado mudar
  useEffect(() => {
    const loadMunicipios = async () => {
      if (formData.estado) {
        try {
          const municipiosData = await import('@/lib/admin/municipios.json')
          const estadoIndex = parseInt(formData.estado)
          const estadoSelecionado = municipiosData.estados?.[estadoIndex]
          const municipiosDoEstado = estadoSelecionado?.municipios?.map((municipio: string, index: number) => ({
            id: index.toString(),
            nome: municipio
          })) || []
          setEstadosCidades(prev => ({ ...prev, municipios: municipiosDoEstado }))
        } catch (err) {
          console.error('Erro ao carregar municípios:', err)
        }
      } else {
        setEstadosCidades(prev => ({ ...prev, municipios: [] }))
      }
    }

    loadMunicipios()
  }, [formData.estado])

  // Encontrar estado e cidade baseado nos dados do cliente
  useEffect(() => {
    if (cliente && estadosCidades.estados.length > 0) {
      // Encontrar estado pelo nome
      const estadoEncontrado = estadosCidades.estados.find(e => e.nome === cliente.estado_fk)
      if (estadoEncontrado) {
        setFormData(prev => ({ ...prev, estado: estadoEncontrado.id }))
      }
    }
  }, [cliente, estadosCidades.estados])

  useEffect(() => {
    if (cliente && formData.estado && estadosCidades.municipios.length > 0) {
      // Encontrar cidade pelo nome
      const cidadeEncontrada = estadosCidades.municipios.find(m => m.nome === cliente.cidade_fk)
      if (cidadeEncontrada) {
        setFormData(prev => ({ ...prev, cidade: cidadeEncontrada.id }))
      }
    }
  }, [cliente, formData.estado, estadosCidades.municipios])

  // Validação de CPF
  const validateCPF = (cpf: string): boolean => {
    const cleanCPF = cpf.replace(/\D/g, '')
    
    if (cleanCPF.length !== 11) return false
    if (/^(\d)\1{10}$/.test(cleanCPF)) return false
    
    let sum = 0
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cleanCPF.charAt(i)) * (10 - i)
    }
    let remainder = sum % 11
    let firstDigit = remainder < 2 ? 0 : 11 - remainder
    
    if (parseInt(cleanCPF.charAt(9)) !== firstDigit) return false
    
    sum = 0
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cleanCPF.charAt(i)) * (11 - i)
    }
    remainder = sum % 11
    let secondDigit = remainder < 2 ? 0 : 11 - remainder
    
    return parseInt(cleanCPF.charAt(10)) === secondDigit
  }

  // Validação de telefone
  const validateTelefone = (telefone: string): boolean => {
    const cleanTelefone = telefone.replace(/\D/g, '')
    return cleanTelefone.length === 10 || cleanTelefone.length === 11
  }

  // Validação de email
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // Formatação de CPF
  const formatCPF = (value: string): string => {
    const cleanValue = value.replace(/\D/g, '')
    return cleanValue.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }

  // Formatação de telefone
  const formatTelefone = (value: string): string => {
    const cleanValue = value.replace(/\D/g, '')
    if (cleanValue.length <= 10) {
      return cleanValue.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
    } else {
      return cleanValue.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
    }
  }

  // Formatação de CEP
  const formatCEP = (value: string): string => {
    const cleanValue = value.replace(/\D/g, '')
    return cleanValue.replace(/(\d{5})(\d{3})/, '$1-$2')
  }

  // Verificar se CPF já existe
  const checkCPFExists = async (cpf: string) => {
    if (!cpf || !validateCPF(cpf)) return
    
    try {
      setCpfValidating(true)
      const response = await fetch(`/api/admin/clientes/verificar-cpf?cpf=${cpf}&excludeId=${params.id}`)
      const data = await response.json()
      setCpfExists(data.exists)
    } catch (error) {
      console.error('Erro ao verificar CPF:', error)
    } finally {
      setCpfValidating(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    let formattedValue = value

    // Formatação específica por campo
    switch (field) {
      case 'cpf':
        formattedValue = formatCPF(value)
        break
      case 'telefone':
        formattedValue = formatTelefone(value)
        break
      case 'cep':
        formattedValue = formatCEP(value)
        break
      case 'estado':
        // Reset cidade quando estado muda
        setFormData(prev => ({ ...prev, estado: value, cidade: '' }))
        return
    }

    setFormData(prev => ({ ...prev, [field]: formattedValue }))

    // Validação em tempo real
    const newErrors = { ...errors }
    
    switch (field) {
      case 'nome':
        if (value.length < 2) {
          newErrors.nome = 'Nome deve ter pelo menos 2 caracteres'
        } else {
          delete newErrors.nome
        }
        break
      case 'cpf':
        if (value && !validateCPF(value)) {
          newErrors.cpf = 'CPF inválido'
        } else {
          delete newErrors.cpf
        }
        // Verificar se CPF já existe
        if (value && validateCPF(value)) {
          checkCPFExists(value)
        }
        break
      case 'telefone':
        if (value && !validateTelefone(value)) {
          newErrors.telefone = 'Telefone deve ter 10 ou 11 dígitos'
        } else {
          delete newErrors.telefone
        }
        break
      case 'email':
        if (value && !validateEmail(value)) {
          newErrors.email = 'Email inválido'
        } else {
          delete newErrors.email
        }
        break
    }

    setErrors(newErrors)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validações finais
    const finalErrors: ValidationErrors = {}
    
    if (!formData.nome || formData.nome.length < 2) {
      finalErrors.nome = 'Nome é obrigatório'
    }
    
    if (!formData.cpf || !validateCPF(formData.cpf)) {
      finalErrors.cpf = 'CPF é obrigatório e deve ser válido'
    }
    
    if (!formData.telefone || !validateTelefone(formData.telefone)) {
      finalErrors.telefone = 'Telefone é obrigatório'
    }
    
    if (!formData.email || !validateEmail(formData.email)) {
      finalErrors.email = 'Email é obrigatório e deve ser válido'
    }

    if (cpfExists) {
      finalErrors.cpf = 'CPF já cadastrado'
    }

    if (Object.keys(finalErrors).length > 0) {
      setErrors(finalErrors)
      return
    }

    try {
      setSaving(true)
      
      const response = await fetch(`/api/admin/clientes/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nome: formData.nome,
          cpf: formData.cpf,
          telefone: formData.telefone,
          email: formData.email,
          endereco: formData.endereco,
          numero: formData.numero,
          bairro: formData.bairro,
          estado_fk: formData.estado ? estadosCidades.estados.find(e => e.id === formData.estado)?.nome || null : null,
          cidade_fk: formData.cidade ? estadosCidades.municipios.find(m => m.id === formData.cidade)?.nome || null : null,
          cep: formData.cep,
          updated_by: user?.nome || 'system'
        })
      })

      if (response.ok) {
        router.push('/admin/clientes')
      } else {
        const errorData = await response.json()
        alert(`Erro: ${errorData.error}`)
      }
    } catch (error) {
      console.error('Erro ao atualizar cliente:', error)
      alert('Erro ao atualizar cliente')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando dados do cliente...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">❌</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/admin/clientes')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Voltar para Lista
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Editar Cliente</h1>
        <p className="text-gray-600">Atualize as informações do cliente</p>
      </div>

      <form onSubmit={handleSubmit} className="p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Nome */}
          <div>
            <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-2">
              Nome *
            </label>
            <input
              type="text"
              id="nome"
              value={formData.nome}
              onChange={(e) => handleInputChange('nome', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.nome ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Nome completo"
            />
            {errors.nome && <p className="text-red-500 text-sm mt-1">{errors.nome}</p>}
          </div>

          {/* CPF */}
          <div>
            <label htmlFor="cpf" className="block text-sm font-medium text-gray-700 mb-2">
              CPF *
            </label>
            <input
              type="text"
              id="cpf"
              value={formData.cpf}
              onChange={(e) => handleInputChange('cpf', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.cpf ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="000.000.000-00"
              maxLength={14}
            />
            {errors.cpf && <p className="text-red-500 text-sm mt-1">{errors.cpf}</p>}
            {cpfValidating && <p className="text-blue-500 text-sm mt-1">Verificando CPF...</p>}
          </div>

          {/* Telefone */}
          <div>
            <label htmlFor="telefone" className="block text-sm font-medium text-gray-700 mb-2">
              Telefone *
            </label>
            <input
              type="text"
              id="telefone"
              value={formData.telefone}
              onChange={(e) => handleInputChange('telefone', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.telefone ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="(00) 00000-0000"
              maxLength={15}
            />
            {errors.telefone && <p className="text-red-500 text-sm mt-1">{errors.telefone}</p>}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email *
            </label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="email@exemplo.com"
            />
            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
          </div>

          {/* Estado */}
          <div>
            <label htmlFor="estado" className="block text-sm font-medium text-gray-700 mb-2">
              Estado
            </label>
            <select
              id="estado"
              value={formData.estado}
              onChange={(e) => handleInputChange('estado', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione o estado</option>
              {estadosCidades.estados.map(estado => (
                <option key={estado.id} value={estado.id}>
                  {estado.sigla} - {estado.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Cidade */}
          <div>
            <label htmlFor="cidade" className="block text-sm font-medium text-gray-700 mb-2">
              Cidade
            </label>
            <select
              id="cidade"
              value={formData.cidade}
              onChange={(e) => handleInputChange('cidade', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!formData.estado}
            >
              <option value="">Selecione a cidade</option>
              {estadosCidades.municipios.map(municipio => (
                <option key={municipio.id} value={municipio.id}>
                  {municipio.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Endereço */}
          <div>
            <label htmlFor="endereco" className="block text-sm font-medium text-gray-700 mb-2">
              Endereço
            </label>
            <input
              type="text"
              id="endereco"
              value={formData.endereco}
              onChange={(e) => handleInputChange('endereco', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Rua, Avenida, etc."
            />
          </div>

          {/* Número */}
          <div>
            <label htmlFor="numero" className="block text-sm font-medium text-gray-700 mb-2">
              Número
            </label>
            <input
              type="text"
              id="numero"
              value={formData.numero}
              onChange={(e) => handleInputChange('numero', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="123"
            />
          </div>

          {/* Bairro */}
          <div>
            <label htmlFor="bairro" className="block text-sm font-medium text-gray-700 mb-2">
              Bairro
            </label>
            <input
              type="text"
              id="bairro"
              value={formData.bairro}
              onChange={(e) => handleInputChange('bairro', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nome do bairro"
            />
          </div>

          {/* CEP */}
          <div>
            <label htmlFor="cep" className="block text-sm font-medium text-gray-700 mb-2">
              CEP
            </label>
            <input
              type="text"
              id="cep"
              value={formData.cep}
              onChange={(e) => handleInputChange('cep', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="00000-000"
              maxLength={9}
            />
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => router.push('/admin/clientes')}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </form>
    </div>
  )
}
