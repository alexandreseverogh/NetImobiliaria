'use client'

import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { useEstadosCidadesPublic } from '@/hooks/useEstadosCidadesPublic'
import { formatCPF, formatTelefone, formatCEP, validateCPF, validateTelefone, validateEmail } from '@/lib/utils/formatters'
import { buscarEnderecoPorCep } from '@/lib/utils/geocoding'

interface RegisterFormProps {
  userType: 'cliente' | 'proprietario'
  onBack: () => void
  onSuccess: () => void
}

export default function RegisterForm({ userType, onBack, onSuccess }: RegisterFormProps) {
  const { estados, getCidadesPorEstado } = useEstadosCidadesPublic()
  
  // Estados do formulário
  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    estado_fk: '',
    cidade_fk: '',
    cep: '',
    endereco: '',
    bairro: '',
    numero: '',
    complemento: '',
    email: '',
    telefone: '',
    password: '',
    confirmPassword: ''
  })

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [buscandoCep, setBuscandoCep] = useState(false)
  const [cepValid, setCepValid] = useState<boolean | null>(null)
  const [cepValidationMessage, setCepValidationMessage] = useState<string | null>(null)
  const [cpfValidating, setCpfValidating] = useState(false)
  const [cpfExists, setCpfExists] = useState(false)
  const [cpfInvalid, setCpfInvalid] = useState(false)
  const [cpfPendingValidation, setCpfPendingValidation] = useState(false)
  const [emailValidating, setEmailValidating] = useState(false)
  const [emailExists, setEmailExists] = useState(false)
  const [emailPendingValidation, setEmailPendingValidation] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  // Ref para rastrear o último CEP buscado e evitar buscas duplicadas
  const ultimoCepBuscadoRef = useRef<string>('')

  const cidades = formData.estado_fk ? getCidadesPorEstado(formData.estado_fk) : []

  // Buscar endereço automaticamente quando CEP for informado (8 dígitos) e validar via ViaCEP
  useEffect(() => {
    const cep = formData.cep
    if (!cep) {
      setCepValid(null)
      setCepValidationMessage(null)
      ultimoCepBuscadoRef.current = ''
      return
    }

    const cepLimpo = cep.replace(/\D/g, '')
    if (cepLimpo.length !== 8) {
      setCepValid(null)
      setCepValidationMessage(null)
      ultimoCepBuscadoRef.current = ''
      return
    }

    // Evitar múltiplas chamadas para o mesmo CEP
    if (ultimoCepBuscadoRef.current === cepLimpo) {
      return // Já foi buscado este CEP, não buscar novamente
    }

    let cancelled = false

    const buscarEndereco = async () => {
      // Marcar que este CEP está sendo buscado
      ultimoCepBuscadoRef.current = cepLimpo
      
      setBuscandoCep(true)
      setCepValid(null)
      setCepValidationMessage(null)
      console.log('🔍 Buscando endereço para CEP:', cepLimpo)

      try {
        const enderecoData = await buscarEnderecoPorCep(cepLimpo)

        if (cancelled) return

        if (enderecoData) {
          console.log('✅ Endereço encontrado:', enderecoData)
          setCepValid(true)
          setCepValidationMessage(null)

          // Preencher campos automaticamente apenas se ainda não estiverem preenchidos
          setFormData(prev => {
            // Verificar se os campos já estão preenchidos com os mesmos valores
            if (prev.endereco === enderecoData.logradouro && 
                prev.bairro === enderecoData.bairro &&
                prev.estado_fk === enderecoData.uf &&
                prev.cidade_fk === enderecoData.localidade) {
              return prev // Não atualizar se já estão corretos
            }

            return {
              ...prev,
              endereco: enderecoData.logradouro || '',
              bairro: enderecoData.bairro || '',
              estado_fk: enderecoData.uf || '',
              cidade_fk: enderecoData.localidade || '',
              // Limpar número ao trocar CEP apenas se o CEP mudou
              numero: prev.cep === cep ? prev.numero : ''
            }
          })
        } else {
          console.log('⚠️ CEP não encontrado na ViaCEP')
          setCepValid(false)
          setCepValidationMessage('CEP não encontrado na base do Correios (ViaCEP)')
          
          // Limpar campos de endereço se CEP inválido
          setFormData(prev => ({
            ...prev,
            endereco: '',
            bairro: '',
            estado_fk: prev.estado_fk, // Manter estado se já estava preenchido
            cidade_fk: prev.cidade_fk, // Manter cidade se já estava preenchida
            numero: ''
          }))
        }
      } catch (error) {
        if (cancelled) return
        console.error('❌ Erro ao buscar CEP:', error)
        setCepValid(false)
        setCepValidationMessage('Erro ao validar CEP. Tente novamente.')
      } finally {
        if (!cancelled) {
          setBuscandoCep(false)
        }
      }
    }

    // Debounce de 500ms
    const timeoutId = setTimeout(buscarEndereco, 500)
    
    return () => {
      cancelled = true
      clearTimeout(timeoutId)
    }
  }, [formData.cep]) // Removido formData.endereco e formData.bairro das dependências para evitar loops

  // Verificar CPF com debounce
  useEffect(() => {
    const cpf = formData.cpf
    if (!cpf) {
      setCpfExists(false)
      setCpfInvalid(false)
      setCpfPendingValidation(false)
      return
    }

    const cpfLimpo = cpf.replace(/\D/g, '')
    if (cpfLimpo.length !== 11) {
      setCpfExists(false)
      setCpfInvalid(false)
      setCpfPendingValidation(false)
      return
    }

    // Validar formato do CPF
    const isValid = validateCPF(cpf)
    if (!isValid) {
      setCpfInvalid(true)
      setCpfExists(false)
      setCpfValidating(false)
      setCpfPendingValidation(false)
      return
    } else {
      setCpfInvalid(false)
      // Marcar que há validação pendente (durante o debounce)
      setCpfPendingValidation(true)
    }

    const verificarCPF = async () => {
      setCpfValidating(true)
      try {
        const response = await fetch('/api/public/check-cpf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cpf, userType })
        })
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

    const timeoutId = setTimeout(verificarCPF, 500)
    return () => clearTimeout(timeoutId)
  }, [formData.cpf, userType])

  // Verificar Email com debounce
  useEffect(() => {
    const email = formData.email
    if (!email || !validateEmail(email)) {
      setEmailExists(false)
      setEmailPendingValidation(false)
      return
    }

    // Marcar que há validação pendente (durante o debounce)
    setEmailPendingValidation(true)

    const verificarEmail = async () => {
      setEmailValidating(true)
      try {
        const response = await fetch('/api/public/check-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim().toLowerCase(), userType })
        })
        if (response.ok) {
          const data = await response.json()
          setEmailExists(data.exists)
        }
      } catch (error) {
        console.error('Erro ao verificar Email:', error)
      } finally {
        setEmailValidating(false)
        // Validação concluída
        setEmailPendingValidation(false)
      }
    }

    const timeoutId = setTimeout(verificarEmail, 500)
    return () => clearTimeout(timeoutId)
  }, [formData.email, userType])

  // Prevenir avanço com Tab/Enter quando há erros ou campos vazios
  const handleKeyDown = (e: React.KeyboardEvent, field: string) => {
    if (e.key === 'Tab' || e.key === 'Enter') {
      switch (field) {
        case 'nome':
          if (!formData.nome || formData.nome.trim().length === 0) {
            e.preventDefault()
            return
          }
          break
        case 'cpf':
          const cpfLimpoKeyDown = formData.cpf.replace(/\D/g, '')
          // Bloquear se: vazio, validando, existe, inválido, incompleto, OU aguardando validação
          if (!formData.cpf || cpfValidating || cpfExists || cpfInvalid || cpfPendingValidation || cpfLimpoKeyDown.length !== 11 || !validateCPF(formData.cpf)) {
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
          // Bloquear se: vazio, validando, existe, inválido, OU aguardando validação
          if (!formData.email || emailValidating || emailExists || emailPendingValidation || !validateEmail(formData.email)) {
            e.preventDefault()
            return
          }
          break
        case 'cep':
          const cepLimpo = formData.cep.replace(/\D/g, '')
          if (!formData.cep || cepLimpo.length !== 8 || cepValid === false || buscandoCep) {
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
        case 'estado_fk':
          if (!formData.estado_fk) {
            e.preventDefault()
            return
          }
          break
        case 'cidade_fk':
          if (!formData.cidade_fk) {
            e.preventDefault()
            return
          }
          break
        case 'password':
          if (!formData.password || formData.password.length < 6) {
            e.preventDefault()
            return
          }
          break
        case 'confirmPassword':
          if (!formData.confirmPassword || formData.password !== formData.confirmPassword) {
            e.preventDefault()
            return
          }
          break
      }
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target

    // Formatar campos específicos
    let formattedValue = value
    if (name === 'cpf') {
      formattedValue = formatCPF(value)
    } else if (name === 'telefone') {
      formattedValue = formatTelefone(value)
    } else if (name === 'cep') {
      formattedValue = formatCEP(value)
    }

    setFormData(prev => ({
      ...prev,
      [name]: formattedValue
    }))

    // Limpar cidade se estado mudar
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
    setLoading(true)

    // Validações de campos obrigatórios
    const validationErrors: Record<string, string> = {}

    if (!formData.nome || formData.nome.trim().length === 0) {
      validationErrors.nome = 'Nome é obrigatório'
    }
    if (!formData.cpf) {
      validationErrors.cpf = 'CPF é obrigatório'
    } else if (formData.cpf.replace(/\D/g, '').length !== 11) {
      validationErrors.cpf = 'CPF deve ter 11 dígitos'
    }
    if (!formData.telefone) {
      validationErrors.telefone = 'Telefone é obrigatório'
    }
    if (!formData.email) {
      validationErrors.email = 'Email é obrigatório'
    } else if (!validateEmail(formData.email)) {
      validationErrors.email = 'Email inválido'
    }
    if (!formData.cep || formData.cep.replace(/\D/g, '').length !== 8) {
      validationErrors.cep = 'CEP é obrigatório e deve ter 8 dígitos'
    } else if (cepValid === false) {
      validationErrors.cep = 'CEP inválido ou não encontrado na base do Correios (ViaCEP)'
    } else if (cepValid === null && formData.cep.replace(/\D/g, '').length === 8) {
      // CEP ainda está sendo validado
      validationErrors.cep = 'Aguarde a validação do CEP'
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

    // Validações de formato
    if (cpfInvalid || !validateCPF(formData.cpf)) {
      validationErrors.cpf = 'CPF inválido'
    }
    
    // Validações de duplicidade
    if (cpfExists) {
      validationErrors.cpf = 'CPF já cadastrado'
    }
    if (emailExists) {
      validationErrors.email = 'Email já cadastrado'
    }

    // Validações de senha
    if (!formData.password || formData.password.length < 8) {
      validationErrors.password = 'A senha deve ter no mínimo 8 caracteres'
    }
    if (formData.password !== formData.confirmPassword) {
      validationErrors.confirmPassword = 'As senhas não coincidem'
    }

    // Se houver erros, exibir e parar
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      setError('Por favor, corrija os erros antes de continuar')
      setLoading(false)
      return
    }

    try {
      // Preparar dados para envio (remover confirmPassword e complemento se vazio)
      const { confirmPassword, complemento, ...dataToSend } = formData
      
      // Adicionar complemento de volta apenas se não estiver vazio
      if (complemento) {
        Object.assign(dataToSend, { complemento })
      }

      const response = await fetch('/api/public/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...dataToSend,
          userType
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // Cadastro bem-sucedido
        setSuccessMessage(data.message)
        
        // Aguardar 2 segundos e fechar modal
        setTimeout(() => {
          onSuccess()
        }, 2000)
      } else {
        setError(data.message || 'Erro ao realizar cadastro')
      }
    } catch (error) {
      console.error('Erro na requisição:', error)
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  // Se cadastro foi bem-sucedido, mostrar mensagem
  if (successMessage) {
    return (
      <div className="text-center py-8">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
          <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Cadastro Realizado!</h3>
        <p className="text-sm text-gray-600">{successMessage}</p>
        <p className="text-xs text-gray-500 mt-4">Redirecionando para login...</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[60vh] overflow-y-auto px-3">
      {/* Botão Voltar */}
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </button>

      {/* Nome Completo */}
      <div>
        <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-1">
          Nome Completo *
        </label>
        <input
          id="nome"
          name="nome"
          type="text"
          required
          autoComplete="off"
          placeholder="Nome completo"
          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.nome ? 'border-red-500 bg-red-50' : 'border-gray-300'
          }`}
          value={formData.nome}
          onChange={handleChange}
          onKeyDown={(e) => handleKeyDown(e, 'nome')}
        />
      </div>

      {/* CPF */}
      <div>
        <label htmlFor="cpf" className="block text-sm font-medium text-gray-700 mb-1">
          CPF *
        </label>
        <div className="relative">
          <input
            id="cpf"
            name="cpf"
            type="text"
            required
            autoComplete="off"
            placeholder="000.000.000-00"
            maxLength={14}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.cpf || cpfExists || cpfInvalid ? 'border-red-500 bg-red-50' : 'border-gray-300'
            }`}
            value={formData.cpf}
            onChange={handleChange}
            onKeyDown={(e) => handleKeyDown(e, 'cpf')}
          />
          {cpfValidating && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            </div>
          )}
        </div>
        {errors.cpf && <p className="text-red-500 text-sm mt-1">{errors.cpf}</p>}
        {cpfInvalid && <p className="text-red-500 text-sm mt-1">CPF inválido</p>}
        {cpfExists && !cpfInvalid && <p className="text-red-500 text-sm mt-1">CPF já cadastrado</p>}
      </div>

      {/* Seção de Endereço (Opcional) */}
      <div className="pt-4 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Endereço (Opcional)</h4>

        {/* Estado - PRIMEIRO */}
        <div className="mb-3">
          <label htmlFor="estado_fk" className="block text-sm font-medium text-gray-700 mb-1">
            Estado *
          </label>
          <select
            id="estado_fk"
            name="estado_fk"
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.estado_fk ? 'border-red-500 bg-red-50' : 'border-gray-300'
            }`}
            value={formData.estado_fk}
            onChange={handleChange}
            onKeyDown={(e) => handleKeyDown(e, 'estado_fk')}
          >
            <option value="">Selecione o estado</option>
            {estados.map(estado => (
              <option key={estado.sigla} value={estado.sigla}>
                {estado.nome}
              </option>
            ))}
          </select>
          {errors.estado_fk && <p className="text-red-500 text-sm mt-1">{errors.estado_fk}</p>}
        </div>

        {/* Cidade - SEGUNDO (aparecer sempre, desabilitado se estado não selecionado) */}
        <div className="mb-3">
          <label htmlFor="cidade_fk" className="block text-sm font-medium text-gray-700 mb-1">
            Cidade *
          </label>
          <select
            id="cidade_fk"
            name="cidade_fk"
            disabled={!formData.estado_fk}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.cidade_fk ? 'border-red-500 bg-red-50' : 'border-gray-300'
            } disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed`}
            value={formData.cidade_fk}
            onChange={handleChange}
            onKeyDown={(e) => handleKeyDown(e, 'cidade_fk')}
          >
            <option value="">
              {formData.estado_fk ? 'Selecione a cidade' : 'Selecione um estado primeiro'}
            </option>
            {cidades.map(cidade => (
              <option key={cidade} value={cidade}>
                {cidade}
              </option>
            ))}
          </select>
          {errors.cidade_fk && <p className="text-red-500 text-sm mt-1">{errors.cidade_fk}</p>}
        </div>

        {/* CEP - TERCEIRO (busca automática) */}
        <div className="mb-3">
          <label htmlFor="cep" className="block text-sm font-medium text-gray-700 mb-1">
            CEP *
          </label>
          <div className="relative">
            <input
              id="cep"
              name="cep"
              type="text"
              placeholder="00000-000"
              maxLength={9}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.cep || cepValid === false ? 'border-red-500 bg-red-50' : cepValid === true ? 'border-green-500 bg-green-50' : 'border-gray-300'
              }`}
              value={formData.cep}
              onChange={handleChange}
              onKeyDown={(e) => handleKeyDown(e, 'cep')}
            />
            {buscandoCep && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              </div>
            )}
            {cepValid === false && !buscandoCep && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            )}
            {cepValid === true && !buscandoCep && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </div>
          {errors.cep && <p className="text-red-500 text-sm mt-1">{errors.cep}</p>}
          {cepValidationMessage && !errors.cep && (
            <p className="text-red-500 text-sm mt-1">{cepValidationMessage}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            {buscandoCep 
              ? 'Buscando endereço...' 
              : cepValid === true 
                ? 'CEP válido - Endereço preenchido automaticamente' 
                : 'Informe o CEP para preencher automaticamente'}
          </p>
        </div>

        {/* Endereço - QUARTO (preenchido automaticamente) */}
        <div className="mb-3">
          <label htmlFor="endereco" className="block text-sm font-medium text-gray-700 mb-1">
            Endereço *
          </label>
          <input
            id="endereco"
            name="endereco"
            type="text"
            placeholder="Será preenchido automaticamente"
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.endereco ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-gray-50'
            }`}
            value={formData.endereco}
            onChange={handleChange}
            onKeyDown={(e) => handleKeyDown(e, 'endereco')}
          />
          {errors.endereco && <p className="text-red-500 text-sm mt-1">{errors.endereco}</p>}
        </div>

        {/* Bairro - QUINTO (preenchido automaticamente) */}
        <div className="mb-3">
          <label htmlFor="bairro" className="block text-sm font-medium text-gray-700 mb-1">
            Bairro *
          </label>
          <input
            id="bairro"
            name="bairro"
            type="text"
            placeholder="Será preenchido automaticamente"
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.bairro ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-gray-50'
            }`}
            value={formData.bairro}
            onChange={handleChange}
            onKeyDown={(e) => handleKeyDown(e, 'bairro')}
          />
          {errors.bairro && <p className="text-red-500 text-sm mt-1">{errors.bairro}</p>}
        </div>

        {/* Número e Complemento - SEXTO e SÉTIMO */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label htmlFor="numero" className="block text-sm font-medium text-gray-700 mb-1">
              Número *
            </label>
            <input
              id="numero"
              name="numero"
              type="text"
              placeholder="Ex: 123"
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.numero ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
              value={formData.numero}
              onChange={handleChange}
              onKeyDown={(e) => handleKeyDown(e, 'numero')}
            />
            {errors.numero && <p className="text-red-500 text-sm mt-1">{errors.numero}</p>}
          </div>
          <div>
            <label htmlFor="complemento" className="block text-sm font-medium text-gray-700 mb-1">
              Complemento
            </label>
            <input
              id="complemento"
              name="complemento"
              type="text"
              placeholder="Apto, Bloco, etc"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.complemento}
              onChange={handleChange}
            />
          </div>
        </div>
      </div>

      {/* Email - OITAVO */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          Email *
        </label>
        <div className="relative">
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="off"
            placeholder="seu@email.com"
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.email || emailExists ? 'border-red-500 bg-red-50' : 'border-gray-300'
            }`}
            value={formData.email}
            onChange={handleChange}
            onKeyDown={(e) => handleKeyDown(e, 'email')}
          />
          {emailValidating && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            </div>
          )}
        </div>
        {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
        {emailExists && <p className="text-red-500 text-sm mt-1">Email já cadastrado</p>}
      </div>

      {/* Telefone - NONO */}
      <div>
        <label htmlFor="telefone" className="block text-sm font-medium text-gray-700 mb-1">
          Telefone *
        </label>
        <input
          id="telefone"
          name="telefone"
          type="text"
          required
          autoComplete="off"
          placeholder="(00) 00000-0000"
          maxLength={15}
          disabled={emailExists || cpfExists || cpfInvalid}
          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.telefone ? 'border-red-500 bg-red-50' : 'border-gray-300'
          } ${emailExists || cpfExists || cpfInvalid ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          value={formData.telefone}
          onChange={handleChange}
          onKeyDown={(e) => handleKeyDown(e, 'telefone')}
        />
        {errors.telefone && <p className="text-red-500 text-sm mt-1">{errors.telefone}</p>}
        {(emailExists || cpfExists || cpfInvalid) && (
          <p className="text-amber-600 text-sm mt-1">⚠️ Corrija os erros acima primeiro</p>
        )}
      </div>

      {/* Senha - DÉCIMO */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
          Senha *
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            required
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
            disabled={emailExists || cpfExists || cpfInvalid}
            className={`w-full px-4 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.password ? 'border-red-500 bg-red-50' : 'border-gray-300'
            } ${emailExists || cpfExists || cpfInvalid ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            value={formData.password}
            onChange={handleChange}
            onKeyDown={(e) => handleKeyDown(e, 'password')}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            disabled={emailExists || cpfExists || cpfInvalid}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
          >
            {showPassword ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
          </button>
        </div>
        {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
      </div>

      {/* Confirmar Senha - DÉCIMO PRIMEIRO */}
      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
          Confirmar Senha *
        </label>
        <div className="relative">
          <input
            id="confirmPassword"
            name="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            required
            autoComplete="new-password"
            placeholder="Repita a senha"
            disabled={emailExists || cpfExists || cpfInvalid}
            className={`w-full px-4 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.confirmPassword ? 'border-red-500 bg-red-50' : 'border-gray-300'
            } ${emailExists || cpfExists || cpfInvalid ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            value={formData.confirmPassword}
            onChange={handleChange}
            onKeyDown={(e) => handleKeyDown(e, 'confirmPassword')}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            disabled={emailExists || cpfExists || cpfInvalid}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={showConfirmPassword ? 'Ocultar senha' : 'Mostrar senha'}
          >
            {showConfirmPassword ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
          </button>
        </div>
        {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>}
      </div>

      {/* Erro */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                {error}
              </h3>
            </div>
          </div>
        </div>
      )}

      {/* Botão Cadastrar */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={loading || cpfExists || cpfInvalid || emailExists || cepValid === false || buscandoCep}
          className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          {loading ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Cadastrando...
            </div>
          ) : (
            'Cadastrar'
          )}
        </button>
      </div>

      <p className="text-xs text-gray-500 text-center">
        * Campos obrigatórios
      </p>
    </form>
  )
}

