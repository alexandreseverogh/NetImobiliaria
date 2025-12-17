'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import {
  Search,
  MapPin,
  Home,
  Building,
  DollarSign,
  Bed,
  Bath,
  Square,
  Car,
  ShowerHead,
  X
} from 'lucide-react'
import { useEstadosCidades } from '@/hooks/useEstadosCidades'
import EstadoSelect from '@/components/shared/EstadoSelect'

type FiltersPayload = {
  tipoId?: number
  estado?: string
  cidade?: string
  bairro?: string
  precoMin?: number
  precoMax?: number
  quartosMin?: number
  quartosMax?: number
  banheirosMin?: number
  banheirosMax?: number
  suitesMin?: number
  suitesMax?: number
  vagasMin?: number
  vagasMax?: number
  areaMin?: number
  areaMax?: number
  operation?: 'DV' | 'DA' // Tipo de operação: Comprar (DV) ou Alugar (DA)
}

type MetadataResponse = {
  tipos: Array<{ id: number; nome: string }>
  priceRange: { min: number; max: number }
  areaRange: { min: number; max: number }
  quartosRange: { min: number; max: number }
  banheirosRange: { min: number; max: number }
  suitesRange: { min: number; max: number }
  vagasRange: { min: number; max: number }
}

interface SearchFormProps {
  onSearch: (filters: FiltersPayload) => void
  onClear: () => void
  isSearching: boolean
  hasActiveFilters: boolean
  initialEstado?: string // Sigla do estado (ex: 'SP')
  initialCidade?: string // Nome da cidade (ex: 'São Paulo')
  onOperationChange?: (operation: 'DV' | 'DA') => void // Callback quando botão Comprar/Alugar é clicado
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0
  }).format(value)

const formatArea = (value: number) => `${value.toLocaleString('pt-BR')} m²`

export type SearchFormFilters = FiltersPayload

