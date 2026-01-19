import { useState, useEffect, useCallback, useMemo } from 'react'

interface Estado {
  id: string
  nome: string
  sigla: string
}

interface Municipio {
  id: string
  nome: string
}

interface LocalAtivo {
  estado: string
  cidade: string
}

export const useEstadosCidades = () => {
  const [estados, setEstados] = useState<Estado[]>([])
  const [municipios, setMunicipios] = useState<Municipio[]>([])
  const [loading, setLoading] = useState(false)
  const [todosLocais, setTodosLocais] = useState<LocalAtivo[]>([])

  // Mapa estático para melhorar a exibição (Sigla -> Nome Completo)
  const ESTADOS_MAP: Record<string, string> = {
    'AC': 'Acre', 'AL': 'Alagoas', 'AP': 'Amapá', 'AM': 'Amazonas', 'BA': 'Bahia',
    'CE': 'Ceará', 'DF': 'Distrito Federal', 'ES': 'Espírito Santo', 'GO': 'Goiás',
    'MA': 'Maranhão', 'MT': 'Mato Grosso', 'MS': 'Mato Grosso do Sul', 'MG': 'Minas Gerais',
    'PA': 'Pará', 'PB': 'Paraíba', 'PR': 'Paraná', 'PE': 'Pernambuco', 'PI': 'Piauí',
    'RJ': 'Rio de Janeiro', 'RN': 'Rio Grande do Norte', 'RS': 'Rio Grande do Sul',
    'RO': 'Rondônia', 'RR': 'Roraima', 'SC': 'Santa Catarina', 'SP': 'São Paulo',
    'SE': 'Sergipe', 'TO': 'Tocantins'
  }

  // Carregar locais ativos da API
  const loadEstados = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/public/locais-ativos')
      if (!response.ok) throw new Error('Falha ao carregar locais')

      const json = await response.json()
      if (json.success && Array.isArray(json.data)) {
        const locais: LocalAtivo[] = json.data
        setTodosLocais(locais)

        // Extrair estados únicos
        const estadosMap = new Map<string, Estado>()
        locais.forEach(local => {
          if (!estadosMap.has(local.estado)) {
            const sigla = local.estado.toUpperCase().trim()
            estadosMap.set(local.estado, {
              id: local.estado, // ID continua sendo o valor do banco (ex: "PE")
              sigla: sigla,
              nome: ESTADOS_MAP[sigla] || local.estado // Tenta usar nome completo, fallback para sigla
            })
          }
        })

        setEstados(Array.from(estadosMap.values()).sort((a, b) => a.nome.localeCompare(b.nome)))
      }
    } catch (error) {
      console.error('Erro ao carregar locais ativos:', error)
      // Fallback silencioso ou manter lista vazia
    } finally {
      setLoading(false)
    }
  }, [])

  // Carregar municípios baseado no estado selecionado
  const loadMunicipios = useCallback(async (estadoId: string) => {
    if (!estadoId) {
      setMunicipios([])
      return
    }

    setLoading(true)
    // Filtrar cidades do estado selecionado (usando os dados já carregados em memória)
    const cidadesDoEstado = todosLocais
      .filter(l => l.estado === estadoId)
      .map(l => l.cidade)
      // Garantir unicidade (embora a view já deva garantir pares únicos, mas previne duplicatas de cidade caso haja erro de dados)
      .filter((valor, index, self) => self.indexOf(valor) === index)
      .map(cidadeNome => ({
        id: cidadeNome, // Usamos o próprio nome como ID
        nome: cidadeNome
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome))

    setMunicipios(cidadesDoEstado)
    setLoading(false)
  }, [todosLocais])

  // Converter ID do estado para nome (agora é direto, pois ID = Nome)
  const getEstadoNome = useCallback((estadoId: string): string => {
    return estadoId || ''
  }, [])

  // Converter ID da cidade para nome (agora é direto, pois ID = Nome)
  const getCidadeNome = useCallback((cidadeId: string): string => {
    return cidadeId || ''
  }, [])

  // Converter nome do estado para ID (para busca)
  const getEstadoId = useCallback((estadoNome: string): string => {
    return estadoNome || ''
  }, [])

  // Converter nome da cidade para ID (para busca)
  const getCidadeId = useCallback((cidadeNome: string): string => {
    return cidadeNome || ''
  }, [])

  // Função para limpar municípios
  const clearMunicipios = useCallback(() => {
    setMunicipios([])
  }, [])

  // Carregar estados na inicialização
  useEffect(() => {
    loadEstados()
  }, [loadEstados])

  return {
    estados,
    municipios,
    loading,
    loadEstados,
    loadMunicipios,
    clearMunicipios,
    getEstadoNome,
    getCidadeNome,
    getEstadoId,
    getCidadeId
  }
}