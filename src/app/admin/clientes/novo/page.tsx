'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeftIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { useEstadosCidades } from '@/hooks/useEstadosCidades'
import { buscarEnderecoPorCep } from '@/lib/utils/geocoding'
import EstadoSelect from '@/components/shared/EstadoSelect'

interface FormData {
  nome: string
  cpf: string
  telefone: string
  email: string
  estado: string
  cidade: string
  cep: string
  endereco: string
  bairro: string
  numero: string
  complemento: string
}

type ValidationErrors = Partial<Record<keyof FormData, string>>

export default function NovoClientePage() {
  const { get, post, put, delete: del } = useAuthenticatedFetch()
  const router = useRouter()
  const { user } = useAuth()
  const {
    estados,
    municipios,
    loadMunicipios,
    loading: loadingLocais
  } = useEstadosCidades('all')
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState<FormData>({
    nome: '',
    cpf: '',
    telefone: '',
    email: '',
    estado: '',
    cidade: '',
    cep: '',
    endereco: '',
    bairro: '',
    numero: '',
    complemento: ''
  })

  const [errors, setErrors] = useState<ValidationErrors>({})
  const [cpfValidating, setCpfValidating] = useState(false)
  const [cpfExists, setCpfExists] = useState(false)
  const [cpfPendingValidation, setCpfPendingValidation] = useState(false)
  const [emailValidating, setEmailValidating] = useState(false)
  const [emailExists, setEmailExists] = useState(false)
  const [emailPendingValidation, setEmailPendingValidation] = useState(false)
  const [buscandoCep, setBuscandoCep] = useState(false)

  // Carregar municípios quando estado mudar
  useEffect(() => {
    if (formData.estado) {
      loadMunicipios(formData.estado)
    }
  }, [formData.estado, loadMunicipios])

  // Buscar endereço automaticamente quando CEP for informado (8 dígitos)
  useEffect(() => {
    const cep = formData.cep
    if (!cep) return

    const cepLimpo = cep.replace(/\D/g, '')
    if (cepLimpo.length !== 8) return

    const buscarEndereco = async () => {
      setBuscandoCep(true)
      console.log('🔍 Buscando endereço para CEP:', cepLimpo)

      try {
        const enderecoData = await buscarEnderecoPorCep(cepLimpo)

        if (enderecoData) {
          console.log('✅ Endereço encontrado:', enderecoData)

          // Encontrar estado pela sigla (o hook usa sigla como id no modo 'all')
          const estadoEncontrado = estados.find(e => e.sigla === enderecoData.uf)

          setFormData(prev => ({
            ...prev,
            endereco: enderecoData.logradouro || '',
            bairro: enderecoData.bairro || '',
            estado: estadoEncontrado?.id || '',
            cidade: '', // Será selecionado após municípios carregarem
            numero: '' // Limpar número ao trocar CEP
          }))

          // Aguardar carregar municípios e então selecionar a cidade
          setTimeout(() => {
            setFormData(prev => {
              // Recarregar municípios para o estado
              const municipioEncontrado = municipios.find(m => m.nome === enderecoData.localidade)
              return {
                ...prev,
                cidade: municipioEncontrado?.id || ''
              }
            })
          }, 500)
        } else {
          console.log('⚠️ CEP não encontrado')
        }
      } catch (error) {
        console.error('❌ Erro ao buscar CEP:', error)
      } finally {
        setBuscandoCep(false)
      }
    }

    // Debounce de 500ms
    const timeoutId = setTimeout(buscarEndereco, 500)
    return () => clearTimeout(timeoutId)
  }, [formData.cep, estados, municipios])

  // Verificar Email com debounce (igual ao CEP)
  useEffect(() => {
    const email = formData.email
    if (!email) {
      setEmailExists(false)
      setEmailPendingValidation(false)
      return
    }

    if (!validateEmail(email)) {
      setEmailExists(false)
      setEmailPendingValidation(false)
      return
    }

    // Marcar que há validação pendente (durante o debounce)
    setEmailPendingValidation(true)

    const verificarEmail = async () => {
      setEmailValidating(true)
      console.log('🔍 CLIENT-SIDE: Verificando email:', email)

      try {
        const emailLimpo = email.trim().toLowerCase()
        const response = await post('/api/admin/clientes/verificar-email', { email: emailLimpo })

        if (response.ok) {
          const data = await response.json()
          console.log('✅ CLIENT-SIDE: Resultado email exists:', data.exists)
          setEmailExists(data.exists)
        }
      } catch (error) {
        console.error('❌ Erro ao verificar Email:', error)
      } finally {
        setEmailValidating(false)
        // Validação concluída
        setEmailPendingValidation(false)
      }
    }

    // Debounce de 800ms (maior que o CEP para dar tempo do usuário terminar)
    const timeoutId = setTimeout(verificarEmail, 800)
    return () => clearTimeout(timeoutId)
  }, [formData.email, post])

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

  // Verificar CPF em tempo real
  const checkCPFExists = async (cpf: string) => {
    if (!cpf || !validateCPF(cpf)) {
      setCpfPendingValidation(false)
      return
    }

    // Marcar que há validação pendente
    setCpfPendingValidation(true)

    try {
      setCpfValidating(true)
      // Enviar CPF formatado (com pontos e traço) pois o banco armazena assim
      const response = await post('/api/admin/clientes/verificar-cpf', { cpf })

      if (response.ok) {
        const data = await response.json()
        setCpfExists(data.exists)
      }
    } catch (error) {
      console.error('Erro ao verificar CPF:', error)
    } finally {
      setCpfValidating(false)
      // Validação concluída
      setCpfPendingValidation(false)
    }
  }

  // Verificar Email com debounce usando useEffect (abaixo)

  // Manipular mudanças nos campos
  const handleInputChange = (field: keyof FormData, value: string) => {
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
        if (formattedValue && !validateCPF(formattedValue)) {
          newErrors.cpf = 'CPF inválido'
        } else {
          delete newErrors.cpf
        }
        // Verificar se CPF já existe (enviar valor FORMATADO)
        if (formattedValue && validateCPF(formattedValue)) {
          checkCPFExists(formattedValue)
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
        if (formattedValue && !validateEmail(formattedValue)) {
          newErrors.email = 'Email inválido'
        } else {
          delete newErrors.email
        }
        // A verificação de duplicidade é feita pelo useEffect acima
        break
    }

    setErrors(newErrors)
  }

  // Prevenir avanço com Tab/Enter quando há erros ou duplicidade
  const handleKeyDown = (e: React.KeyboardEvent, field: keyof FormData) => {
    // Bloquear se houver erro de validação
    if ((e.key === 'Tab' || e.key === 'Enter') && errors[field]) {
      e.preventDefault()
      return
    }

    // Bloquear campos obrigatórios vazios
    if (e.key === 'Tab' || e.key === 'Enter') {
      switch (field) {
        case 'nome':
          if (!formData.nome || formData.nome.trim().length === 0) {
            e.preventDefault()
            return
          }
          break
        case 'cpf':
          const cpfLimpo = formData.cpf.replace(/\D/g, '')
          // Bloquear se: vazio, validando, existe, pendente validação, incompleto ou inválido
          if (!formData.cpf || cpfValidating || cpfExists || cpfPendingValidation ||
            cpfLimpo.length !== 11 || !validateCPF(formData.cpf)) {
            e.preventDefault()
            return
          }
          break
        case 'telefone':
          if (!formData.telefone) {
            e.preventDefault()
            return
          }
          break
        case 'email':
          // Bloquear se: vazio, validando, existe, pendente validação ou inválido
          if (!formData.email || emailValidating || emailExists || emailPendingValidation ||
            !validateEmail(formData.email)) {
            e.preventDefault()
            return
          }
          break
        case 'cep':
          const cepLimpo = formData.cep.replace(/\D/g, '')
          if (!formData.cep || cepLimpo.length !== 8) {
            e.preventDefault()
            return
          }
          break
        case 'endereco':
          if (!formData.endereco) {
            e.preventDefault()
            return
          }
          break
        case 'bairro':
          if (!formData.bairro) {
            e.preventDefault()
            return
          }
          break
        case 'numero':
          if (!formData.numero) {
            e.preventDefault()
            return
          }
          break
        case 'estado':
          if (!formData.estado) {
            e.preventDefault()
            return
          }
          break
        case 'cidade':
          if (!formData.cidade) {
            e.preventDefault()
            return
          }
          break
      }
    }
  }

  // Submissão do formulário
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

    if (!formData.cep || formData.cep.replace(/\D/g, '').length !== 8) {
      finalErrors.cep = 'CEP é obrigatório e deve ter 8 dígitos'
    }

    if (!formData.endereco || formData.endereco.trim().length === 0) {
      finalErrors.endereco = 'Endereço é obrigatório'
    }

    if (!formData.bairro || formData.bairro.trim().length === 0) {
      finalErrors.bairro = 'Bairro é obrigatório'
    }

    if (!formData.numero || formData.numero.trim().length === 0) {
      finalErrors.numero = 'Número é obrigatório'
    }

    if (!formData.estado) {
      finalErrors.estado = 'Estado é obrigatório'
    }

    if (!formData.cidade) {
      finalErrors.cidade = 'Cidade é obrigatória'
    }

    if (cpfExists) {
      finalErrors.cpf = 'CPF já cadastrado'
    }

    if (emailExists) {
      finalErrors.email = 'Email já cadastrado'
    }

    if (Object.keys(finalErrors).length > 0) {
      setErrors(finalErrors)
      return
    }

    try {
      setSaving(true)

      // Buscar SIGLA do estado e NOME da cidade
      const estadoSigla = formData.estado // O ID é a sigla no hook
      const cidadeNome = formData.cidade // O ID é o nome no hook

      console.log('🔍 DEBUG Submit:', {
        'formData.estado': formData.estado,
        'formData.cidade': formData.cidade,
        'estados.length': estados.length,
        'municipios.length': municipios.length,
        'estadoSigla': estadoSigla,
        'cidadeNome': cidadeNome
      })

      // Validar se conseguiu encontrar os nomes
      if (!estadoSigla) {
        alert('Erro: Estado não encontrado. Por favor, selecione o estado novamente.')
        setSaving(false)
        return
      }

      if (!cidadeNome) {
        alert('Erro: Cidade não encontrada. Por favor, selecione a cidade novamente.')
        setSaving(false)
        return
      }

      const payload = {
        nome: formData.nome,
        cpf: formData.cpf,
        telefone: formData.telefone,
        email: formData.email,
        endereco: formData.endereco,
        numero: formData.numero,
        bairro: formData.bairro,
        complemento: formData.complemento || null,
        estado_fk: estadoSigla,
        cidade_fk: cidadeNome,
        cep: formData.cep,
        created_by: user?.nome || 'system'
      }

      console.log('📤 Enviando payload:', payload)

      const response = await fetch('/api/admin/clientes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        router.push('/admin/clientes')
      } else {
        const errorData = await response.json()
        alert(`Erro: ${errorData.error}`)
      }
    } catch (error) {
      console.error('Erro ao criar cliente:', error)
      alert('Erro ao criar cliente')
    } finally {
      setSaving(false)
    }
  }

  if (loadingLocais) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando locais...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Link
              href="/admin/clientes"
              className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5 mr-2" />
              Voltar para Clientes
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Novo Cliente</h1>
          <p className="mt-2 text-gray-600">Preencha os dados do novo cliente</p>
        </div>

        {/* Formulário */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200">
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {/* Nome */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome Completo *
              </label>
              <input
                type="text"
                value={formData.nome}
                onChange={(e) => handleInputChange('nome', e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, 'nome')}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${errors.nome ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                placeholder="Digite o nome completo"
              />
              {errors.nome && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <XMarkIcon className="h-4 w-4 mr-1" />
                  {errors.nome}
                </p>
              )}
            </div>

            {/* CPF e Telefone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CPF *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.cpf}
                    onChange={(e) => handleInputChange('cpf', e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, 'cpf')}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${errors.cpf ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                    placeholder="000.000.000-00"
                    maxLength={14}
                  />
                  {cpfValidating && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    </div>
                  )}
                  {formData.cpf && !cpfValidating && validateCPF(formData.cpf) && !cpfExists && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <CheckIcon className="h-5 w-5 text-green-500" />
                    </div>
                  )}
                </div>
                {errors.cpf && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <XMarkIcon className="h-4 w-4 mr-1" />
                    {errors.cpf}
                  </p>
                )}
                {cpfExists && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <XMarkIcon className="h-4 w-4 mr-1" />
                    CPF já cadastrado
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telefone *
                </label>
                <input
                  type="text"
                  value={formData.telefone}
                  onChange={(e) => handleInputChange('telefone', e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, 'telefone')}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${errors.telefone ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                />
                {errors.telefone && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <XMarkIcon className="h-4 w-4 mr-1" />
                    {errors.telefone}
                  </p>
                )}
              </div>
            </div>

            {/* Estado e Cidade */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estado *
                </label>
                <EstadoSelect
                  value={formData.estado}
                  onChange={(estadoId) => handleInputChange('estado', estadoId)}
                  placeholder="Selecione o estado"
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${errors.estado ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                  format="sigla-nome"
                  showAllOption={true}
                  allOptionLabel="Selecione o estado"
                />
                {errors.estado && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <XMarkIcon className="h-4 w-4 mr-1" />
                    {errors.estado}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cidade *
                </label>
                <select
                  value={formData.cidade}
                  onChange={(e) => handleInputChange('cidade', e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, 'cidade')}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${errors.cidade ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                  disabled={!formData.estado}
                >
                  <option value="">Selecione a cidade</option>
                  {municipios.map(municipio => (
                    <option key={municipio.id} value={municipio.id}>
                      {municipio.nome}
                    </option>
                  ))}
                </select>
                {errors.cidade && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <XMarkIcon className="h-4 w-4 mr-1" />
                    {errors.cidade}
                  </p>
                )}
              </div>
            </div>

            {/* CEP - OBRIGATÓRIO (busca automática) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CEP *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.cep}
                  onChange={(e) => handleInputChange('cep', e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, 'cep')}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${errors.cep ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                  placeholder="00000-000"
                  maxLength={9}
                  required
                />
                {buscandoCep && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  </div>
                )}
              </div>
              {errors.cep && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <XMarkIcon className="h-4 w-4 mr-1" />
                  {errors.cep}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                {buscandoCep ? 'Buscando endereço...' : 'Informe o CEP para preencher automaticamente'}
              </p>
            </div>

            {/* Endereço (preenchido automaticamente) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Endereço *
              </label>
              <input
                type="text"
                value={formData.endereco}
                onChange={(e) => handleInputChange('endereco', e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, 'endereco')}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${errors.endereco ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-gray-50'
                  }`}
                placeholder="Será preenchido automaticamente"
              />
              {errors.endereco && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <XMarkIcon className="h-4 w-4 mr-1" />
                  {errors.endereco}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">Preenchido automaticamente pelo CEP</p>
            </div>

            {/* Bairro (preenchido automaticamente) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bairro *
              </label>
              <input
                type="text"
                value={formData.bairro}
                onChange={(e) => handleInputChange('bairro', e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, 'bairro')}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${errors.bairro ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-gray-50'
                  }`}
                placeholder="Será preenchido automaticamente"
              />
              {errors.bairro && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <XMarkIcon className="h-4 w-4 mr-1" />
                  {errors.bairro}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">Preenchido automaticamente pelo CEP</p>
            </div>

            {/* Número e Complemento */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número *
                </label>
                <input
                  type="text"
                  value={formData.numero}
                  onChange={(e) => handleInputChange('numero', e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, 'numero')}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${errors.numero ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                  placeholder="123"
                />
                {errors.numero && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <XMarkIcon className="h-4 w-4 mr-1" />
                    {errors.numero}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Complemento
                </label>
                <input
                  type="text"
                  value={formData.complemento}
                  onChange={(e) => handleInputChange('complemento', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Apto, Bloco, etc"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email *
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, 'email')}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${errors.email || emailExists ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                  placeholder="exemplo@email.com"
                />
                {emailValidating && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  </div>
                )}
                {formData.email && !emailValidating && validateEmail(formData.email) && !emailExists && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <CheckIcon className="h-5 w-5 text-green-500" />
                  </div>
                )}
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <XMarkIcon className="h-4 w-4 mr-1" />
                  {errors.email}
                </p>
              )}
              {emailExists && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <XMarkIcon className="h-4 w-4 mr-1" />
                  Email já cadastrado
                </p>
              )}
            </div>

            {/* Botões */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <Link
                href="/admin/clientes"
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={saving || Object.keys(errors).length > 0 || cpfExists || emailExists}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Salvando...' : 'Salvar Cliente'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