export default function SearchForm({
  onSearch,
  onClear,
  isSearching,
  hasActiveFilters,
  initialEstado,
  initialCidade,
  onOperationChange
}: SearchFormProps) {
  const [metadata, setMetadata] = useState<MetadataResponse | null>(null)
  const [metadataLoading, setMetadataLoading] = useState(false) // Iniciar como false - só carregar quando necessário
  const [metadataError, setMetadataError] = useState<string | null>(null)

  const [selectedTipo, setSelectedTipo] = useState('')
  const [selectedEstadoId, setSelectedEstadoId] = useState('')
  const [selectedEstadoSigla, setSelectedEstadoSigla] = useState('')
  const [selectedCidadeId, setSelectedCidadeId] = useState('')
  const [bairro, setBairro] = useState('')
  const [operation, setOperation] = useState<'DV' | 'DA'>('DV') // Default: Comprar (azul)

  const [priceRange, setPriceRange] = useState<[number, number]>([0, 0])
  const [areaRange, setAreaRange] = useState<[number, number]>([0, 0])
  const [quartosRange, setQuartosRange] = useState<[number, number]>([0, 0])
  const [banheirosRange, setBanheirosRange] = useState<[number, number]>([0, 0])
  const [suitesRange, setSuitesRange] = useState<[number, number]>([0, 0])
  const [vagasRange, setVagasRange] = useState<[number, number]>([0, 0])

  const { estados, municipios, loadMunicipios, clearMunicipios } = useEstadosCidades()

  // Refs para rastrear valores iniciais aplicados e prevenir reset quando usuário interage
  const initialEstadoAppliedRef = useRef<string | null>(null)
  const initialCidadeAppliedRef = useRef<string | null>(null)
  const userHasInteractedRef = useRef(false)

  // Log quando props mudam (para debug)
  useEffect(() => {
    console.log('📥 [SEARCH FORM] Props recebidas:', {
      initialEstado,
      initialCidade,
      timestamp: new Date().toISOString()
    })
  }, [initialEstado, initialCidade])

  // Preencher estado e cidade quando recebidos externamente (ex: do modal de geolocalização)
  // Aplicar apenas uma vez quando o valor inicial mudar, não quando o usuário já interagiu
  useEffect(() => {
    // Se o usuário já interagiu manualmente, não aplicar valores iniciais
    if (userHasInteractedRef.current) {
      return
    }

    // Se initialEstado for undefined/null, limpar seleção (modal foi fechado sem escolha)
    if (initialEstado === undefined || initialEstado === null || initialEstado === '') {
      if (selectedEstadoId || selectedEstadoSigla) {
        console.log('🔍 [SEARCH FORM] Limpando estado - modal fechado sem escolha')
        setSelectedEstadoId('')
        setSelectedEstadoSigla('')
        clearMunicipios()
        setSelectedCidadeId('')
        initialEstadoAppliedRef.current = null
      }
      return
    }

    // Aplicar apenas se o initialEstado mudou (não apenas se existe) e estados estão carregados
    if (initialEstado && estados.length > 0) {
      const estadoEncontrado = estados.find(e => e.sigla === initialEstado)
      if (estadoEncontrado) {
        // Aplicar mesmo se já está selecionado, para garantir que está sincronizado
        if (estadoEncontrado.id !== selectedEstadoId || initialEstado !== initialEstadoAppliedRef.current) {
          console.log('🔍 [SEARCH FORM] Preenchendo estado externamente:', initialEstado, 'ID:', estadoEncontrado.id)
          setSelectedEstadoId(estadoEncontrado.id)
          setSelectedEstadoSigla(estadoEncontrado.sigla)
          // Resetar ref da cidade para permitir reaplicação quando municípios forem carregados
          initialCidadeAppliedRef.current = null
          loadMunicipios(estadoEncontrado.id)
          initialEstadoAppliedRef.current = initialEstado
        }
      } else {
        console.warn('⚠️ [SEARCH FORM] Estado não encontrado:', initialEstado)
      }
    }
  }, [initialEstado, estados, selectedEstadoId, selectedEstadoSigla, loadMunicipios, clearMunicipios])

  useEffect(() => {
    // Se o usuário já interagiu manualmente, não aplicar valores iniciais
    if (userHasInteractedRef.current) {
      return
    }

    // Se initialCidade for undefined/null, limpar seleção (modal foi fechado sem escolha)
    if (initialCidade === undefined || initialCidade === null || initialCidade === '') {
      if (selectedCidadeId) {
        console.log('🔍 [SEARCH FORM] Limpando cidade - modal fechado sem escolha')
        setSelectedCidadeId('')
        initialCidadeAppliedRef.current = null
      }
      return
    }

    // Se não há estado selecionado, não podemos aplicar cidade
    if (!selectedEstadoId) {
      console.log('⏳ [SEARCH FORM] Aguardando estado ser selecionado para aplicar cidade:', initialCidade)
      return
    }

    // IMPORTANTE: Aguardar municípios serem carregados antes de aplicar cidade
    if (municipios.length === 0) {
      console.log('⏳ [SEARCH FORM] Aguardando municípios serem carregados para aplicar cidade:', initialCidade)
      return
    }

    // Tentar encontrar a cidade nos municípios carregados
    const cidadeEncontrada = municipios.find(m => {
      const nomeCidade = m.nome.toLowerCase().trim()
      const nomeInicial = initialCidade.toLowerCase().trim()
      return nomeCidade === nomeInicial ||
             nomeCidade.includes(nomeInicial) ||
             nomeInicial.includes(nomeCidade)
    })

    if (cidadeEncontrada) {
      // Aplicar mesmo se já está selecionado, para garantir que está sincronizado
      // Verificar se a cidade mudou OU se ainda não foi aplicada
      if (cidadeEncontrada.id !== selectedCidadeId || initialCidade !== initialCidadeAppliedRef.current) {
        console.log('✅ [SEARCH FORM] Preenchendo cidade externamente:', {
          cidadeNome: initialCidade,
          cidadeId: cidadeEncontrada.id,
          municipiosCarregados: municipios.length,
          estadoId: selectedEstadoId
        })
        setSelectedCidadeId(cidadeEncontrada.id)
        initialCidadeAppliedRef.current = initialCidade
      } else {
        console.log('ℹ️ [SEARCH FORM] Cidade já aplicada:', initialCidade, 'ID:', cidadeEncontrada.id)
      }
    } else {
      console.warn('⚠️ [SEARCH FORM] Cidade não encontrada:', {
        cidadeProcurada: initialCidade,
        municipiosDisponiveis: municipios.length,
        primeirosMunicipios: municipios.slice(0, 10).map(m => m.nome)
      })
    }
  }, [initialCidade, municipios, selectedEstadoId, selectedCidadeId])

  // Monitorar quando cidade é aplicada para garantir carregamento de metadados
  useEffect(() => {
    if (selectedCidadeId && selectedEstadoSigla && municipios.length > 0 && !userHasInteractedRef.current) {
      const cidadeSelecionada = municipios.find(c => c.id === selectedCidadeId)
      if (cidadeSelecionada && initialCidade && initialCidade === initialCidadeAppliedRef.current) {
        console.log('🔄 [SEARCH FORM] Cidade aplicada do modal, verificando metadados:', {
          cidadeId: selectedCidadeId,
          cidadeNome: cidadeSelecionada.nome,
          estado: selectedEstadoSigla,
          temMetadata: !!metadata,
          metadataLoading
        })
        // Se não há metadados e não está carregando, forçar verificação
        if (!metadata && !metadataLoading) {
          console.log('⚠️ [SEARCH FORM] Metadados não carregados após cidade ser aplicada, forçando verificação...')
        }
      }
    }
  }, [selectedCidadeId, selectedEstadoSigla, municipios.length, initialCidade, metadata, metadataLoading])

  // Carregar metadados apenas quando estado e cidade estiverem selecionados
  useEffect(() => {
    console.log('🔍 [SEARCH FORM] useEffect metadados - Verificando condições:', {
      selectedEstadoSigla,
      selectedCidadeId,
      municipiosLength: municipios.length,
      hasMetadata: !!metadata,
      initialEstado,
      initialCidade
    })

    // Não carregar se não tiver estado selecionado (cidade é opcional)
    if (!selectedEstadoSigla || municipios.length === 0) {
      // Limpar metadados se estado foi desmarcado
      if (metadata) {
        console.log('🔍 [SEARCH FORM] Limpando metadados - estado desmarcado')
        setMetadata(null)
        setMetadataLoading(false)
        setMetadataError(null)
        // Resetar ranges para valores padrão vazios
        setPriceRange([0, 0])
        setAreaRange([0, 0])
        setQuartosRange([0, 0])
        setBanheirosRange([0, 0])
        setSuitesRange([0, 0])
        setVagasRange([0, 0])
      } else {
        console.log('⏳ [SEARCH FORM] Aguardando condições para carregar metadados:', {
          faltaEstado: !selectedEstadoSigla,
          faltaMunicipios: municipios.length === 0
        })
      }
      return
    }

    // Cidade é opcional - buscar apenas se selecionada
    const cidadeSelecionada = selectedCidadeId ? municipios.find(c => c.id === selectedCidadeId) : null

    console.log('✅ [SEARCH FORM] Condições satisfeitas para carregar metadados:', {
      estado: selectedEstadoSigla,
      cidade: cidadeSelecionada?.nome || 'Não selecionada',
      cidadeId: selectedCidadeId || 'Não selecionada'
    })

    let isMounted = true

    const loadMetadata = async () => {
      try {
        setMetadataLoading(true)
        setMetadataError(null)
        
        // IMPORTANTE: Resetar ranges imediatamente quando operation muda para evitar conflitos
        // Isso garante que os sliders não fiquem travados com valores antigos
        setPriceRange([0, 0])
        setAreaRange([0, 0])
        setQuartosRange([0, 0])
        setBanheirosRange([0, 0])
        setSuitesRange([0, 0])
        setVagasRange([0, 0])
        
        // Buscar nome da cidade selecionada (opcional)
        const cidadeSelecionada = selectedCidadeId ? municipios.find(c => c.id === selectedCidadeId) : null
        const cidadeNome = cidadeSelecionada?.nome || ''
        
        console.log('✅ [SEARCH FORM] Carregando metadados para:', {
          estado: selectedEstadoSigla,
          cidade: cidadeNome || 'Não selecionada',
          cidadeId: selectedCidadeId || 'Não selecionada',
          operation
        })
        
        // Construir URL com estado, cidade (opcional), tipo e operation
        const params = new URLSearchParams()
        if (operation) params.append('tipo_destaque', operation)
        params.append('estado', selectedEstadoSigla)
        // Cidade é opcional - só adicionar se selecionada
        if (cidadeNome) {
          params.append('cidade', cidadeNome)
        }
        if (selectedTipo) params.append('tipo_id', selectedTipo)
        
        const url = `/api/public/imoveis/filtros?${params.toString()}`
        const response = await fetch(url)
        const json = await response.json()
        
        if (!response.ok || !json.success) {
          throw new Error(json.error || 'Erro ao buscar filtros')
        }
        
        if (!isMounted) return
        
        console.log('✅ [SEARCH FORM] Metadados carregados:', json.metadata)
        
        // Atualizar metadados e ranges apenas após confirmar que a resposta é válida
        // IMPORTANTE: Garantir que os ranges sempre tenham espaço suficiente para o gap mínimo
        setMetadata(json.metadata)
        
        // Quando há apenas 1 imóvel, min e max devem ser iguais
        // Quando há múltiplos imóveis, garantir diferença mínima apenas se necessário
        const priceMin = json.metadata.priceRange.min || 0
        const priceMax = json.metadata.priceRange.max || 0
        const priceGap = 5000 // Gap mínimo para preço
        
        // Se min e max são iguais (apenas 1 imóvel), manter iguais
        // Caso contrário, garantir gap mínimo apenas se necessário
        let validPriceMax = priceMax
        if (priceMin === priceMax) {
          // Manter iguais quando há apenas 1 imóvel
          validPriceMax = priceMax
        } else if (priceMax - priceMin < priceGap) {
          // Garantir gap mínimo para múltiplos imóveis
          validPriceMax = priceMin + priceGap
          console.log('⚠️ [SEARCH FORM] Ajustando priceMax para garantir gap mínimo:', {
            originalMax: priceMax,
            newMax: validPriceMax,
            min: priceMin,
            gap: priceGap
          })
        }
        setPriceRange([priceMin, validPriceMax])
        
        // Quando há apenas 1 imóvel, min e max devem ser iguais
        const areaMin = json.metadata.areaRange.min || 0
        const areaMax = json.metadata.areaRange.max || 0
        const areaGap = 5 // Gap mínimo para área
        
        // Se min e max são iguais (apenas 1 imóvel), manter iguais
        let validAreaMax = areaMax
        if (areaMin === areaMax) {
          // Manter iguais quando há apenas 1 imóvel
          validAreaMax = areaMax
        } else if (areaMax - areaMin < areaGap) {
          // Garantir gap mínimo para múltiplos imóveis
          validAreaMax = areaMin + areaGap
          console.log('⚠️ [SEARCH FORM] Ajustando areaMax para garantir gap mínimo:', {
            originalMax: areaMax,
            newMax: validAreaMax,
            min: areaMin,
            gap: areaGap
          })
        }
        setAreaRange([areaMin, validAreaMax])
        
        // Quando há apenas 1 imóvel, todos os ranges devem ter min = max
        const isSingleImovel = priceMin === priceMax && areaMin === areaMax
        setQuartosRange([
          isSingleImovel ? (json.metadata.quartosRange?.max || 0) : (json.metadata.quartosRange?.min || 0),
          json.metadata.quartosRange?.max || 0
        ])
        setBanheirosRange([
          isSingleImovel ? (json.metadata.banheirosRange?.max || 0) : (json.metadata.banheirosRange?.min || 0),
          json.metadata.banheirosRange?.max || 0
        ])
        setSuitesRange([
          isSingleImovel ? (json.metadata.suitesRange?.max || 0) : (json.metadata.suitesRange?.min || 0),
          json.metadata.suitesRange?.max || 0
        ])
        setVagasRange([
          isSingleImovel ? (json.metadata.vagasRange?.max || 0) : (json.metadata.vagasRange?.min || 0),
          json.metadata.vagasRange?.max || 0
        ])
      } catch (error) {
        console.error('❌ [SEARCH FORM] Erro ao carregar metadados de filtros:', error)
        if (isMounted) {
          setMetadataError('Não foi possível carregar as opções de filtros.')
        }
      } finally {
        if (isMounted) {
          setMetadataLoading(false)
        }
      }
    }

    loadMetadata()

    return () => {
      isMounted = false
    }
  }, [operation, selectedEstadoSigla, selectedCidadeId, selectedTipo, municipios])

  const handleEstadoChange = (estadoId: string) => {
    // Marcar que o usuário interagiu manualmente
    userHasInteractedRef.current = true
    setSelectedEstadoId(estadoId)
    const estadoSelecionado = estados.find((estado) => estado.id === estadoId)
    if (estadoSelecionado) {
      setSelectedEstadoSigla(estadoSelecionado.sigla)
      loadMunicipios(estadoId)
    } else {
      setSelectedEstadoSigla('')
      clearMunicipios()
    }
    setSelectedCidadeId('')
  }

  const handleCidadeChange = (cidadeId: string) => {
    // Marcar que o usuário interagiu manualmente
    userHasInteractedRef.current = true
    setSelectedCidadeId(cidadeId)
  }

  const handleRangeChange = (
    value: number,
    position: 'min' | 'max',
    state: [number, number],
    setState: (value: [number, number]) => void,
    minGap: number = 0,
    metadataRange?: { min: number; max: number }
  ) => {
    const [currentMin, currentMax] = state
    
    // Validar valor contra os limites dos metadados se fornecidos
    let validatedValue = value
    if (metadataRange) {
      validatedValue = Math.max(metadataRange.min, Math.min(value, metadataRange.max))
    }
    
    console.log('🔍 [handleRangeChange]', {
      position,
      value,
      validatedValue,
      currentMin,
      currentMax,
      minGap,
      metadataRange
    })
    
    if (position === 'min') {
      // Para o mínimo: permitir movimento livre
      const minAllowed = metadataRange ? metadataRange.min : -Infinity
      const maxAllowed = metadataRange ? metadataRange.max : Infinity
      
      // IMPORTANTE: Se a diferença entre max e min dos metadados for menor que o gap mínimo,
      // reduzir o gap mínimo para permitir movimento
      const availableRange = maxAllowed - minAllowed
      const effectiveGap = availableRange < minGap ? Math.max(0, availableRange - 1) : minGap
      
      // Permitir que o novo mínimo seja o valor validado, respeitando os limites dos metadados
      let newMin = Math.max(minAllowed, validatedValue)
      
      // Se o novo mínimo violar o gap mínimo (for maior que currentMax - effectiveGap),
      // ajustar o máximo para manter o gap
      if (newMin > currentMax - effectiveGap) {
        // Se possível, aumentar o máximo para manter o gap
        const newMax = Math.min(maxAllowed, newMin + effectiveGap)
        console.log('🔍 [handleRangeChange MIN] Ajustando ambos para manter gap:', { newMin, newMax, effectiveGap })
        setState([newMin, newMax])
      } else {
        // Caso contrário, apenas atualizar o mínimo
        console.log('🔍 [handleRangeChange MIN] Apenas mínimo:', { newMin, currentMax })
        setState([newMin, currentMax])
      }
    } else {
      // Para o máximo: permitir movimento livre
      const minAllowed = metadataRange ? metadataRange.min : -Infinity
      const maxAllowed = metadataRange ? metadataRange.max : Infinity
      
      // IMPORTANTE: Se a diferença entre max e min dos metadados for menor que o gap mínimo,
      // reduzir o gap mínimo para permitir movimento
      const availableRange = maxAllowed - minAllowed
      const effectiveGap = availableRange < minGap ? Math.max(0, availableRange - 1) : minGap
      
      // Permitir que o novo máximo seja o valor validado, respeitando os limites dos metadados
      let newMax = Math.min(validatedValue, maxAllowed)
      
      // Se o novo máximo violar o gap mínimo (for menor que currentMin + effectiveGap),
      // ajustar o mínimo para manter o gap
      if (newMax < currentMin + effectiveGap) {
        // Se possível, reduzir o mínimo para manter o gap
        const newMin = Math.max(minAllowed, newMax - effectiveGap)
        console.log('🔍 [handleRangeChange MAX] Ajustando ambos para manter gap:', { newMin, newMax, effectiveGap })
        setState([newMin, newMax])
      } else {
        // Caso contrário, apenas atualizar o máximo
        console.log('🔍 [handleRangeChange MAX] Apenas máximo:', { currentMin, newMax })
        setState([currentMin, newMax])
      }
    }
  }

  const hasMetadata = !!metadata && !metadataLoading && !metadataError

  // Debug: Log do estado atual
  useEffect(() => {
    console.log('🔍 [SEARCH FORM] Estado atual completo:', {
      initialEstado,
      initialCidade,
      selectedEstadoId,
      selectedEstadoSigla,
      selectedCidadeId,
      hasMetadata,
      metadataLoading,
      metadataError,
      metadata: metadata ? 'carregado' : 'não carregado',
      municipiosCount: municipios.length,
      userHasInteracted: userHasInteractedRef.current,
      initialEstadoApplied: initialEstadoAppliedRef.current,
      initialCidadeApplied: initialCidadeAppliedRef.current
    })
  }, [initialEstado, initialCidade, selectedEstadoId, selectedEstadoSigla, selectedCidadeId, hasMetadata, metadataLoading, metadataError, metadata, municipios.length])

  // Função para disparar busca automaticamente quando botão Comprar/Alugar é clicado
  const handleAutoSearch = (newOperation: 'DV' | 'DA') => {
    // Construir payload com os filtros atuais
    const payload: FiltersPayload = {}

    if (selectedTipo) {
      payload.tipoId = Number(selectedTipo)
    }
    if (selectedEstadoSigla) {
      payload.estado = selectedEstadoSigla
    }
    if (selectedCidadeId && municipios.length > 0) {
      const cidadeSelecionada = municipios.find((cidade) => cidade.id === selectedCidadeId)
      if (cidadeSelecionada) {
        payload.cidade = cidadeSelecionada.nome
      }
    }
    if (bairro.trim()) {
      payload.bairro = bairro.trim()
    }
    if (priceRange[0] > (metadata?.priceRange.min ?? 0)) {
      payload.precoMin = priceRange[0]
    }
    if (priceRange[1] < (metadata?.priceRange.max ?? 0)) {
      payload.precoMax = priceRange[1]
    }
    if (areaRange[0] > (metadata?.areaRange.min ?? 0)) {
      payload.areaMin = areaRange[0]
    }
    if (areaRange[1] < (metadata?.areaRange.max ?? 0)) {
      payload.areaMax = areaRange[1]
    }
    if (quartosRange[0] > 0) {
      payload.quartosMin = quartosRange[0]
    }
    if (quartosRange[1] < (metadata?.quartosRange?.max ?? 10)) {
      payload.quartosMax = quartosRange[1]
    }
    if (banheirosRange[0] > 0) {
      payload.banheirosMin = banheirosRange[0]
    }
    if (banheirosRange[1] < (metadata?.banheirosRange?.max ?? 10)) {
      payload.banheirosMax = banheirosRange[1]
    }
    if (suitesRange[0] > 0) {
      payload.suitesMin = suitesRange[0]
    }
    if (suitesRange[1] < (metadata?.suitesRange?.max ?? 5)) {
      payload.suitesMax = suitesRange[1]
    }
    if (vagasRange[0] > 0) {
      payload.vagasMin = vagasRange[0]
    }
    if (vagasRange[1] < (metadata?.vagasRange?.max ?? 5)) {
      payload.vagasMax = vagasRange[1]
    }

    // Adicionar operation ao payload
    payload.operation = newOperation

    // Log para debug
    console.log('🔍 [SearchForm] Auto-busca disparada ao clicar em botão:', {
      operation: payload.operation,
      estado: payload.estado,
      cidade: payload.cidade,
      todosFiltros: payload
    })

    // Disparar busca apenas se houver estado selecionado (cidade é opcional)
    if (payload.estado) {
      onSearch(payload)
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    const payload: FiltersPayload = {}

    if (selectedTipo) {
      payload.tipoId = Number(selectedTipo)
    }
    if (selectedEstadoSigla) {
      payload.estado = selectedEstadoSigla
    }
    if (selectedCidadeId && municipios.length > 0) {
      const cidadeSelecionada = municipios.find((cidade) => cidade.id === selectedCidadeId)
      if (cidadeSelecionada) {
        payload.cidade = cidadeSelecionada.nome
      }
    }
    if (bairro.trim()) {
      payload.bairro = bairro.trim()
    }
    if (priceRange[0] > (metadata?.priceRange.min ?? 0)) {
      payload.precoMin = priceRange[0]
    }
    if (priceRange[1] < (metadata?.priceRange.max ?? 0)) {
      payload.precoMax = priceRange[1]
    }
    if (areaRange[0] > (metadata?.areaRange.min ?? 0)) {
      payload.areaMin = areaRange[0]
    }
    if (areaRange[1] < (metadata?.areaRange.max ?? 0)) {
      payload.areaMax = areaRange[1]
    }
    if (quartosRange[0] > 0) {
      payload.quartosMin = quartosRange[0]
    }
    if (quartosRange[1] < (metadata?.quartosRange?.max ?? 10)) {
      payload.quartosMax = quartosRange[1]
    }
    if (banheirosRange[0] > 0) {
      payload.banheirosMin = banheirosRange[0]
    }
    if (banheirosRange[1] < (metadata?.banheirosRange?.max ?? 10)) {
      payload.banheirosMax = banheirosRange[1]
    }
    if (suitesRange[0] > 0) {
      payload.suitesMin = suitesRange[0]
    }
    if (suitesRange[1] < (metadata?.suitesRange?.max ?? 5)) {
      payload.suitesMax = suitesRange[1]
    }
    if (vagasRange[0] > 0) {
      payload.vagasMin = vagasRange[0]
    }
    if (vagasRange[1] < (metadata?.vagasRange?.max ?? 5)) {
      payload.vagasMax = vagasRange[1]
    }

    // Adicionar operation ao payload para filtrar por vender_landpaging ou alugar_landpaging
    // operation sempre deve ser enviado, mesmo que não haja outros filtros
    payload.operation = operation

    // Log para debug
    console.log('🔍 [SearchForm] Enviando payload com filtros:', {
      operation: payload.operation,
      estado: payload.estado,
      cidade: payload.cidade,
      todosFiltros: payload
    })

    // Verificar se há filtros além do operation
    const hasOtherFilters = Object.keys(payload).filter(key => key !== 'operation').length > 0

    // Se não houver outros filtros além do operation, ainda assim enviar para aplicar o filtro de finalidade
    // Mas se não houver nenhum filtro (nem operation), não enviar
    if (!hasOtherFilters && !payload.operation) {
      return
    }

    // IMPORTANTE: Recalcular metadados com base nos filtros aplicados (EXCETO preço e área)
    // Isso garante que os sliders de preço e área reflitam apenas os imóveis que correspondem aos outros filtros
    // Não incluímos preço e área porque esses são os valores que queremos calcular
    try {
      setMetadataLoading(true)
      setMetadataError(null)
      
      // Buscar nome da cidade selecionada (opcional)
      const cidadeSelecionada = selectedCidadeId ? municipios.find(c => c.id === selectedCidadeId) : null
      const cidadeNome = cidadeSelecionada?.nome || ''
      
      // Construir URL com filtros aplicados para recalcular metadados
      const params = new URLSearchParams()
      if (operation) params.append('tipo_destaque', operation)
      if (selectedEstadoSigla) params.append('estado', selectedEstadoSigla)
      if (cidadeNome) params.append('cidade', cidadeNome)
      if (selectedTipo) params.append('tipo_id', selectedTipo)
      
      // Adicionar filtros aplicados (EXCETO preço e área) para recalcular metadados baseados nos imóveis filtrados
      // Não incluímos preço e área porque esses são os valores que queremos calcular
      if (payload.quartosMin !== undefined) params.append('quartosMin', payload.quartosMin.toString())
      if (payload.quartosMax !== undefined) params.append('quartosMax', payload.quartosMax.toString())
      if (payload.banheirosMin !== undefined) params.append('banheirosMin', payload.banheirosMin.toString())
      if (payload.banheirosMax !== undefined) params.append('banheirosMax', payload.banheirosMax.toString())
      if (payload.suitesMin !== undefined) params.append('suitesMin', payload.suitesMin.toString())
      if (payload.suitesMax !== undefined) params.append('suitesMax', payload.suitesMax.toString())
      if (payload.vagasMin !== undefined) params.append('vagasMin', payload.vagasMin.toString())
      if (payload.vagasMax !== undefined) params.append('vagasMax', payload.vagasMax.toString())
      if (payload.bairro) params.append('bairro', payload.bairro)
      
      const url = `/api/public/imoveis/filtros?${params.toString()}`
      const response = await fetch(url)
      const json = await response.json()
      
      if (response.ok && json.success) {
        console.log('✅ [SEARCH FORM] Metadados recalculados após aplicar filtros:', json.metadata)
        
        // Atualizar metadados e ranges com base nos imóveis filtrados
        setMetadata(json.metadata)
        
        // Quando há apenas 1 imóvel, min e max devem ser iguais
        const priceMin = json.metadata.priceRange.min || 0
        const priceMax = json.metadata.priceRange.max || 0
        const priceGap = 5000
        
        let validPriceMax = priceMax
        if (priceMin === priceMax) {
          validPriceMax = priceMax
        } else if (priceMax - priceMin < priceGap) {
          validPriceMax = priceMin + priceGap
        }
        setPriceRange([priceMin, validPriceMax])
        
        const areaMin = json.metadata.areaRange.min || 0
        const areaMax = json.metadata.areaRange.max || 0
        const areaGap = 5
        
        let validAreaMax = areaMax
        if (areaMin === areaMax) {
          validAreaMax = areaMax
        } else if (areaMax - areaMin < areaGap) {
          validAreaMax = areaMin + areaGap
        }
        setAreaRange([areaMin, validAreaMax])
        
        // Quando há apenas 1 imóvel, todos os ranges devem ter min = max
        const isSingleImovel = priceMin === priceMax && areaMin === areaMax
        setQuartosRange([
          isSingleImovel ? (json.metadata.quartosRange?.max || 0) : (json.metadata.quartosRange?.min || 0),
          json.metadata.quartosRange?.max || 0
        ])
        setBanheirosRange([
          isSingleImovel ? (json.metadata.banheirosRange?.max || 0) : (json.metadata.banheirosRange?.min || 0),
          json.metadata.banheirosRange?.max || 0
        ])
        setSuitesRange([
          isSingleImovel ? (json.metadata.suitesRange?.max || 0) : (json.metadata.suitesRange?.min || 0),
          json.metadata.suitesRange?.max || 0
        ])
        setVagasRange([
          isSingleImovel ? (json.metadata.vagasRange?.max || 0) : (json.metadata.vagasRange?.min || 0),
          json.metadata.vagasRange?.max || 0
        ])
      }
    } catch (error) {
      console.error('❌ [SEARCH FORM] Erro ao recalcular metadados após aplicar filtros:', error)
      // Não bloquear a busca mesmo se houver erro ao recalcular metadados
    } finally {
      setMetadataLoading(false)
    }

    onSearch(payload)
  }

  const handleClear = () => {
    setSelectedTipo('')
    setSelectedEstadoId('')
    setSelectedEstadoSigla('')
    setSelectedCidadeId('')
    setBairro('')
    setOperation('DV') // Reset para Comprar (azul)
    // Resetar flags de interação para permitir que valores iniciais sejam aplicados novamente
    userHasInteractedRef.current = false
    initialEstadoAppliedRef.current = null
    initialCidadeAppliedRef.current = null
    // Limpar metadados quando limpar filtros
    setMetadata(null)
    setMetadataLoading(false)
    setMetadataError(null)
    // Resetar ranges para valores padrão vazios
    setPriceRange([0, 0])
    setAreaRange([0, 0])
    setQuartosRange([0, 0])
    setBanheirosRange([0, 0])
    setSuitesRange([0, 0])
    setVagasRange([0, 0])
    clearMunicipios()
    onClear()
  }

  const disableApplyButton = isSearching || metadataLoading || !metadata

  const resumoOperacao = useMemo(() => {
    return operation === 'DV' ? 'Comprar' : 'Alugar'
  }, [operation])

  const textoComplementar = useMemo(() => {
    return operation === 'DV' ? 'Imóveis para Comprar' : 'Imóveis para Alugar'
  }, [operation])

  return (
    <div className="bg-white/95 text-gray-900 rounded-[32px] shadow-2xl border border-white/40 p-3 sm:p-4 lg:p-5 backdrop-blur w-full max-w-[2496px] mx-auto">
      <div className="flex flex-col lg:flex-row gap-2 lg:gap-4 items-start lg:items-center justify-between border-b border-gray-100 pb-2 mb-3">
        <div className="text-left flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base md:text-lg font-bold tracking-wide text-primary-200">
              Encontre o imóvel da sua preferência
            </p>
            <span className={`text-sm md:text-base font-extrabold italic tracking-wide ${
              operation === 'DV' 
                ? 'text-blue-500 drop-shadow-lg bg-blue-50/30 px-1.5 py-0.5 rounded-lg border border-blue-300/50' 
                : 'text-green-500 drop-shadow-lg bg-green-50/30 px-1.5 py-0.5 rounded-lg border border-green-300/50'
            } transition-all duration-300`}>
              - {textoComplementar}
            </span>
          </div>
          <h3 className="text-lg md:text-xl font-semibold text-white">
            Refinar busca ({resumoOperacao})
          </h3>
        </div>

        <div className="flex w-full lg:w-auto rounded-lg border-2 border-gray-200 overflow-hidden">
          <button
            type="button"
            onClick={() => {
              setOperation('DV')
              onOperationChange?.('DV')
              // Disparar busca automaticamente quando botão é clicado
              handleAutoSearch('DV')
            }}
            className="px-4 py-3 text-base font-medium text-white bg-blue-600"
          >
            <Home className="w-4 h-4 inline mr-2" />
            Comprar
          </button>
          <button
            type="button"
            onClick={() => {
              setOperation('DA')
              onOperationChange?.('DA')
              // Disparar busca automaticamente quando botão é clicado
              handleAutoSearch('DA')
            }}
            className="px-4 py-3 text-base font-medium text-white bg-green-600"
          >
            <Building className="w-4 h-4 inline mr-2" />
            Alugar
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Primeira linha: Tipo, Estado, Cidade, Bairro - SEMPRE VISÍVEIS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1 tracking-wide pl-2.5">
                Tipo de Imóvel
              </label>
              <select
                value={selectedTipo}
                onChange={(event) => setSelectedTipo(event.target.value)}
                disabled={!hasMetadata}
                className="w-full px-2.5 py-2 text-base border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none transition-colors disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                <option value="">Todos os tipos</option>
                {metadata?.tipos.map((tipo) => (
                  <option key={tipo.id} value={tipo.id}>
                    {tipo.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1 tracking-wide pl-2.5">
                Estado
              </label>
              <EstadoSelect
                value={selectedEstadoId}
                onChange={handleEstadoChange}
                placeholder="Todos os estados"
                className="w-full px-2.5 py-2 text-base border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none transition-colors"
                format="sigla-nome"
                showAllOption={true}
                allOptionLabel="Todos os estados"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1 tracking-wide pl-2.5">
                Cidade
              </label>
              <select
                value={selectedCidadeId}
                onChange={(event) => handleCidadeChange(event.target.value)}
disabled={false}
                className="w-full px-2.5 py-2 text-base border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none transition-colors disabled:bg-gray-100 disabled:text-gray-400"
              >
                <option value="">Todas as cidades</option>
                {municipios.map((municipio) => (
                  <option key={municipio.id} value={municipio.id}>
                    {municipio.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1 tracking-wide pl-2.5">
                Bairro
              </label>
              <div className="relative">
                <MapPin className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Digite o bairro"
                  value={bairro}
                  onChange={(event) => setBairro(event.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-base border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Mensagem quando não há metadados */}
          {!hasMetadata && (
            <div className="border border-dashed border-gray-200 rounded-2xl p-6 text-center text-gray-500 bg-gray-50">
              {metadataLoading
                ? (
                  <div className="flex items-center justify-center gap-2">
                    <span className="h-5 w-5 rounded-full border-2 border-gray-400 border-t-transparent animate-spin" />
                    <span className="text-base">Carregando opções de filtros...</span>
                  </div>
                )
                : metadataError 
                ? <span className="text-base text-red-600">Não foi possível carregar os filtros.</span>
                : <span className="text-base">Selecione Estado para carregar as opções de filtros avançados.</span>}
            </div>
          )}

          {/* Segunda linha: Sliders - Faixa de Valores, Área Mínima, Quartos, Suites, Banheiros, Garagem - SÓ QUANDO HÁ METADADOS */}
          {hasMetadata && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-[6.24fr_6.24fr_2fr_2fr_2fr_2fr] gap-4">
            {/* Faixa de Valores */}
            <div className="flex flex-col h-full">
              <label className="block text-xs font-semibold text-gray-600 mb-1 tracking-wide pl-2.5 h-[20px]">
                Faixa de Valores
              </label>
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-gray-300/50 shadow-inner p-2 flex-1 flex flex-col min-h-[80px]">
                <div className="flex items-center justify-between text-xs font-bold text-gray-800 mb-1.5 h-[24px]">
                  <span className="bg-white px-2 py-1 rounded text-xs shadow-sm">{formatCurrency(priceRange[0])}</span>
                  <DollarSign className="w-4 h-4 text-gray-500" />
                  <span className="bg-white px-2 py-1 rounded text-xs shadow-sm">{formatCurrency(priceRange[1])}</span>
                </div>
                <div className="relative pt-2 pb-1.5 h-[32px] px-[7px] overflow-hidden">
                  <div className="absolute top-1/2 left-[7px] right-[7px] h-0.5 bg-gray-200 rounded-full" />
                  <div
                    className="absolute top-1/2 h-0.5 bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 rounded-full"
                    style={{
                      left: `calc(7px + ${
                        ((priceRange[0] - metadata!.priceRange.min) /
                          Math.max(metadata!.priceRange.max - metadata!.priceRange.min, 1)) *
                        (100 - 14)
                      }%)`,
                      right: priceRange[0] === priceRange[1] && metadata!.priceRange.min === metadata!.priceRange.max
                        ? `calc(7px + ${(100 - 14) * (1 - ((priceRange[1] - metadata!.priceRange.min) / Math.max(metadata!.priceRange.max - metadata!.priceRange.min, 1)))}%)`
                        : `calc(7px + ${
                            (100 -
                            ((priceRange[1] - metadata!.priceRange.min) /
                              Math.max(metadata!.priceRange.max - metadata!.priceRange.min, 1)) *
                              100) *
                            (100 - 14) / 100
                          }%)`
                    }}
                  />
                  <input
                    type="range"
                    min={metadata!.priceRange.min}
                    max={metadata!.priceRange.max}
                    value={priceRange[0]}
                    onChange={(event) =>
                      handleRangeChange(Number(event.target.value), 'min', priceRange, setPriceRange, priceRange[0] === priceRange[1] ? 0 : 5000, metadata!.priceRange)
                    }
                    className="dual-slider"
                    style={{ zIndex: priceRange[0] > priceRange[1] ? 5 : 3, left: '7px', right: '7px', width: 'calc(100% - 14px)' }}
                  />
                  <input
                    type="range"
                    min={metadata!.priceRange.min}
                    max={metadata!.priceRange.max}
                    value={priceRange[1]}
                    onChange={(event) =>
                      handleRangeChange(Number(event.target.value), 'max', priceRange, setPriceRange, priceRange[0] === priceRange[1] ? 0 : 5000, metadata!.priceRange)
                    }
                    className="dual-slider"
                    style={{ zIndex: 4, left: '7px', right: '7px', width: 'calc(100% - 14px)' }}
                  />
                </div>
              </div>
            </div>

            {/* Área Mínima */}
            <div className="flex flex-col h-full">
              <label className="block text-xs font-semibold text-gray-600 mb-1 tracking-wide pl-2.5 h-[20px]">
                Área Mínima
              </label>
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-gray-300/50 shadow-inner p-2 flex-1 flex flex-col min-h-[80px]">
                <div className="flex items-center justify-between text-xs font-bold text-gray-800 mb-1.5 h-[24px]">
                  <span className="bg-white px-2 py-1 rounded text-xs shadow-sm">{formatArea(areaRange[0])}</span>
                  <Square className="w-4 h-4 text-gray-500" />
                  <span className="bg-white px-2 py-1 rounded text-xs shadow-sm">{formatArea(areaRange[1])}</span>
                </div>
                <div className="relative pt-2 pb-1.5 h-[32px] px-[7px] overflow-hidden">
                  <div className="absolute top-1/2 left-[7px] right-[7px] h-0.5 bg-gray-200 rounded-full" />
                  <div
                    className="absolute top-1/2 h-0.5 bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 rounded-full"
                    style={{
                      left: `calc(7px + ${
                        ((areaRange[0] - metadata!.areaRange.min) /
                          Math.max(metadata!.areaRange.max - metadata!.areaRange.min, 1)) *
                        (100 - 14)
                      }%)`,
                      right: areaRange[0] === areaRange[1] && metadata!.areaRange.min === metadata!.areaRange.max
                        ? `calc(7px + ${(100 - 14) * (1 - ((areaRange[1] - metadata!.areaRange.min) / Math.max(metadata!.areaRange.max - metadata!.areaRange.min, 1)))}%)`
                        : `calc(7px + ${
                            (100 -
                            ((areaRange[1] - metadata!.areaRange.min) /
                              Math.max(metadata!.areaRange.max - metadata!.areaRange.min, 1)) *
                              100) *
                            (100 - 14) / 100
                          }%)`
                    }}
                  />
                  <input
                    type="range"
                    min={metadata!.areaRange.min}
                    max={metadata!.areaRange.max}
                    value={areaRange[0]}
                    onChange={(event) =>
                      handleRangeChange(Number(event.target.value), 'min', areaRange, setAreaRange, areaRange[0] === areaRange[1] ? 0 : 5, metadata!.areaRange)
                    }
                    className="dual-slider"
                    style={{ zIndex: areaRange[0] > areaRange[1] ? 5 : 3, left: '7px', right: '7px', width: 'calc(100% - 14px)' }}
                  />
                  <input
                    type="range"
                    min={metadata!.areaRange.min}
                    max={metadata!.areaRange.max}
                    value={areaRange[1]}
                    onChange={(event) =>
                      handleRangeChange(Number(event.target.value), 'max', areaRange, setAreaRange, areaRange[0] === areaRange[1] ? 0 : 5, metadata!.areaRange)
                    }
                    className="dual-slider"
                    style={{ zIndex: 4, left: '7px', right: '7px', width: 'calc(100% - 14px)' }}
                  />
                </div>
              </div>
            </div>

            {/* Quartos */}
            <div className="flex flex-col h-full">
              <label className="block text-xs font-semibold text-gray-600 mb-1 tracking-wide pl-2.5 h-[20px]">
                Quartos
              </label>
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-gray-300/50 shadow-inner p-2 flex-1 flex flex-col min-h-[80px]">
                <div className="flex items-center justify-between text-xs font-bold text-gray-800 mb-1.5 h-[24px]">
                  <span className="bg-white px-2 py-1 rounded text-xs shadow-sm">{quartosRange[0]}</span>
                  <Bed className="w-4 h-4 text-gray-500" />
                  <span className="bg-white px-2 py-1 rounded text-xs shadow-sm">{quartosRange[1]}</span>
                </div>
                <div className="relative pt-2 pb-1.5 h-[32px] overflow-hidden">
                  <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-200 rounded-full" />
                  {/* Marcadores verticais para cada número */}
                  {Array.from({ length: (metadata!.quartosRange?.max || 10) + 1 }, (_, i) => (
                    <div
                      key={i}
                      className="absolute top-1/2 -translate-y-1/2 w-px h-2 bg-gray-400"
                      style={{
                        left: `${(i / Math.max(metadata!.quartosRange?.max || 10, 1)) * 100}%`
                      }}
                    />
                  ))}
                  <div
                    className="absolute top-1/2 h-0.5 bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 rounded-full z-10"
                    style={{
                      left: `${((quartosRange[0] - (metadata!.quartosRange?.min || 0)) / Math.max((metadata!.quartosRange?.max || 10) - (metadata!.quartosRange?.min || 0), 1)) * 100}%`,
                      right: `${100 - ((quartosRange[1] - (metadata!.quartosRange?.min || 0)) / Math.max((metadata!.quartosRange?.max || 10) - (metadata!.quartosRange?.min || 0), 1)) * 100}%`
                    }}
                  />
                  <input
                    type="range"
                    min={metadata!.quartosRange?.min || 0}
                    max={metadata!.quartosRange?.max || 10}
                    value={quartosRange[0]}
                    onChange={(event) =>
                      handleRangeChange(Number(event.target.value), 'min', quartosRange, setQuartosRange, quartosRange[0] === quartosRange[1] ? 0 : 0, metadata!.quartosRange)
                    }
                    className="dual-slider"
                  />
                  <input
                    type="range"
                    min={metadata!.quartosRange?.min || 0}
                    max={metadata!.quartosRange?.max || 10}
                    value={quartosRange[1]}
                    onChange={(event) =>
                      handleRangeChange(Number(event.target.value), 'max', quartosRange, setQuartosRange, quartosRange[0] === quartosRange[1] ? 0 : 0, metadata!.quartosRange)
                    }
                    className="dual-slider"
                  />
                </div>
              </div>
            </div>

            {/* Suites */}
            <div className="flex flex-col h-full">
              <label className="block text-xs font-semibold text-gray-600 mb-1 tracking-wide pl-2.5 h-[20px]">
                Suítes
              </label>
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-gray-300/50 shadow-inner p-2 flex-1 flex flex-col min-h-[80px]">
                <div className="flex items-center justify-between text-xs font-bold text-gray-800 mb-1.5 h-[24px]">
                  <span className="bg-white px-2 py-1 rounded text-xs shadow-sm">{suitesRange[0]}</span>
                  <ShowerHead className="w-4 h-4 text-gray-500" />
                  <span className="bg-white px-2 py-1 rounded text-xs shadow-sm">{suitesRange[1]}</span>
                </div>
                <div className="relative pt-2 pb-1.5 h-[32px] overflow-hidden">
                  <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-200 rounded-full" />
                  {/* Marcadores verticais para cada número */}
                  {Array.from({ length: (metadata!.suitesRange?.max || 5) + 1 }, (_, i) => (
                    <div
                      key={i}
                      className="absolute top-1/2 -translate-y-1/2 w-px h-2 bg-gray-400"
                      style={{
                        left: `${(i / Math.max(metadata!.suitesRange?.max || 5, 1)) * 100}%`
                      }}
                    />
                  ))}
                  <div
                    className="absolute top-1/2 h-0.5 bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 rounded-full z-10"
                    style={{
                      left: `${((suitesRange[0] - (metadata!.suitesRange?.min || 0)) / Math.max((metadata!.suitesRange?.max || 5) - (metadata!.suitesRange?.min || 0), 1)) * 100}%`,
                      right: `${100 - ((suitesRange[1] - (metadata!.suitesRange?.min || 0)) / Math.max((metadata!.suitesRange?.max || 5) - (metadata!.suitesRange?.min || 0), 1)) * 100}%`
                    }}
                  />
                  <input
                    type="range"
                    min={metadata!.suitesRange?.min || 0}
                    max={metadata!.suitesRange?.max || 5}
                    value={suitesRange[0]}
                    onChange={(event) =>
                      handleRangeChange(Number(event.target.value), 'min', suitesRange, setSuitesRange, suitesRange[0] === suitesRange[1] ? 0 : 0, metadata!.suitesRange)
                    }
                    className="dual-slider"
                  />
                  <input
                    type="range"
                    min={metadata!.suitesRange?.min || 0}
                    max={metadata!.suitesRange?.max || 5}
                    value={suitesRange[1]}
                    onChange={(event) =>
                      handleRangeChange(Number(event.target.value), 'max', suitesRange, setSuitesRange, suitesRange[0] === suitesRange[1] ? 0 : 0, metadata!.suitesRange)
                    }
                    className="dual-slider"
                  />
                </div>
              </div>
            </div>

            {/* Banheiros */}
            <div className="flex flex-col h-full">
              <label className="block text-xs font-semibold text-gray-600 mb-1 tracking-wide pl-2.5 h-[20px]">
                Banheiros
              </label>
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-gray-300/50 shadow-inner p-2 flex-1 flex flex-col min-h-[80px]">
                <div className="flex items-center justify-between text-xs font-bold text-gray-800 mb-1.5 h-[24px]">
                  <span className="bg-white px-2 py-1 rounded text-xs shadow-sm">{banheirosRange[0]}</span>
                  <Bath className="w-4 h-4 text-gray-500" />
                  <span className="bg-white px-2 py-1 rounded text-xs shadow-sm">{banheirosRange[1]}</span>
                </div>
                <div className="relative pt-2 pb-1.5 h-[32px] overflow-hidden">
                  <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-200 rounded-full" />
                  {/* Marcadores verticais para cada número */}
                  {Array.from({ length: (metadata!.banheirosRange?.max || 10) + 1 }, (_, i) => (
                    <div
                      key={i}
                      className="absolute top-1/2 -translate-y-1/2 w-px h-2 bg-gray-400"
                      style={{
                        left: `${(i / Math.max(metadata!.banheirosRange?.max || 10, 1)) * 100}%`
                      }}
                    />
                  ))}
                  <div
                    className="absolute top-1/2 h-0.5 bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 rounded-full z-10"
                    style={{
                      left: `${((banheirosRange[0] - (metadata!.banheirosRange?.min || 0)) / Math.max((metadata!.banheirosRange?.max || 10) - (metadata!.banheirosRange?.min || 0), 1)) * 100}%`,
                      right: `${100 - ((banheirosRange[1] - (metadata!.banheirosRange?.min || 0)) / Math.max((metadata!.banheirosRange?.max || 10) - (metadata!.banheirosRange?.min || 0), 1)) * 100}%`
                    }}
                  />
                  <input
                    type="range"
                    min={metadata!.banheirosRange?.min || 0}
                    max={metadata!.banheirosRange?.max || 10}
                    value={banheirosRange[0]}
                    onChange={(event) =>
                      handleRangeChange(Number(event.target.value), 'min', banheirosRange, setBanheirosRange, banheirosRange[0] === banheirosRange[1] ? 0 : 0, metadata!.banheirosRange)
                    }
                    className="dual-slider"
                  />
                  <input
                    type="range"
                    min={metadata!.banheirosRange?.min || 0}
                    max={metadata!.banheirosRange?.max || 10}
                    value={banheirosRange[1]}
                    onChange={(event) =>
                      handleRangeChange(Number(event.target.value), 'max', banheirosRange, setBanheirosRange, banheirosRange[0] === banheirosRange[1] ? 0 : 0, metadata!.banheirosRange)
                    }
                    className="dual-slider"
                  />
                </div>
              </div>
            </div>

            {/* Garagem */}
            <div className="flex flex-col h-full">
              <label className="block text-xs font-semibold text-gray-600 mb-1 tracking-wide pl-2.5 h-[20px]">
                Garagem
              </label>
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-gray-300/50 shadow-inner p-2 flex-1 flex flex-col min-h-[80px]">
                <div className="flex items-center justify-between text-xs font-bold text-gray-800 mb-1.5 h-[24px]">
                  <span className="bg-white px-2 py-1 rounded text-xs shadow-sm">{vagasRange[0]}</span>
                  <Car className="w-4 h-4 text-gray-500" />
                  <span className="bg-white px-2 py-1 rounded text-xs shadow-sm">{vagasRange[1]}</span>
                </div>
                <div className="relative pt-2 pb-1.5 h-[32px] overflow-hidden">
                  <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-200 rounded-full" />
                  {/* Marcadores verticais para cada número */}
                  {Array.from({ length: (metadata!.vagasRange?.max || 5) + 1 }, (_, i) => (
                    <div
                      key={i}
                      className="absolute top-1/2 -translate-y-1/2 w-px h-2 bg-gray-400"
                      style={{
                        left: `${(i / Math.max(metadata!.vagasRange?.max || 5, 1)) * 100}%`
                      }}
                    />
                  ))}
                  <div
                    className="absolute top-1/2 h-0.5 bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 rounded-full z-10"
                    style={{
                      left: `${((vagasRange[0] - (metadata!.vagasRange?.min || 0)) / Math.max((metadata!.vagasRange?.max || 5) - (metadata!.vagasRange?.min || 0), 1)) * 100}%`,
                      right: `${100 - ((vagasRange[1] - (metadata!.vagasRange?.min || 0)) / Math.max((metadata!.vagasRange?.max || 5) - (metadata!.vagasRange?.min || 0), 1)) * 100}%`
                    }}
                  />
                  <input
                    type="range"
                    min={metadata!.vagasRange?.min || 0}
                    max={metadata!.vagasRange?.max || 5}
                    value={vagasRange[0]}
                    onChange={(event) =>
                      handleRangeChange(Number(event.target.value), 'min', vagasRange, setVagasRange, vagasRange[0] === vagasRange[1] ? 0 : 0, metadata!.vagasRange)
                    }
                    className="dual-slider"
                  />
                  <input
                    type="range"
                    min={metadata!.vagasRange?.min || 0}
                    max={metadata!.vagasRange?.max || 5}
                    value={vagasRange[1]}
                    onChange={(event) =>
                      handleRangeChange(Number(event.target.value), 'max', vagasRange, setVagasRange, vagasRange[0] === vagasRange[1] ? 0 : 0, metadata!.vagasRange)
                    }
                    className="dual-slider"
                  />
                </div>
              </div>
            </div>
          </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={handleClear}
              className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-orange-100 to-red-50 border-2 border-orange-300 rounded-xl font-semibold text-base text-orange-800 hover:from-orange-200 hover:to-red-100 hover:border-orange-400 hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-orange-100 disabled:hover:to-red-50 disabled:hover:border-orange-300 flex items-center justify-center gap-2"
              disabled={isSearching}
            >
              <X className="w-4 h-4" />
              Limpar Filtros
            </button>
            <button
              type="submit"
              disabled={disableApplyButton}
              className="w-full sm:w-auto bg-gradient-to-r from-blue-400 to-indigo-500 border-2 border-blue-500 text-white hover:from-blue-500 hover:to-indigo-600 hover:border-blue-600 hover:shadow-lg disabled:from-gray-300 disabled:to-gray-400 disabled:text-gray-500 disabled:border-gray-400 disabled:cursor-not-allowed font-semibold py-2.5 px-6 rounded-xl transition-all duration-200 flex items-center justify-center text-base shadow-md hover:shadow-xl"
            >
              {isSearching ? (
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Buscando...
                </span>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Aplicar Filtros
                </>
              )}
            </button>
          </div>
        </form>
    </div>
  )
}