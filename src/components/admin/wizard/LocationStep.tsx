'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Imovel } from '@/lib/types/admin'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { buscarEnderecoPorCep } from '@/lib/utils/geocoding'
// import { API_ENDPOINTS } from '@/lib/config/constants'

interface LocationStepProps {
  data: Partial<Imovel>
  onUpdate: (data: Partial<Imovel>) => void
  mode: 'create' | 'edit'
  onCepValidationChange?: (status: { valid: boolean; message?: string | null }) => void
}

interface MunicipioData {
  estados: {
    sigla: string
    nome: string
    municipios: string[]
  }[]
}

export default function LocationStep({ data, onUpdate, mode, onCepValidationChange }: LocationStepProps) {
  const { get } = useAuthenticatedFetch()
  const [municipiosData, setMunicipiosData] = useState<MunicipioData | null>(null)
  const [selectedEstado, setSelectedEstado] = useState(data.endereco?.estado || '')
  const [selectedMunicipio, setSelectedMunicipio] = useState(data.endereco?.cidade || '')
  const [loading, setLoading] = useState(true)
  const [buscandoCep, setBuscandoCep] = useState(false)
  const [cepState, setCepState] = useState<{ valid: boolean; message: string | null }>({ valid: false, message: null })
  const cepInputRef = useRef<HTMLInputElement | null>(null)

  const mergeEndereco = useCallback((partial: Partial<Imovel['endereco']>): Imovel['endereco'] => ({
    endereco: data.endereco?.endereco ?? '',
    numero: data.endereco?.numero ?? '',
    complemento: data.endereco?.complemento,
    bairro: data.endereco?.bairro ?? '',
    cidade: data.endereco?.cidade ?? '',
    estado: data.endereco?.estado ?? '',
    cep: data.endereco?.cep ?? '',
    latitude: data.endereco?.latitude,
    longitude: data.endereco?.longitude,
    ...partial
  }), [data.endereco])

  useEffect(() => {
    onCepValidationChange?.(cepState)
  }, [cepState, onCepValidationChange])

  const loadMunicipios = useCallback(async () => {
    try {
      setLoading(true)
      const response = await get('/api/admin/municipios')
      if (response.ok) {
        const municipios = await response.json()
        setMunicipiosData(municipios)
      } else {
        console.error('Erro ao carregar municípios')
      }
    } catch (error) {
      console.error('Erro ao carregar municípios:', error)
    } finally {
      setLoading(false)
    }
  }, [get])

  useEffect(() => {
    loadMunicipios()
  }, [loadMunicipios])

  useEffect(() => {
    console.log('🟦 [LocationStep] Estado atual do endereço:', data.endereco)
    console.log('🟦 [LocationStep] CEP validation state:', cepState)
  }, [data.endereco, cepState])

  const viacepControllerRef = useRef<AbortController | null>(null)
  const initialCepValidatedRef = useRef(false)
  const originalCepRef = useRef<string | null>(null)

  // Capturar o CEP original ao carregar (modo edição)
  useEffect(() => {
    if (mode === 'edit' && data.endereco?.cep && !originalCepRef.current) {
      const digits = data.endereco.cep.replace(/\D/g, '')
      if (digits.length === 8) {
        console.log('📌 [LocationStep] CEP original capturado:', digits)
        originalCepRef.current = digits
      }
    }
  }, [data.endereco?.cep, mode])

  // Busca automática de endereço por CEP
  // IMPORTANTE: cepState.valid NÃO está nas dependências para evitar loop:
  // quando a busca retorna sucesso, seta valid:true → re-executaria o efeito → abortaria a requisição completada.
  useEffect(() => {
    const cepValue = data.endereco?.cep?.replace(/\D/g, '')
    if (!cepValue) {
      setCepState({ valid: false, message: null })
      return
    }

    if (cepValue.length !== 8) {
      setCepState({ valid: false, message: 'CEP deve conter 8 dígitos.' })
      return
    }

    // NOVA LÓGICA: Se o CEP for o mesmo do banco de dados, não re-validar no ViaCEP
    if (mode === 'edit' && cepValue === originalCepRef.current) {
      console.log('⏭️ [LocationStep] CEP idêntico ao original do banco - pulando busca automática')
      setCepState({ valid: true, message: null })
      return
    }

    // Abort qualquer requisição anterior para o mesmo ciclo
    if (viacepControllerRef.current) {
      viacepControllerRef.current.abort()
    }
    const controller = new AbortController()
    viacepControllerRef.current = controller

    let cancelled = false

    const buscarEndereco = async () => {
      if (cancelled) return
      setBuscandoCep(true)
      console.log('🔍 [LocationStep] Buscando endereço automaticamente para CEP:', cepValue)

      try {
        const enderecoData = await buscarEnderecoPorCep(cepValue)

        // Se foi cancelado enquanto a requisição estava em voo, ignorar resultado
        if (cancelled) return

        if (!enderecoData) {
          setCepState({ valid: false, message: 'CEP não encontrado na base do Correios (ViaCEP).' })
          onUpdate({ endereco: mergeEndereco({ cep: data.endereco?.cep || '' }) })
          return
        }

        console.log('✅ [LocationStep] Endereço encontrado via ViaCEP:', enderecoData)

        const enderecoAtual = mergeEndereco({ cep: data.endereco?.cep || '' })
        const enderecoAtualizado = mergeEndereco({
          endereco: (enderecoData.logradouro || enderecoAtual.endereco || '').trim(),
          bairro: (enderecoData.bairro || enderecoAtual.bairro || '').trim(),
          cidade: (enderecoData.localidade || enderecoAtual.cidade || selectedMunicipio || '').trim(),
          estado: (enderecoData.uf || enderecoAtual.estado || selectedEstado || '').trim(),
          cep: data.endereco?.cep || ''
        })

        setSelectedEstado(enderecoAtualizado.estado)
        setSelectedMunicipio(enderecoAtualizado.cidade)

        onUpdate({ endereco: enderecoAtualizado })
        setCepState({ valid: true, message: null })
      } catch (error: any) {
        if (cancelled || error?.name === 'AbortError') return
        console.error('❌ [LocationStep] Erro ao buscar CEP:', error)
        setCepState({ valid: false, message: 'Não foi possível validar o CEP no momento.' })
      } finally {
        if (!cancelled) {
          setBuscandoCep(false)
          if (viacepControllerRef.current === controller) {
            viacepControllerRef.current = null
          }
        }
      }
    }

    const timeoutId = setTimeout(buscarEndereco, 500)

    // O cleanup só seta 'cancelled' e limpa o timeout — NÃO aborta o controller
    // para não cancelar uma requisição já em voo quando cepState.valid mudar.
    return () => {
      cancelled = true
      clearTimeout(timeoutId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.endereco?.cep, mode])

  const isCepMaskOk = (value: string) => /^[0-9]{5}-[0-9]{3}$/.test(value)

  // "Focus lock" do CEP: se o CEP estiver inválido, não deixa sair do campo (Tab/click)
  const enforceCepValidityOrRefocus = useCallback(() => {
    const current = String(data.endereco?.cep || '')
    const digits = current.replace(/\D/g, '')

    // Se não digitou nada, não força foco (mas o step não avança)
    if (!current) {
      setCepState({ valid: false, message: 'Informe um CEP válido para continuar.' })
      setTimeout(() => cepInputRef.current?.focus(), 0)
      return
    }

    // Máscara incompleta
    if (!isCepMaskOk(current) || digits.length !== 8) {
      setCepState({ valid: false, message: 'CEP deve conter 8 dígitos.' })
      setTimeout(() => cepInputRef.current?.focus(), 0)
      return
    }

    // Está validando no ViaCEP
    if (buscandoCep) {
      setCepState({ valid: false, message: 'Aguarde validar o CEP para continuar.' })
      setTimeout(() => cepInputRef.current?.focus(), 0)
      return
    }

    // Formato ok, mas ViaCEP ainda não confirmou (ou não encontrou)
    if (!cepState.valid) {
      setCepState((prev) => ({ valid: false, message: prev.message || 'Informe um CEP válido para continuar.' }))
      setTimeout(() => cepInputRef.current?.focus(), 0)
      return
    }
  }, [buscandoCep, cepState.valid, data.endereco?.cep])

  // Garantir que CEP pré-existente em modo edição já habilite o passo
  useEffect(() => {
    if (
      mode === 'edit' &&
      !initialCepValidatedRef.current &&
      data.endereco?.cep &&
      data.endereco.cep.replace(/\D/g, '').length === 8
    ) {
      initialCepValidatedRef.current = true
      setCepState({ valid: true, message: null })
    }
  }, [mode, data.endereco?.cep])

  // Atualizar estado local quando data prop mudar (modo de edição)
  useEffect(() => {
    console.log('🔍 LocationStep - data.endereco recebido:', data.endereco)
    console.log('🔍 LocationStep - municipiosData carregado:', !!municipiosData)

    if (data.endereco?.estado) {
      console.log('🔍 LocationStep - Atualizando selectedEstado para:', data.endereco.estado)
      setSelectedEstado(data.endereco.estado)
    }
    if (data.endereco?.cidade) {
      console.log('🔍 LocationStep - Atualizando selectedMunicipio para:', data.endereco.cidade)
      setSelectedMunicipio(data.endereco.cidade)
    }
  }, [data.endereco, municipiosData])

  // REMOVIDO: useEffect redundante que estava sobrescrevendo o número digitado
  // A busca de CEP já atualiza tudo via onUpdate (linha 60-71)
  // A função updateEndereco já faz merge corretamente (linha 163-174)

  const estados = municipiosData ? municipiosData.estados.sort((a, b) => a.nome.localeCompare(b.nome)) : []
  const municipios = selectedEstado && municipiosData
    ? municipiosData.estados.find(e => e.sigla === selectedEstado)?.municipios.sort() || []
    : []

  console.log('🔍 LocationStep - Renderizando com:', {
    selectedEstado,
    selectedMunicipio,
    estadosCount: estados.length,
    municipiosCount: municipios.length,
    municipiosDataLoaded: !!municipiosData,
    estadosDisponiveis: estados.map(e => e.sigla),
    municipiosDisponiveis: municipios.slice(0, 5) // Primeiros 5 para não poluir o log
  })

  const updateEndereco = useCallback((field: string, value: string) => {
    const sanitize = (val: any, shouldTrim = true) =>
      typeof val === 'string' ? (shouldTrim ? val.trim() : val) : val

    const novoEndereco = {
      endereco: sanitize(field === 'endereco' ? value : data.endereco?.endereco || ''),
      numero: sanitize(field === 'numero' ? value : data.endereco?.numero || ''),
      complemento: sanitize(field === 'complemento' ? value : data.endereco?.complemento || '', false),
      bairro: sanitize(field === 'bairro' ? value : data.endereco?.bairro || ''),
      cidade: sanitize(field === 'cidade' ? value : data.endereco?.cidade || ''),
      estado: sanitize(field === 'estado' ? value : data.endereco?.estado || ''),
      cep: sanitize(field === 'cep' ? value : data.endereco?.cep || ''),
      latitude: data.endereco?.latitude,
      longitude: data.endereco?.longitude
    }

    onUpdate({ endereco: novoEndereco })

    if (field === 'cep') {
      setCepState({ valid: false, message: 'Valide o CEP para continuar.' })
    }
  }, [data.endereco, onUpdate])

  const handleEstadoChange = (estado: string) => {
    setSelectedEstado(estado)
    setSelectedMunicipio('') // Reset município quando estado muda

    updateEndereco('estado', estado)
    updateEndereco('cidade', '')
    setCepState((prev) => ({ ...prev, valid: false, message: 'Informe um CEP válido para confirmar a localização.' }))
  }

  const handleMunicipioChange = (municipio: string) => {
    setSelectedMunicipio(municipio)
    updateEndereco('cidade', municipio)
    setCepState((prev) => ({ ...prev, valid: false, message: 'Informe um CEP válido para confirmar a localização.' }))
  }


  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Localização do Imóvel</h2>
        <p className="text-gray-600">
          Selecione o estado e município onde o imóvel está localizado.
        </p>
      </div>

      {/* Campo Código */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <label htmlFor="codigo" className="block text-sm font-medium text-blue-900 mb-2">
              Código do Imóvel
            </label>
            <input
              type="text"
              id="codigo"
              value={data.codigo || ''}
              placeholder="Código será gerado automaticamente"
              className="w-full px-3 py-2 border border-blue-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-100"
              readOnly={true}
            />
            <p className="text-xs text-blue-700 mt-1">
              {mode === 'create'
                ? 'Formato: [FINALIDADE]_[TIPO]_[STATUS]_[ID]'
                : 'Código gerado automaticamente no cadastro'
              }
            </p>
          </div>
        </div>
      </div>


      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Estado */}
        <div>
          <label htmlFor="estado" className="block text-sm font-medium text-gray-700 mb-2">
            Estado *
          </label>
          <select
            id="estado"
            value={selectedEstado}
            onChange={(e) => {
              console.log('🔍 Estado selecionado:', e.target.value)
              handleEstadoChange(e.target.value)
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value="">Selecione o estado</option>
            {estados.map((estado) => (
              <option key={estado.sigla} value={estado.sigla}>
                {estado.nome} ({estado.sigla})
              </option>
            ))}
          </select>
        </div>

        {/* Município */}
        <div>
          <label htmlFor="municipio" className="block text-sm font-medium text-gray-700 mb-2">
            Município *
          </label>
          <select
            id="municipio"
            value={selectedMunicipio}
            onChange={(e) => handleMunicipioChange(e.target.value)}
            disabled={!selectedEstado}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            required
          >
            <option value="">Selecione o município</option>
            {municipios.map((municipio) => (
              <option key={municipio} value={municipio}>
                {municipio}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Informações adicionais do endereço */}
      {selectedEstado && selectedMunicipio && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-sm font-medium text-blue-900 mb-2">Informações do Endereço</h3>
          <p className="text-xs text-blue-700 mb-4">
            💡 Digite o CEP e os campos de Bairro e Endereço serão preenchidos automaticamente
          </p>

          {/* NOVA ORDEM: 1. CEP */}
          <div className="mb-4">
            <label htmlFor="cep" className="block text-sm font-medium text-gray-700 mb-1">
              CEP * {buscandoCep && <span className="text-blue-600 text-xs ml-2">🔍 Buscando endereço...</span>}
            </label>
            <div className="relative">
              <input
                type="text"
                id="cep"
                ref={cepInputRef}
                value={data.endereco?.cep || ''}
                onChange={(e) => {
                  let value = e.target.value.replace(/[^\d]/g, '')

                  // Aplicar máscara
                  if (value.length > 5) {
                    value = value.substring(0, 5) + '-' + value.substring(5, 8)
                  }

                  updateEndereco('cep', value)
                  setCepState({ valid: false, message: 'Valide o CEP para continuar.' })
                }}
                placeholder="00000-000"
                maxLength={9}
                required
                pattern="[0-9]{5}-[0-9]{3}"
                title="CEP deve estar no formato 99999-999"
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 ${data.endereco?.cep && !/^[0-9]{5}-[0-9]{3}$/.test(data.endereco.cep)
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                  : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                onKeyDown={(e) => {
                  if (e.key === 'Tab') {
                    // Bloquear tab se CEP não estiver validado
                    if (!cepState.valid) {
                      e.preventDefault()
                      enforceCepValidityOrRefocus()
                    }
                  }
                }}
                onBlur={() => {
                  // Se tentar sair do campo e não estiver validado, volta o foco
                  if (!cepState.valid) {
                    enforceCepValidityOrRefocus()
                  }
                }}
              />
              {buscandoCep && (
                <div className="absolute right-3 top-2.5">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                </div>
              )}
            </div>
            {data.endereco?.cep && !/^[0-9]{5}-[0-9]{3}$/.test(data.endereco.cep) && (
              <p className="mt-1 text-sm text-red-600">
                CEP deve estar no formato 99999-999
              </p>
            )}
            {cepState.message && (
              <p className="mt-1 text-sm text-red-600">{cepState.message}</p>
            )}
          </div>

          {/* NOVA ORDEM: 2. Bairro (preenchido automaticamente) */}
          <div className="mb-4">
            <label htmlFor="bairro" className="block text-sm font-medium text-gray-700 mb-1">
              Bairro
            </label>
            <input
              type="text"
              id="bairro"
              value={data.endereco?.bairro || ''}
              onChange={(e) => updateEndereco('bairro', e.target.value)}
              placeholder="Nome do bairro"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
            />
          </div>

          {/* NOVA ORDEM: 3. Endereço/Logradouro (preenchido automaticamente) */}
          <div className="mb-4">
            <label htmlFor="endereco" className="block text-sm font-medium text-gray-700 mb-1">
              Endereço/Logradouro
            </label>
            <input
              type="text"
              id="endereco"
              value={data.endereco?.endereco || ''}
              onChange={(e) => updateEndereco('endereco', e.target.value)}
              placeholder="Rua, Avenida, etc."
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
            />
          </div>

          {/* NOVA ORDEM: 4 e 5. Número e Complemento (usuário digita) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="numero" className="block text-sm font-medium text-gray-700 mb-1">
                Número * <span className="text-red-600">(obrigatório)</span>
              </label>
              <input
                type="text"
                id="numero"
                value={data.endereco?.numero || ''}
                onChange={(e) => updateEndereco('numero', e.target.value)}
                placeholder="Digite o número"
                maxLength={10}
                required
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 ${!data.endereco?.numero
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50'
                  : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                  }`}
              />
              {!data.endereco?.numero && (
                <p className="mt-1 text-sm text-red-600">
                  ⚠️ O número do imóvel é obrigatório para continuar
                </p>
              )}
            </div>

            <div>
              <label htmlFor="complemento" className="block text-sm font-medium text-gray-700 mb-1">
                Complemento
              </label>
              <input
                type="text"
                id="complemento"
                value={data.endereco?.complemento || ''}
                onChange={(e) => updateEndereco('complemento', e.target.value)}
                placeholder="Apto, Bloco, etc."
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Resumo da localização */}
      {selectedEstado && selectedMunicipio && (
        <div className="mt-6 p-4 bg-green-50 rounded-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">
                Localização selecionada: {selectedMunicipio}, {municipiosData?.estados.find(e => e.sigla === selectedEstado)?.nome || selectedEstado}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
