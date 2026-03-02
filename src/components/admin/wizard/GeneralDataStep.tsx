'use client'

import { Imovel } from '@/lib/types/admin'
import { useMemo, useState, useEffect, useCallback } from 'react'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { useSearchParams } from 'next/navigation'

interface GeneralDataStepProps {
  data: Partial<Imovel>
  onUpdate: (data: Partial<Imovel>) => void
  mode: 'create' | 'edit'
  finalidades?: any[]
  tipos?: any[]
  finalidadePreSelecionada?: boolean
  onlyMineProprietarios?: boolean
}

interface Proprietario {
  uuid?: string | null
  nome: string
}

export default function GeneralDataStep({
  data,
  onUpdate,
  mode,
  finalidades = [],
  tipos = [],
  finalidadePreSelecionada = false,
  onlyMineProprietarios = false
}: GeneralDataStepProps) {
  const { get } = useAuthenticatedFetch()
  const searchParams = useSearchParams()
  // Fonte de verdade: se a URL está com from_corretor=true, estamos no fluxo do corretor.
  // (Isso garante que "Buscar Proprietário" tenha a MESMA lógica do "Selecionar Proprietário",
  // mesmo que algum prop não seja repassado por engano.)
  const isCorretorFlow = onlyMineProprietarios || (searchParams?.get('from_corretor') || '').toLowerCase() === 'true'
  const [proprietarioSearch, setProprietarioSearch] = useState('')
  const [proprietarios, setProprietarios] = useState<Proprietario[]>([])
  const [todosProprietarios, setTodosProprietarios] = useState<Proprietario[]>([])
  const [proprietarioSelecionado, setProprietarioSelecionado] = useState<Proprietario | null>(null)
  const [loadingProprietarios, setLoadingProprietarios] = useState(false)
  const [loadingTodosProprietarios, setLoadingTodosProprietarios] = useState(false)
  const [corretorUserId, setCorretorUserId] = useState<string | null>(null)
  const [proprietarioPublicoCarregado, setProprietarioPublicoCarregado] = useState(false)

  // Evitar autocomplete do navegador no campo "Buscar Proprietário"
  const proprietarioSearchFieldName = useMemo(
    () => `proprietario_search_${Math.random().toString(36).slice(2)}`,
    []
  )
  // No fluxo do corretor, pegamos o ID do corretor logado (salvo no login do corretor)
  useEffect(() => {
    if (!isCorretorFlow) {
      setCorretorUserId(null)
      return
    }
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('user-data') : null
      if (!raw) {
        setCorretorUserId(null)
        return
      }
      const parsed = JSON.parse(raw)
      const id = parsed?.id ? String(parsed.id) : null
      setCorretorUserId(id)
    } catch {
      setCorretorUserId(null)
    }
  }, [isCorretorFlow])

  const [caracteristicas, setCaracteristicas] = useState({
    quartos: '',
    banheiros: '',
    suites: '',
    vagasGaragem: '',
    varanda: '',
    andar: '',
    totalAndares: ''
  })
  const [valoresMonetarios, setValoresMonetarios] = useState({
    preco: '',
    precoCondominio: '',
    precoIPTU: '',
    taxaExtra: ''
  })

  const proprietarioIdentificador =
    (data as any).proprietario_uuid ?? (data as any).proprietario_fk

  console.log('🔍 GeneralDataStep - Props recebidas:', {
    dataKeys: Object.keys(data),
    tipo_fk: data.tipo_fk,
    finalidade_fk: data.finalidade_fk,
    finalidadesLength: finalidades.length,
    tiposLength: tipos.length,
    finalidades: finalidades.slice(0, 3), // Primeiros 3 para debug
    tipos: tipos.slice(0, 3), // Primeiros 3 para debug
    finalidadePreSelecionada
  })

  // Garantir que quando finalidadePreSelecionada for true, o valor seja preservado no formData
  useEffect(() => {
    if (finalidadePreSelecionada && data.finalidade_fk) {
      // Converter para número se necessário para garantir consistência
      const finalidadeValue = typeof data.finalidade_fk === 'string'
        ? Number(data.finalidade_fk)
        : Number(data.finalidade_fk)

      // Sempre atualizar para garantir que o valor está no formData como número
      // Isso é importante porque o campo está desabilitado e não dispara onChange
      onUpdate({ finalidade_fk: finalidadeValue })
    }
  }, [finalidadePreSelecionada, data.finalidade_fk, onUpdate])

  // Buscar proprietários por nome
  const buscarProprietarios = useCallback(async (nome: string) => {
    if (!nome || nome.length < 2) {
      setProprietarios([])
      return
    }

    // Fluxo do corretor: mesma lógica do "Selecionar Proprietário":
    // buscar APENAS dentro do universo já carregado em todosProprietarios (que já vem filtrado por corretor).
    if (isCorretorFlow) {
      const q = nome.trim().toLowerCase()
      const filtered = todosProprietarios
        .filter((p) => (p.nome || '').toLowerCase().includes(q))
        .slice(0, 50)
      setProprietarios(filtered)
      return
    }

    setLoadingProprietarios(true)
    try {
      const response = await get(
        `/api/admin/proprietarios?nome=${encodeURIComponent(nome)}`
      )
      const result = await response.json()

      if (result.success) {
        setProprietarios(result.proprietarios)
      } else {
        console.error('Erro ao buscar proprietários:', result.error)
        setProprietarios([])
      }
    } catch (error) {
      console.error('Erro ao buscar proprietários:', error)
      setProprietarios([])
    } finally {
      setLoadingProprietarios(false)
    }
  }, [get, isCorretorFlow, todosProprietarios])

  // Carregar todos os proprietários para o select
  const carregarTodosProprietarios = useCallback(async () => {
    try {
      setLoadingTodosProprietarios(true)
      // Evitar “vazamento” por estado antigo ao alternar fluxo (admin -> corretor)
      setTodosProprietarios([])
      setProprietarios([])
      const url = isCorretorFlow
        ? `/api/admin/proprietarios/mine?limit=1000`
        : `/api/admin/proprietarios?limit=1000`
      const response = await get(url)
      const result = await response.json()

      if (result.success) {
        const list = (result.proprietarios || []) as any[]
        // Blindagem extra: no fluxo do corretor, filtrar também no front por corretor_fk
        // (mesma lógica do "Selecionar Proprietário" e do backend).
        if (isCorretorFlow && corretorUserId) {
          const filtered = list.filter((p) => String(p?.corretor_fk || '') === String(corretorUserId))
          setTodosProprietarios(filtered)
        } else {
          setTodosProprietarios(list)
        }
      } else {
        setTodosProprietarios([])
      }
    } catch (error) {
      console.error('Erro ao carregar todos os proprietários:', error)
      setTodosProprietarios([])
    } finally {
      setLoadingTodosProprietarios(false)
    }
  }, [get, isCorretorFlow, corretorUserId])

  // Carregar proprietário selecionado (modo edição)
  const carregarProprietarioSelecionado = useCallback(
    async (identificador: string | null | undefined) => {
      if (!identificador || typeof identificador !== 'string') return

      try {
        console.log('🔍 Carregando proprietário:', identificador)

        const response = await get(`/api/admin/proprietarios/${encodeURIComponent(identificador)}`)
        if (!response.ok) {
          console.warn('⚠️ Nenhum proprietário encontrado para:', identificador)
          return
        }

        const result = await response.json()
        const proprietario: Proprietario | null = result?.uuid ? result : null

        if (proprietario) {
          console.log('✅ Proprietário carregado:', proprietario)
          setProprietarioSelecionado(proprietario)
          setProprietarioSearch(proprietario.nome)
          onUpdate({
            proprietario_uuid: proprietario.uuid ?? null,
            proprietario_fk: undefined
          } as any)
        } else {
          console.warn('⚠️ Nenhum proprietário encontrado para:', identificador)
        }
      } catch (error) {
        console.error('❌ Erro ao carregar proprietário:', error)
      }
    },
    [get, onUpdate]
  )

  // Carregar todos os proprietários quando o componente montar
  useEffect(() => {
    carregarTodosProprietarios()
  }, [carregarTodosProprietarios])

  // Carregar proprietário logado da página pública (quando acesso vier de lá)
  useEffect(() => {
    // Verificar se veio da página pública (via noSidebar query param)
    const noSidebar = searchParams?.get('noSidebar') === 'true'

    // Se não veio da pública ou já carregou, não fazer nada
    if (!noSidebar || proprietarioPublicoCarregado || mode !== 'create') {
      return
    }

    // Buscar dados do proprietário logado no localStorage
    try {
      const publicUserData = typeof window !== 'undefined' ? localStorage.getItem('public-user-data') : null
      if (publicUserData) {
        const userData = JSON.parse(publicUserData)

        // Verificar se é um proprietário e tem UUID
        if (userData.userType === 'proprietario' && userData.uuid) {
          console.log('🔍 GeneralDataStep - Proprietário público detectado:', userData.uuid, userData.nome)

          // Tentar encontrar na lista primeiro (se já carregou)
          if (todosProprietarios.length > 0) {
            const proprietarioEncontrado = todosProprietarios.find(p => p.uuid === userData.uuid)

            if (proprietarioEncontrado) {
              console.log('✅ GeneralDataStep - Proprietário encontrado na lista:', proprietarioEncontrado)
              setProprietarioSelecionado(proprietarioEncontrado)
              setProprietarioSearch(proprietarioEncontrado.nome)
              onUpdate({
                proprietario_uuid: proprietarioEncontrado.uuid ?? null,
                proprietario_fk: undefined
              } as any)
              setProprietarioPublicoCarregado(true)
            } else {
              // Se não encontrou na lista, tentar carregar via API
              console.log('⚠️ GeneralDataStep - Proprietário não encontrado na lista, buscando via API...')
              carregarProprietarioSelecionado(userData.uuid)
              // Marcar como carregado após tentar carregar (mesmo que falhe, não tentar novamente)
              setProprietarioPublicoCarregado(true)
            }
          } else {
            // Se a lista ainda não carregou, preencher diretamente com o UUID do localStorage
            // Isso garante que o proprietário seja preenchido mesmo antes da lista carregar
            console.log('⚠️ GeneralDataStep - Lista de proprietários ainda não carregou, preenchendo diretamente com UUID:', userData.uuid)
            onUpdate({
              proprietario_uuid: userData.uuid,
              proprietario_fk: undefined
            } as any)
            setProprietarioPublicoCarregado(true)
            // Tentar carregar o proprietário completo via API para preencher o nome
            carregarProprietarioSelecionado(userData.uuid)
          }
        }
      }
    } catch (error) {
      console.error('❌ GeneralDataStep - Erro ao carregar proprietário público:', error)
      setProprietarioPublicoCarregado(true) // Marcar como carregado mesmo em caso de erro para não tentar novamente
    }
  }, [searchParams, todosProprietarios, mode, proprietarioPublicoCarregado, carregarProprietarioSelecionado, onUpdate])

  // Carregar proprietário no modo de edição
  useEffect(() => {
    console.log('🔍 useEffect modo edição:', {
      mode,
      proprietario_uuid: proprietarioIdentificador,
      todosProprietariosLength: todosProprietarios.length
    })

    if (
      mode === 'edit' &&
      proprietarioIdentificador &&
      proprietarioIdentificador !== '' &&
      todosProprietarios.length > 0
    ) {
      console.log('🔍 Buscando proprietário na lista carregada...')
      const proprietario = todosProprietarios.find(
        (p) => typeof proprietarioIdentificador === 'string' && p.uuid === proprietarioIdentificador
      )
      if (proprietario) {
        console.log('🔍 Proprietário encontrado na lista:', proprietario)
        setProprietarioSelecionado(proprietario)
        setProprietarioSearch(proprietario.nome)
        onUpdate({
          proprietario_uuid: proprietario.uuid ?? null,
          proprietario_fk: undefined
        } as any)
      } else {
        console.log('🔍 Proprietário não encontrado na lista, buscando via API...')
        carregarProprietarioSelecionado(proprietarioIdentificador)
      }
    }
  }, [
    mode,
    proprietarioIdentificador,
    todosProprietarios,
    carregarProprietarioSelecionado,
    onUpdate
  ])

  // Debounce para busca de proprietários
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (proprietarioSearch && proprietarioSearch.length >= 2) {
        buscarProprietarios(proprietarioSearch)
      } else {
        setProprietarios([])
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [proprietarioSearch, buscarProprietarios])

  // No fluxo do corretor, a lista do "Buscar Proprietário" deve ser o MESMO universo do select.
  // Para garantir isso, renderizamos a lista a partir de todosProprietarios (filtrada),
  // e ignoramos qualquer estado anterior de `proprietarios`.
  const proprietariosParaExibirNoBuscar = useMemo(() => {
    if (!isCorretorFlow) return proprietarios
    const q = proprietarioSearch.trim().toLowerCase()
    if (!q || q.length < 2) return []
    return todosProprietarios
      .filter((p) => (p.nome || '').toLowerCase().includes(q))
      .slice(0, 50)
  }, [isCorretorFlow, proprietarios, proprietarioSearch, todosProprietarios])

  // REMOVIDO: Busca automática de CEP do GeneralDataStep
  // A busca de CEP deve acontecer APENAS no LocationStep (Step 1)
  // Aqui no GeneralDataStep (Step 2) não há campos de endereço para o usuário preencher

  const handleInputChange = (field: string, value: any) => {
    console.log('🔍 GeneralDataStep - Campo alterado:', field, 'Valor:', value)
    onUpdate({ [field]: value })
  }

  const handleProprietarioSelect = (proprietario: Proprietario) => {
    setProprietarioSelecionado(proprietario)
    setProprietarioSearch(proprietario.nome)
    setProprietarios([])
    onUpdate({
      proprietario_uuid: proprietario.uuid ?? null,
      proprietario_fk: undefined
    } as any)
  }

  const handleProprietarioSearchChange = (value: string) => {
    setProprietarioSearch(value)
    if (!value) {
      setProprietarioSelecionado(null)
      setProprietarios([])
      onUpdate({ proprietario_uuid: null, proprietario_fk: undefined } as any)
    }
  }

  const handleEnderecoChange = (field: string, value: string) => {
    onUpdate({
      endereco: {
        endereco: data.endereco?.endereco || '',
        numero: data.endereco?.numero || '',
        complemento: data.endereco?.complemento || '',
        bairro: data.endereco?.bairro || '',
        cidade: data.endereco?.cidade || '',
        estado: data.endereco?.estado || '',
        cep: data.endereco?.cep || '',
        latitude: data.endereco?.latitude,
        longitude: data.endereco?.longitude,
        ...data.endereco,
        [field]: value
      }
    })
  }

  const formatNumberToCurrencyString = useCallback((value: number | string | null | undefined) => {
    if (value === null || value === undefined || value === '') {
      return ''
    }

    const normalizeString = (input: string) =>
      input.replace(/\./g, '').replace(',', '.')

    const numericValue =
      typeof value === 'number'
        ? value
        : Number.parseFloat(normalizeString(String(value)))

    if (Number.isNaN(numericValue)) {
      return ''
    }

    return numericValue.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }, [])

  // Função para formatar valores monetários com máscara de moeda brasileira
  const formatCurrencyValue = (value: string) => {
    const digits = value.replace(/\D/g, '')

    if (!digits) {
      return ''
    }

    const numericValue = Number(digits) / 100

    return numericValue.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }

  const parseCurrencyToNumber = (value: string): number | undefined => {
    const digits = value.replace(/\D/g, '')

    if (!digits) {
      return undefined
    }

    const numericValue = Number(digits) / 100
    return Number.isNaN(numericValue) ? undefined : numericValue
  }

  // Função para formatar área com separação de milhares
  const formatAreaValue = (value: string) => {
    // Se o valor for vazio, retorna vazio
    if (!value || value === '0') return ''

    // Converte para número para remover decimais desnecessários
    const numValue = parseFloat(value)

    // Se não for um número válido, retorna vazio
    if (isNaN(numValue)) return ''

    // Converte para inteiro (remove decimais)
    const intValue = Math.floor(numValue)

    // Converte para string e formata com pontos para milhares
    return intValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  }

  // Função para limpar o valor (remover formatação) antes de salvar
  const cleanCurrencyValue = (value: string) => {
    return value.replace(/[^\d,]/g, '')
  }

  const {
    quartos,
    banheiros,
    suites,
    vagasGaragem,
    andar,
    totalAndares
  } = data

  const varandaValor = (data as any).varanda
  const precoValor = (data as any).preco
  const precoCondominioValor = (data as any).precoCondominio
  const precoIPTUValor = (data as any).precoIPTU
  const taxaExtraValor = (data as any).taxaExtra

  // Sincronizar campos de características quando dados externos mudarem
  useEffect(() => {
    setCaracteristicas({
      quartos: quartos !== undefined && quartos !== null ? String(quartos) : '',
      banheiros: banheiros !== undefined && banheiros !== null ? String(banheiros) : '',
      suites: suites !== undefined && suites !== null ? String(suites) : '',
      vagasGaragem:
        vagasGaragem !== undefined && vagasGaragem !== null ? String(vagasGaragem) : '',
      varanda: varandaValor !== undefined && varandaValor !== null ? String(varandaValor) : '',
      andar: andar !== undefined && andar !== null ? String(andar) : '',
      totalAndares:
        totalAndares !== undefined && totalAndares !== null ? String(totalAndares) : ''
    })
  }, [
    quartos,
    banheiros,
    suites,
    vagasGaragem,
    varandaValor,
    andar,
    totalAndares
  ])

  useEffect(() => {
    setValoresMonetarios({
      preco: formatNumberToCurrencyString(precoValor),
      precoCondominio: formatNumberToCurrencyString(precoCondominioValor),
      precoIPTU: formatNumberToCurrencyString(precoIPTUValor),
      taxaExtra: formatNumberToCurrencyString(taxaExtraValor)
    })
  }, [
    precoValor,
    precoCondominioValor,
    precoIPTUValor,
    taxaExtraValor,
    formatNumberToCurrencyString
  ])

  const handleCaracteristicaChange = (field: keyof typeof caracteristicas, value: string) => {
    const sanitized = value.replace(/[^\d]/g, '').slice(0, 2)
    setCaracteristicas(prev => ({
      ...prev,
      [field]: sanitized
    }))

    const numericValue = sanitized === '' ? undefined : Number(sanitized)
    onUpdate({
      [field]: numericValue
    } as any)
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Dados Gerais do Imóvel</h2>
        <p className="text-gray-600">
          Preencha as informações básicas sobre o imóvel.
        </p>
      </div>

      {/* Tipo e Finalidade - PRIMEIROS CAMPOS */}
      <div className="space-y-6">
        <div className="border-t border-gray-400 pt-6">
          <h3 className="text-lg font-medium text-gray-900">Tipo e Finalidade</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="tipo" className="block text-sm font-medium text-gray-700 mb-2">
              Tipo do Imóvel *
            </label>
            <select
              id="tipo"
              value={(data as any).tipo_fk || ''}
              onChange={(e) => handleInputChange('tipo_fk', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Selecione o tipo</option>
              {tipos.map((tipo) => (
                <option key={tipo.id} value={tipo.id}>
                  {tipo.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="finalidade" className="block text-sm font-medium text-gray-700 mb-2">
              Finalidade *
            </label>
            <select
              id="finalidade"
              value={(data as any).finalidade_fk || ''}
              onChange={(e) => {
                // Converter para número para manter consistência
                const value = e.target.value ? Number(e.target.value) : null
                handleInputChange('finalidade_fk', value)
              }}
              disabled={finalidadePreSelecionada}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${finalidadePreSelecionada ? 'bg-gray-100 cursor-not-allowed opacity-75' : ''
                }`}
              required
            >
              <option value="">Selecione a finalidade</option>
              {finalidades.map((finalidade) => (
                <option key={finalidade.id} value={finalidade.id}>
                  {finalidade.nome.replace('_', ' e ')}
                </option>
              ))}
            </select>
            {finalidadePreSelecionada && (
              <p className="mt-1 text-sm text-gray-500">
                A finalidade foi pré-selecionada com base na sua escolha anterior.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Proprietário */}
      <div className="space-y-6">
        <div className="border-t border-gray-400 pt-6">
          <h3 className="text-lg font-medium text-gray-900">Proprietário</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="proprietarioSearch" className="block text-sm font-medium text-gray-700 mb-2">
              Buscar Proprietário
            </label>
            <div className="relative">
              <input
                type="text"
                id="proprietarioSearch"
                name={proprietarioSearchFieldName}
                autoComplete="new-password"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                value={proprietarioSearch}
                onChange={(e) => handleProprietarioSearchChange(e.target.value)}
                placeholder="Digite o nome do proprietário..."
                disabled={
                  (proprietarioPublicoCarregado && searchParams?.get('noSidebar') === 'true') ||
                  (isCorretorFlow && loadingTodosProprietarios)
                }
                className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${proprietarioPublicoCarregado && searchParams?.get('noSidebar') === 'true'
                  ? 'bg-gray-100 cursor-not-allowed'
                  : isCorretorFlow && loadingTodosProprietarios
                    ? 'bg-gray-100 cursor-not-allowed'
                    : ''
                  }`}
              />
              {(loadingProprietarios || (isCorretorFlow && loadingTodosProprietarios)) && (
                <div className="absolute right-3 top-2.5">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                </div>
              )}
            </div>

            {/* Lista de proprietários encontrados */}
            {proprietariosParaExibirNoBuscar.length > 0 && (
              <div className="mt-2 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto z-10 relative">
                {proprietariosParaExibirNoBuscar.map((proprietario) => (
                  <div
                    key={proprietario.uuid ?? proprietario.nome}
                    onClick={() => handleProprietarioSelect(proprietario)}
                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                  >
                    <div className="text-sm font-medium text-gray-900">{proprietario.nome}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Lista suspensa com todos os proprietários */}
          <div>
            <label htmlFor="proprietarioSelect" className="block text-sm font-medium text-gray-700 mb-2">
              Selecionar Proprietário
            </label>
            <select
              id="proprietarioSelect"
              value={(data as any).proprietario_uuid || ''}
              onChange={(e) => {
                const identificador = e.target.value
                if (identificador) {
                  const proprietarioSelecionado = todosProprietarios.find((p) => p.uuid === identificador)
                  if (proprietarioSelecionado) {
                    setProprietarioSelecionado(proprietarioSelecionado)
                    setProprietarioSearch(proprietarioSelecionado.nome)
                    onUpdate({
                      proprietario_uuid: proprietarioSelecionado.uuid ?? null,
                      proprietario_fk: undefined
                    } as any)
                  }
                } else {
                  setProprietarioSelecionado(null)
                  setProprietarioSearch('')
                  onUpdate({ proprietario_uuid: null, proprietario_fk: undefined } as any)
                }
              }}
              disabled={proprietarioPublicoCarregado && searchParams?.get('noSidebar') === 'true'}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${proprietarioPublicoCarregado && searchParams?.get('noSidebar') === 'true'
                ? 'bg-gray-100 cursor-not-allowed'
                : ''
                }`}
            >
              <option value="">Selecione um proprietário</option>
              {todosProprietarios.map((proprietario) => (
                <option
                  key={proprietario.uuid ?? proprietario.nome}
                  value={proprietario.uuid ?? ''}
                >
                  {proprietario.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Exibir proprietário selecionado */}
          {proprietarioSelecionado && (
            <div className="bg-green-50 border border-green-200 rounded-md p-3">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-800">
                    Proprietário selecionado: {proprietarioSelecionado.nome}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Informações Básicas */}
      <div className="space-y-6">
        <div className="border-t border-gray-400 pt-6">
          <h3 className="text-lg font-medium text-gray-900">Informações Básicas</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label htmlFor="titulo" className="block text-sm font-medium text-gray-700 mb-2">
              Título do Imóvel *
            </label>
            <input
              type="text"
              id="titulo"
              value={data.titulo || ''}
              onChange={(e) => handleInputChange('titulo', e.target.value)}
              placeholder="Ex: Apartamento de 3 quartos no Centro"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              maxLength={60}
              required
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="descricao" className="block text-sm font-medium text-gray-700 mb-2">
              Descrição
            </label>
            <textarea
              id="descricao"
              rows={12}
              value={data.descricao || ''}
              onChange={(e) => handleInputChange('descricao', e.target.value)}
              placeholder="Descreva o imóvel, suas características e diferenciais..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Valores */}
      <div className="space-y-6">
        <div className="border-t border-gray-400 pt-6">
          <h3 className="text-lg font-medium text-gray-900">Valores</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <label htmlFor="preco" className="block text-sm font-medium text-gray-700 mb-2">
              Preço Principal
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">R$</span>
              </div>
              <input
                type="text"
                id="preco"
                value={valoresMonetarios.preco}
                onChange={(e) => {
                  const formattedValue = formatCurrencyValue(e.target.value)
                  setValoresMonetarios(prev => ({ ...prev, preco: formattedValue }))
                  handleInputChange('preco', parseCurrencyToNumber(formattedValue))
                }}
                placeholder="0,00"
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="precoCondominio" className="block text-sm font-medium text-gray-700 mb-2">
              Condomínio
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">R$</span>
              </div>
              <input
                type="text"
                id="precoCondominio"
                value={valoresMonetarios.precoCondominio}
                onChange={(e) => {
                  const formattedValue = formatCurrencyValue(e.target.value)
                  setValoresMonetarios(prev => ({ ...prev, precoCondominio: formattedValue }))
                  handleInputChange('precoCondominio', parseCurrencyToNumber(formattedValue))
                }}
                placeholder="0,00"
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="precoIPTU" className="block text-sm font-medium text-gray-700 mb-2">
              IPTU
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">R$</span>
              </div>
              <input
                type="text"
                id="precoIPTU"
                value={valoresMonetarios.precoIPTU}
                onChange={(e) => {
                  const formattedValue = formatCurrencyValue(e.target.value)
                  setValoresMonetarios(prev => ({ ...prev, precoIPTU: formattedValue }))
                  handleInputChange('precoIPTU', parseCurrencyToNumber(formattedValue))
                }}
                placeholder="0,00"
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="taxaExtra" className="block text-sm font-medium text-gray-700 mb-2">
              Taxa Extra
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">R$</span>
              </div>
              <input
                type="text"
                id="taxaExtra"
                value={valoresMonetarios.taxaExtra}
                onChange={(e) => {
                  const formattedValue = formatCurrencyValue(e.target.value)
                  setValoresMonetarios(prev => ({ ...prev, taxaExtra: formattedValue }))
                  handleInputChange('taxaExtra', parseCurrencyToNumber(formattedValue))
                }}
                placeholder="0,00"
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Áreas */}
      <div className="space-y-6">
        <div className="border-t border-gray-400 pt-6">
          <h3 className="text-lg font-medium text-gray-900">Áreas</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="areaTotal" className="block text-sm font-medium text-gray-700 mb-2">
              Área Total (m²)
            </label>
            <input
              type="text"
              id="areaTotal"
              value={formatAreaValue(String(data.areaTotal || ''))}
              onChange={(e) => {
                const cleanValue = e.target.value.replace(/[^\d]/g, '')
                const limitedValue = cleanValue.substring(0, 5)
                handleInputChange('areaTotal', parseInt(limitedValue) || 0)
              }}
              placeholder="0"
              className="w-24 px-2 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
            />
          </div>

          <div>
            <label htmlFor="areaConstruida" className="block text-sm font-medium text-gray-700 mb-2">
              Área Construída (m²)
            </label>
            <input
              type="text"
              id="areaConstruida"
              value={formatAreaValue(String(data.areaConstruida || ''))}
              onChange={(e) => {
                const cleanValue = e.target.value.replace(/[^\d]/g, '')
                const limitedValue = cleanValue.substring(0, 5)
                handleInputChange('areaConstruida', parseInt(limitedValue) || 0)
              }}
              placeholder="0"
              className="w-24 px-2 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
            />
          </div>
        </div>
      </div>

      {/* Características */}
      <div className="space-y-6">
        <div className="border-t border-gray-400 pt-6">
          <h3 className="text-lg font-medium text-gray-900">Características</h3>
        </div>

        <div className="grid grid-cols-7 gap-2">
          <div>
            <label htmlFor="quartos" className="block text-sm font-medium text-gray-700 mb-2">
              Quartos
            </label>
            <input
              type="text"
              id="quartos"
              inputMode="numeric"
              pattern="[0-9]*"
              value={caracteristicas.quartos}
              onChange={(e) => handleCaracteristicaChange('quartos', e.target.value)}
              placeholder="0"
              maxLength={2}
              className="w-16 px-2 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center"
            />
          </div>

          <div>
            <label htmlFor="banheiros" className="block text-sm font-medium text-gray-700 mb-2">
              Banheiros
            </label>
            <input
              type="text"
              id="banheiros"
              inputMode="numeric"
              pattern="[0-9]*"
              value={caracteristicas.banheiros}
              onChange={(e) => handleCaracteristicaChange('banheiros', e.target.value)}
              placeholder="0"
              maxLength={2}
              className="w-16 px-2 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center"
            />
          </div>

          <div>
            <label htmlFor="suites" className="block text-sm font-medium text-gray-700 mb-2">
              Suítes
            </label>
            <input
              type="text"
              id="suites"
              inputMode="numeric"
              pattern="[0-9]*"
              value={caracteristicas.suites}
              onChange={(e) => handleCaracteristicaChange('suites', e.target.value)}
              placeholder="0"
              maxLength={2}
              className="w-16 px-2 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center"
            />
          </div>

          <div>
            <label htmlFor="vagasGaragem" className="block text-sm font-medium text-gray-700 mb-2 whitespace-nowrap">
              Vagas Garagem
            </label>
            <input
              type="text"
              id="vagasGaragem"
              inputMode="numeric"
              pattern="[0-9]*"
              value={caracteristicas.vagasGaragem}
              onChange={(e) => handleCaracteristicaChange('vagasGaragem', e.target.value)}
              placeholder="0"
              maxLength={2}
              className="w-16 px-2 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center"
            />
          </div>

          <div>
            <label htmlFor="varanda" className="block text-sm font-medium text-gray-700 mb-2 whitespace-nowrap">
              Varanda
            </label>
            <input
              type="text"
              id="varanda"
              inputMode="numeric"
              pattern="[0-9]*"
              value={caracteristicas.varanda}
              onChange={(e) => handleCaracteristicaChange('varanda', e.target.value)}
              placeholder="0"
              maxLength={2}
              className="w-16 px-2 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center"
            />
          </div>

          <div>
            <label htmlFor="andar" className="block text-sm font-medium text-gray-700 mb-2">
              Andar
            </label>
            <input
              type="text"
              id="andar"
              inputMode="numeric"
              pattern="[0-9]*"
              value={caracteristicas.andar}
              onChange={(e) => handleCaracteristicaChange('andar', e.target.value)}
              placeholder="0"
              maxLength={2}
              className="w-16 px-2 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center"
            />
          </div>

          <div>
            <label htmlFor="totalAndares" className="block text-sm font-medium text-gray-700 mb-2 whitespace-nowrap">
              Total de Andares
            </label>
            <input
              type="text"
              id="totalAndares"
              inputMode="numeric"
              pattern="[0-9]*"
              value={caracteristicas.totalAndares}
              onChange={(e) => handleCaracteristicaChange('totalAndares', e.target.value)}
              placeholder="0"
              maxLength={2}
              className="w-16 px-2 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center"
            />
          </div>
        </div>

      </div>

      {/* Opções */}
      <div className="space-y-6">
        <div className="border-t border-gray-400 pt-6">
          <h3 className="text-lg font-medium text-gray-900">Opções</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">

            <div className="flex items-center">
              <input
                type="checkbox"
                id="aceitaPermuta"
                checked={(data as any).aceita_permuta || false}
                onChange={(e) => handleInputChange('aceita_permuta', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="aceitaPermuta" className="ml-2 block text-sm text-gray-900">
                Aceita Permuta
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="lancamento"
                checked={(data as any).lancamento || false}
                onChange={(e) => handleInputChange('lancamento', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="lancamento" className="ml-2 block text-sm text-gray-900">
                Lançamento
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="aceitaFinanciamento"
                checked={(data as any).aceita_financiamento || false}
                onChange={(e) => handleInputChange('aceita_financiamento', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="aceitaFinanciamento" className="ml-2 block text-sm text-gray-900">
                Aceita Financiamento
              </label>
            </div>
          </div>

          <div className="space-y-4">
          </div>
        </div>
      </div>

    </div>
  )
}



