'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { usePermissions } from '@/hooks/usePermissions'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { buscarEnderecoPorCep } from '@/lib/utils/geocoding'
import EstadoSelect from '@/components/shared/EstadoSelect'

interface Proprietario {
  uuid: string
  nome: string
  cpf?: string
  cnpj?: string
  telefone: string
  endereco?: string
  numero?: string
  bairro?: string
  complemento?: string
  email: string
  estado_fk?: string
  cidade_fk?: string
  cep?: string
  corretor_fk?: string | null
  corretor_nome?: string | null
  origem_cadastro?: string
}

interface ValidationErrors {
  [key: string]: string
}

export default function EditarProprietarioPage() {
  const { get, post, put } = useAuthenticatedFetch()
  const router = useRouter()
  const params = useParams()
  const proprietarioUuid = Array.isArray(params.id) ? params.id[0] : params.id
  const { user } = useAuth()
  const { hasPermission } = usePermissions()

  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [proprietario, setProprietario] = useState<Proprietario | null>(null)

  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    cnpj: '',
    telefone: '',
    email: '',
    estado: '',
    cidade: '',
    cep: '',
    endereco: '',
    bairro: '',
    numero: '',
    complemento: '',
    origem_cadastro: ''
  })

  const [errors, setErrors] = useState<ValidationErrors>({})
  const [cpfValidating, setCpfValidating] = useState(false)
  const [cpfExists, setCpfExists] = useState(false)
  const [cpfPendingValidation, setCpfPendingValidation] = useState(false)
  const [emailValidating, setEmailValidating] = useState(false)
  const [emailExists, setEmailExists] = useState(false)
  const [emailPendingValidation, setEmailPendingValidation] = useState(false)
  const [buscandoCep, setBuscandoCep] = useState(false)
  const [cnpjValidating, setCnpjValidating] = useState(false)
  const [cnpjExists, setCnpjExists] = useState(false)
  const [cnpjPendingValidation, setCnpjPendingValidation] = useState(false)
  const [cepInicial, setCepInicial] = useState<string>('')
  const [estadosCidades, setEstadosCidades] = useState({
    estados: [] as Array<{ id: string, sigla: string, nome: string }>,
    municipios: [] as Array<{ id: string, nome: string }>
  })

  // Verificar permissões
  useEffect(() => {
    if (!user) {
      router.push('/admin/login')
      return
    }

    if (!hasPermission('proprietarios', 'UPDATE')) {
      router.push('/admin')
      return
    }
  }, [user, hasPermission, router])

  // Carregar dados do proprietário
  useEffect(() => {
    const loadProprietario = async () => {
      if (!proprietarioUuid) return

      try {
        setLoading(true)
        const response = await get(`/api/admin/proprietarios/${proprietarioUuid}`)

        if (!response.ok) {
          throw new Error('Proprietário não encontrado')
        }

        const proprietarioData = await response.json()
        setProprietario(proprietarioData)

        // Preencher formulário com dados do proprietário
        setFormData({
          nome: proprietarioData.nome || '',
          cpf: proprietarioData.cpf || '',
          cnpj: proprietarioData.cnpj || '',
          telefone: proprietarioData.telefone || '',
          email: proprietarioData.email || '',
          estado: '', // Será preenchido baseado no estado_fk
          cidade: '', // Será preenchido baseado no cidade_fk
          cep: proprietarioData.cep || '',
          endereco: proprietarioData.endereco || '',
          bairro: proprietarioData.bairro || '',
          numero: proprietarioData.numero || '',
          complemento: proprietarioData.complemento || '',
          origem_cadastro: proprietarioData.origem_cadastro || 'Plataforma'
        })

        // Guardar CEP inicial para evitar busca automática no carregamento
        setCepInicial(proprietarioData.cep || '')

      } catch (err) {
        console.error('Erro ao carregar proprietário:', err)
        setError('Erro ao carregar dados do proprietário')
      } finally {
        setLoading(false)
      }
    }

    loadProprietario()
  }, [proprietarioUuid, get])

  // Carregar estados
  useEffect(() => {
    const loadEstados = async () => {
      try {
        const municipiosData = await import('@/lib/admin/municipios.json')
        const estadosComId = municipiosData.estados?.map((estado) => ({
          id: estado.sigla, // Usar sigla como ID para consistência e compatibilidade com EstadoSelect
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
          // Buscar estado pela SIGLA (que agora é o ID)
          const estadoSelecionado = municipiosData.estados?.find(e => e.sigla === formData.estado)
          const municipiosDoEstado = estadoSelecionado?.municipios?.map((municipio: string, index: number) => ({
            id: municipio, // Usar o próprio nome como ID
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

  // Buscar endereço automaticamente quando CEP for informado (8 dígitos)
  useEffect(() => {
    const cep = formData.cep
    if (!cep) return

    const cepLimpo = cep.replace(/\D/g, '')
    if (cepLimpo.length !== 8) return

    // NÃO buscar se for o mesmo CEP inicial (carregamento da página)
    const cepInicialLimpo = cepInicial.replace(/\D/g, '')
    if (cepLimpo === cepInicialLimpo) {
      console.log('⏭️ CEP é o mesmo do carregamento inicial - pulando busca automática')
      return
    }

    const buscarEndereco = async () => {
      setBuscandoCep(true)
      console.log('🔍 Buscando endereço para CEP (NOVO):', cepLimpo)

      try {
        const enderecoData = await buscarEnderecoPorCep(cepLimpo)

        if (enderecoData) {
          console.log('✅ Endereço encontrado:', enderecoData)

          // Encontrar ID do estado pela sigla
          const estadoEncontrado = estadosCidades.estados.find(e => e.sigla === enderecoData.uf)

          setFormData(prev => ({
            ...prev,
            endereco: enderecoData.logradouro || '',
            bairro: enderecoData.bairro || '',
            estado: estadoEncontrado?.id || '',
            cidade: '', // Será selecionado após municípios carregarem
            numero: '' // Limpar número ao trocar CEP (apenas quando usuário digita NOVO CEP)
          }))

          // Aguardar carregar municípios e então selecionar a cidade
          setTimeout(() => {
            setFormData(prev => {
              const municipioEncontrado = estadosCidades.municipios.find(m => m.nome === enderecoData.localidade)
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
  }, [formData.cep, estadosCidades.estados, estadosCidades.municipios, cepInicial])

  // Verificar Email com debounce
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

    setEmailPendingValidation(true)

    const verificarEmail = async () => {
      setEmailValidating(true)
      console.log('🔍 CLIENT-SIDE: Verificando email:', email)

      try {
        const emailLimpo = email.trim().toLowerCase()
        const response = await post('/api/admin/proprietarios/verificar-email', { email: emailLimpo, excludeUuid: proprietarioUuid })
        const data = await response.json()
        console.log('✅ CLIENT-SIDE: Resultado email exists:', data.exists)
        setEmailExists(data.exists)
      } catch (error) {
        console.error('❌ Erro ao verificar Email:', error)
      } finally {
        setEmailValidating(false)
        setEmailPendingValidation(false)
      }
    }

    const timeoutId = setTimeout(verificarEmail, 800)
    return () => clearTimeout(timeoutId)
  }, [formData.email, post, proprietarioUuid])

  // Encontrar estado e cidade baseado nos dados do proprietário
  useEffect(() => {
    if (proprietario && estadosCidades.estados.length > 0 && !formData.estado) {
      console.log('🔍 Buscando estado para:', proprietario.estado_fk)

      // Tentar encontrar por SIGLA primeiro (PE, SP, RJ, etc)
      let estadoEncontrado = estadosCidades.estados.find(e => e.sigla === proprietario.estado_fk)

      // Se não encontrar por sigla, tentar por NOME (Pernambuco, São Paulo, etc)
      if (!estadoEncontrado) {
        console.log('🔄 Não encontrado por sigla, tentando por nome...')
        estadoEncontrado = estadosCidades.estados.find(e => e.nome === proprietario.estado_fk)
      }

      console.log('✅ Estado encontrado:', estadoEncontrado)

      if (estadoEncontrado) {
        setFormData(prev => ({ ...prev, estado: estadoEncontrado.id }))
      } else {
        console.error('❌ Estado NÃO encontrado para:', proprietario.estado_fk)
      }
    }
  }, [proprietario, estadosCidades.estados, formData.estado])

  useEffect(() => {
    if (proprietario && proprietario.cidade_fk && formData.estado && estadosCidades.municipios.length > 0 && !formData.cidade) {
      console.log('🔍 Buscando cidade para:', proprietario.cidade_fk)
      console.log('🔍 Municípios disponíveis:', estadosCidades.municipios.length)

      // Encontrar cidade pelo nome
      const cidadeEncontrada = estadosCidades.municipios.find(m => m.nome === proprietario.cidade_fk)

      console.log('✅ Cidade encontrada:', cidadeEncontrada)

      if (cidadeEncontrada) {
        setFormData(prev => ({ ...prev, cidade: cidadeEncontrada.id }))
      } else {
        console.warn('⚠️ Cidade não encontrada na lista de municípios:', proprietario.cidade_fk)
        console.warn('⚠️ Municípios disponíveis:', estadosCidades.municipios.map(m => m.nome).slice(0, 10))
      }
    }
  }, [proprietario, formData.estado, estadosCidades.municipios, formData.cidade])

  // Validação de CPF
  const validateCPF = (cpf: string): boolean => {
    const cleanCPF = cpf.replace(/\D/g, '')

    if (cleanCPF.length !== 11) return false

    // Regra Especial para Admin
    if (cleanCPF === '99999999999') return true

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

  // Validação de CNPJ
  const validateCNPJ = (cnpj: string): boolean => {
    const cleanCNPJ = cnpj.replace(/\D/g, '')

    if (cleanCNPJ.length !== 14) return false
    if (/^(\d)\1{13}$/.test(cleanCNPJ)) return false

    let length = cleanCNPJ.length - 2
    let numbers = cleanCNPJ.substring(0, length)
    const digits = cleanCNPJ.substring(length)
    let sum = 0
    let pos = length - 7

    for (let i = length; i >= 1; i--) {
      sum += parseInt(numbers.charAt(length - i)) * pos--
      if (pos < 2) pos = 9
    }

    let result = sum % 11 < 2 ? 0 : 11 - (sum % 11)
    if (result !== parseInt(digits.charAt(0))) return false

    length = length + 1
    numbers = cleanCNPJ.substring(0, length)
    sum = 0
    pos = length - 7

    for (let i = length; i >= 1; i--) {
      sum += parseInt(numbers.charAt(length - i)) * pos--
      if (pos < 2) pos = 9
    }

    result = sum % 11 < 2 ? 0 : 11 - (sum % 11)
    return result === parseInt(digits.charAt(1))
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

  // Formatação de CNPJ
  const formatCNPJ = (value: string): string => {
    const cleanValue = value.replace(/\D/g, '')
    if (cleanValue.length <= 14) {
      return cleanValue.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
    }
    return cleanValue.substring(0, 14).replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
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
    if (!cpf || !validateCPF(cpf)) {
      setCpfPendingValidation(false)
      return
    }

    setCpfPendingValidation(true)

    try {
      setCpfValidating(true)
      // Enviar CPF formatado (com pontos e traço) pois o banco armazena assim
      const response = await post('/api/admin/proprietarios/verificar-cpf', { cpf, excludeUuid: proprietarioUuid })
      const data = await response.json()
      setCpfExists(data.exists)
    } catch (error) {
      console.error('Erro ao verificar CPF:', error)
    } finally {
      setCpfValidating(false)
      setCpfPendingValidation(false)
    }
  }

  // Verificar CNPJ em tempo real
  const checkCNPJExists = async (cnpj: string) => {
    if (!cnpj || !validateCNPJ(cnpj)) {
      setCnpjPendingValidation(false)
      return
    }

    setCnpjPendingValidation(true)

    try {
      setCnpjValidating(true)
      const response = await post('/api/admin/proprietarios/verificar-cnpj', { cnpj, excludeUuid: proprietarioUuid })
      const data = await response.json()
      setCnpjExists(data.exists)
    } catch (error) {
      console.error('Erro ao verificar CNPJ:', error)
    } finally {
      setCnpjValidating(false)
      setCnpjPendingValidation(false)
    }
  }

  // Verificar Email com debounce usando useEffect (abaixo)

  // Prevenir avanço com Tab/Enter quando há erros ou duplicidade
  const handleKeyDown = (e: React.KeyboardEvent, field: string) => {
    // Bloquear se houver erro de validação
    if ((e.key === 'Tab' || e.key === 'Enter') && errors[field as keyof ValidationErrors]) {
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
          if (formData.cpf && (cpfValidating || cpfExists || cpfPendingValidation ||
            cpfLimpo.length !== 11 || !validateCPF(formData.cpf))) {
            e.preventDefault()
            return
          }
          break
        case 'cnpj':
          const cnpjLimpo = formData.cnpj.replace(/\D/g, '')
          if (formData.cnpj && (cnpjValidating || cnpjExists || cnpjPendingValidation ||
            cnpjLimpo.length !== 14 || !validateCNPJ(formData.cnpj))) {
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

  const handleInputChange = (field: string, value: string) => {
    let formattedValue = value
    const newErrors = { ...errors }

    // Formatação específica por campo
    switch (field) {
      case 'cpf':
        formattedValue = formatCPF(value)
        break
      case 'cnpj':
        formattedValue = formatCNPJ(value)
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
        // Limpar erro de estado se houver
        if (value) delete newErrors.estado
        // Limpar erro de cidade (será revalidado quando selecionada)
        delete (newErrors as any).cidade
        break
    }

    setFormData(prev => ({ ...prev, [field]: formattedValue }))

    // Validação em tempo real
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
        // Se preencheu CPF, limpa CNPJ e seus erros/estados
        if (formattedValue) {
          setFormData(prev => ({ ...prev, cnpj: '' }))
          setCnpjExists(false)
          delete newErrors.cnpj
          // Verificar se CPF já existe (enviar valor FORMATADO)
          if (validateCPF(formattedValue)) {
            checkCPFExists(formattedValue)
          }
        }
        break
      case 'cnpj':
        if (formattedValue && !validateCNPJ(formattedValue)) {
          newErrors.cnpj = 'CNPJ inválido'
        } else {
          delete newErrors.cnpj
        }
        // Se preencheu CNPJ, limpa CPF e seus erros/estados
        if (formattedValue) {
          setFormData(prev => ({ ...prev, cpf: '' }))
          setCpfExists(false)
          delete newErrors.cpf
          // Verificar se CNPJ já existe
          if (validateCNPJ(formattedValue)) {
            checkCNPJExists(formattedValue)
          }
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
        break
      case 'cidade':
        if (value) delete (newErrors as any).cidade
        break
      case 'cep':
        if (value.replace(/\D/g, '').length === 8) delete (newErrors as any).cep
        break
      case 'endereco':
        if (value.trim().length > 0) delete (newErrors as any).endereco
        break
      case 'bairro':
        if (value.trim().length > 0) delete (newErrors as any).bairro
        break
      case 'numero':
        if (value.trim().length > 0) delete (newErrors as any).numero
        break
      default:
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

    if ((!formData.cpf || !validateCPF(formData.cpf)) &&
      (!formData.cnpj || !validateCNPJ(formData.cnpj))) {
      finalErrors.cpf = 'CPF ou CNPJ é obrigatório e deve ser válido'
    }

    if (formData.cpf && cpfExists) {
      finalErrors.cpf = 'CPF já cadastrado'
    }

    if (formData.cnpj && cnpjExists) {
      finalErrors.cnpj = 'CNPJ já cadastrado'
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

    if (formData.cpf && cpfExists) {
      finalErrors.cpf = 'CPF já cadastrado'
    }

    if (formData.cnpj && cnpjExists) {
      finalErrors.cnpj = 'CNPJ já cadastrado'
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

      if (!proprietarioUuid) {
        alert('Identificador do proprietário inválido.')
        return
      }

      const response = await put(`/api/admin/proprietarios/${proprietarioUuid}`, {
        nome: formData.nome,
        cpf: formData.cpf || null,
        cnpj: formData.cnpj || null,
        telefone: formData.telefone,
        email: formData.email,
        endereco: formData.endereco,
        numero: formData.numero,
        bairro: formData.bairro,
        complemento: formData.complemento || null,
        estado_fk: formData.estado ? estadosCidades.estados.find(e => e.id === formData.estado)?.sigla || null : null,
        cidade_fk: formData.cidade ? estadosCidades.municipios.find(m => m.id === formData.cidade)?.nome || null : null,
        cep: formData.cep,
        updated_by: user?.nome || 'system'
      })

      if (response.ok) {
        router.push('/admin/proprietarios')
      } else {
        const errorData = await response.json()
        alert(`Erro: ${errorData.error}`)
      }
    } catch (error) {
      console.error('Erro ao atualizar proprietário:', error)
      alert('Erro ao atualizar proprietário')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando dados do proprietário...</p>
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
            onClick={() => router.push('/admin/proprietarios')}
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
        <h1 className="text-2xl font-bold text-gray-900">Editar Proprietário</h1>
        <p className="text-gray-600">Atualize as informações do proprietário</p>
      </div>

      <form onSubmit={handleSubmit} className="p-8 space-y-6">
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
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.nome ? 'border-red-500' : 'border-gray-300'
              }`}
            placeholder="Nome completo"
          />
          {errors.nome && <p className="text-red-500 text-sm mt-1">{errors.nome}</p>}
        </div>

        {/* Origem do Cadastro (readonly) */}
        <div>
          <label htmlFor="origem_cadastro" className="block text-sm font-medium text-gray-700 mb-2">
            Origem do Cadastro
          </label>
          <input
            type="text"
            id="origem_cadastro"
            value={formData.origem_cadastro}
            readOnly
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed"
            title="Campo não editável"
          />
          <p className="text-xs text-gray-500 mt-1">
            {formData.origem_cadastro === 'Publico' ? 'Cadastrado pelo site público' : 'Cadastrado pela plataforma admin'}
          </p>
        </div>

        {/* Documentos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="cpf" className="block text-sm font-medium text-gray-700 mb-2">
              CPF
            </label>
            <input
              type="text"
              id="cpf"
              value={formData.cpf}
              onChange={(e) => handleInputChange('cpf', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${(errors.cpf || cpfExists) && !formData.cnpj ? 'border-red-500' : 'border-gray-300'
                } ${formData.cnpj ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}`}
              placeholder="000.000.000-00"
              maxLength={14}
              disabled={!!formData.cnpj}
            />
            {errors.cpf && !formData.cnpj && <p className="text-red-500 text-sm mt-1">{errors.cpf}</p>}
            {cpfValidating && <p className="text-blue-500 text-sm mt-1">Verificando CPF...</p>}
            {cpfExists && <p className="text-red-500 text-sm mt-1">CPF já cadastrado</p>}
            {formData.cpf && !cpfValidating && !cpfExists && validateCPF(formData.cpf) && (
              <p className="text-green-500 text-sm mt-1">✓ CPF disponível</p>
            )}
          </div>

          <div>
            <label htmlFor="cnpj" className="block text-sm font-medium text-gray-700 mb-2">
              CNPJ
            </label>
            <input
              type="text"
              id="cnpj"
              value={formData.cnpj}
              onChange={(e) => handleInputChange('cnpj', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${(errors.cnpj || cnpjExists) && !formData.cpf ? 'border-red-500' : 'border-gray-300'
                } ${formData.cpf ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}`}
              placeholder="00.000.000/0000-00"
              maxLength={18}
              disabled={!!formData.cpf}
            />
            {errors.cnpj && !formData.cpf && <p className="text-red-500 text-sm mt-1">{errors.cnpj}</p>}
            {cnpjValidating && <p className="text-blue-500 text-sm mt-1">Verificando CNPJ...</p>}
            {cnpjExists && <p className="text-red-500 text-sm mt-1">CNPJ já cadastrado</p>}
            {formData.cnpj && !cnpjValidating && !cnpjExists && validateCNPJ(formData.cnpj) && (
              <p className="text-green-500 text-sm mt-1">✓ CNPJ disponível</p>
            )}
          </div>
        </div>

        <p className="text-xs text-gray-500 italic -mt-4 mb-4">
          * Preencha CPF ou CNPJ. Ao preencher um, o outro será bloqueado.
        </p>

        {/* Telefone */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="telefone" className="block text-sm font-medium text-gray-700 mb-2">
              Telefone *
            </label>
            <input
              type="text"
              id="telefone"
              value={formData.telefone}
              onChange={(e) => handleInputChange('telefone', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.telefone ? 'border-red-500' : 'border-gray-300'
                }`}
              placeholder="(00) 00000-0000"
              maxLength={15}
            />
            {errors.telefone && <p className="text-red-500 text-sm mt-1">{errors.telefone}</p>}
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
              mode="all"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.estado ? 'border-red-500' : 'border-gray-300'
                }`}
              format="sigla-nome"
              showAllOption={true}
              allOptionLabel="Selecione o estado"
            />
            {errors.estado && <p className="text-red-500 text-sm mt-1">{errors.estado}</p>}
          </div>

          <div>
            <label htmlFor="cidade" className="block text-sm font-medium text-gray-700 mb-2">
              Cidade *
            </label>
            <select
              id="cidade"
              value={formData.cidade}
              onChange={(e) => handleInputChange('cidade', e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, 'cidade')}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.cidade ? 'border-red-500' : 'border-gray-300'
                }`}
              disabled={!formData.estado}
            >
              <option value="">Selecione a cidade</option>
              {estadosCidades.municipios.map(municipio => (
                <option key={municipio.id} value={municipio.id}>
                  {municipio.nome}
                </option>
              ))}
            </select>
            {errors.cidade && <p className="text-red-500 text-sm mt-1">{errors.cidade}</p>}
          </div>
        </div>

        {/* CEP - OBRIGATÓRIO */}
        <div>
          <label htmlFor="cep" className="block text-sm font-medium text-gray-700 mb-2">
            CEP *
          </label>
          <div className="relative">
            <input
              type="text"
              id="cep"
              value={formData.cep}
              onChange={(e) => handleInputChange('cep', e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, 'cep')}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.cep ? 'border-red-500' : 'border-gray-300'
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
          {errors.cep && <p className="text-red-500 text-sm mt-1">{errors.cep}</p>}
          <p className="text-xs text-gray-500 mt-1">
            {buscandoCep ? 'Buscando endereço...' : 'Informe o CEP para preencher automaticamente'}
          </p>
        </div>

        {/* Corretor (readonly) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Corretor</label>
          <input
            type="text"
            value={
              proprietario?.corretor_fk
                ? proprietario?.corretor_nome || 'Corretor não encontrado'
                : 'Sem Corretor Associado'
            }
            readOnly
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700 cursor-not-allowed"
            title="Campo não editável"
          />
        </div>

        {/* Endereço (preenchido automaticamente) */}
        <div>
          <label htmlFor="endereco" className="block text-sm font-medium text-gray-700 mb-2">
            Endereço *
          </label>
          <input
            type="text"
            id="endereco"
            value={formData.endereco}
            onChange={(e) => handleInputChange('endereco', e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, 'endereco')}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.endereco ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-gray-50'
              }`}
            placeholder="Será preenchido automaticamente"
          />
          {errors.endereco && <p className="text-red-500 text-sm mt-1">{errors.endereco}</p>}
          <p className="text-xs text-gray-500 mt-1">Preenchido automaticamente pelo CEP</p>
        </div>

        {/* Bairro (preenchido automaticamente) */}
        <div>
          <label htmlFor="bairro" className="block text-sm font-medium text-gray-700 mb-2">
            Bairro *
          </label>
          <input
            type="text"
            id="bairro"
            value={formData.bairro}
            onChange={(e) => handleInputChange('bairro', e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, 'bairro')}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.bairro ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-gray-50'
              }`}
            placeholder="Será preenchido automaticamente"
          />
          {errors.bairro && <p className="text-red-500 text-sm mt-1">{errors.bairro}</p>}
          <p className="text-xs text-gray-500 mt-1">Preenchido automaticamente pelo CEP</p>
        </div>

        {/* Número e Complemento */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="numero" className="block text-sm font-medium text-gray-700 mb-2">
              Número *
            </label>
            <input
              type="text"
              id="numero"
              value={formData.numero}
              onChange={(e) => handleInputChange('numero', e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, 'numero')}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.numero ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
              placeholder="123"
            />
            {errors.numero && <p className="text-red-500 text-sm mt-1">{errors.numero}</p>}
          </div>

          <div>
            <label htmlFor="complemento" className="block text-sm font-medium text-gray-700 mb-2">
              Complemento
            </label>
            <input
              type="text"
              id="complemento"
              value={formData.complemento}
              onChange={(e) => handleInputChange('complemento', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Apto, Bloco, etc"
            />
          </div>
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
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.email || emailExists ? 'border-red-500' : 'border-gray-300'
              }`}
            placeholder="email@exemplo.com"
          />
          {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
          {emailValidating && <p className="text-blue-500 text-sm mt-1">Verificando Email...</p>}
          {emailExists && <p className="text-red-500 text-sm mt-1">Email já cadastrado</p>}
          {formData.email && !emailValidating && !emailExists && validateEmail(formData.email) && (
            <p className="text-green-500 text-sm mt-1">✓ Email disponível</p>
          )}
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => router.push('/admin/proprietarios')}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving || cpfExists || emailExists}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </form>
    </div>
  )
}
