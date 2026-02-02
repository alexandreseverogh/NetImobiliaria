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

interface MunicipioData {
  estados: {
    sigla: string
    nome: string
    municipios: string[]
  }[]
}

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

type Mode = 'active' | 'all'

export const useEstadosCidades = (mode: Mode = 'active') => {
  const [estados, setEstados] = useState<Estado[]>([])
  const [municipios, setMunicipios] = useState<Municipio[]>([])
  const [loading, setLoading] = useState(false)

  // Cache para dados no modo 'active'
  const [todosLocaisAtivos, setTodosLocaisAtivos] = useState<LocalAtivo[]>([])

  // Cache para dados no modo 'all'
  const [municipiosData, setMunicipiosData] = useState<MunicipioData | null>(null)

  // Carregar dados iniciais baseado no modo
  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true)

      if (mode === 'active') {
        const response = await fetch('/api/public/locais-ativos')
        if (!response.ok) throw new Error('Falha ao carregar locais ativos')

        const json = await response.json()
        if (json.success && Array.isArray(json.data)) {
          const locais: LocalAtivo[] = json.data
          setTodosLocaisAtivos(locais)

          // Extrair estados únicos de locais ativos
          const estadosMap = new Map<string, Estado>()
          locais.forEach(local => {
            if (!estadosMap.has(local.estado)) {
              const sigla = local.estado.toUpperCase().trim()
              estadosMap.set(local.estado, {
                id: local.estado,
                sigla: sigla,
                nome: ESTADOS_MAP[sigla] || local.estado
              })
            }
          })
          setEstados(Array.from(estadosMap.values()).sort((a, b) => a.nome.localeCompare(b.nome)))
        }
      } else {
        // Modo 'all' - Busca da API de admin existente
        const response = await fetch('/api/admin/municipios')
        if (!response.ok) throw new Error('Falha ao carregar todos os municípios')

        const data: MunicipioData = await response.json()
        setMunicipiosData(data)

        // Mapear estrutura do JSON para Estado[]
        const estadosFormatados: Estado[] = data.estados.map(e => ({
          id: e.sigla, // Usando SIGLA como ID para padronizar com locais ativos
          sigla: e.sigla,
          nome: e.nome
        })).sort((a, b) => a.nome.localeCompare(b.nome))

        setEstados(estadosFormatados)
      }
    } catch (error) {
      console.error('Erro ao carregar dados de locais:', error)
      setEstados([])
    } finally {
      setLoading(false)
    }
  }, [mode])

  // Carregar municípios baseado no estado selecionado
  const loadMunicipios = useCallback(async (estadoId: string) => {
    if (!estadoId) {
      setMunicipios([])
      return
    }

    setLoading(true)

    try {
      console.log('HOOK DEBUG: loadMunicipios called', { mode, estadoId })
      if (mode === 'active') {
        const cidadesDoEstado = todosLocaisAtivos
          .filter(l => l.estado === estadoId)
          .map(l => l.cidade)
          .filter((valor, index, self) => self.indexOf(valor) === index)
          .map(cidadeNome => ({
            id: cidadeNome,
            nome: cidadeNome
          }))
          .sort((a, b) => a.nome.localeCompare(b.nome))

        setMunicipios(cidadesDoEstado)
      } else {
        // Filtrar do cache de todos os municípios (JSON)
        console.log('HOOK DEBUG: Searching in full list', { hasData: !!municipiosData })
        if (municipiosData) {
          const estadoEncontrado = municipiosData.estados.find(e => e.sigla === estadoId)
          console.log('HOOK DEBUG: Estado found?', estadoEncontrado ? 'YES' : 'NO', estadoId)

          if (estadoEncontrado) {
            const cidadesFormatadas = estadoEncontrado.municipios
              .map(m => ({
                id: m,
                nome: m
              }))
              .sort((a, b) => a.nome.localeCompare(b.nome))
            setMunicipios(cidadesFormatadas)
            console.log('HOOK DEBUG: Cities set', cidadesFormatadas.length)
          } else {
            setMunicipios([])
          }
        } else {
          console.warn('HOOK DEBUG: municipiosData is null when loading municipios')
        }
      }
    } finally {
      setLoading(false)
    }
  }, [mode, todosLocaisAtivos, municipiosData])

  // Helpers de conversão (mantidos para compatibilidade)
  const getEstadoNome = useCallback((estadoId: string): string => {
    // Se tivermos o nome mapeado no ESTADOS_MAP, usamos, senão devolvemos o ID
    // Isso ajuda quando o estadoId é "SP" a retornar "São Paulo"
    return ESTADOS_MAP[estadoId] || estadoId || ''
  }, [])

  const getCidadeNome = useCallback((cidadeId: string): string => cidadeId || '', [])
  const getEstadoId = useCallback((estadoNome: string): string => estadoNome || '', [])
  const getCidadeId = useCallback((cidadeNome: string): string => cidadeNome || '', [])

  const clearMunicipios = useCallback(() => {
    setMunicipios([])
  }, [])

  // Inicialização
  useEffect(() => {
    loadInitialData()
  }, [loadInitialData])

  return {
    estados,
    municipios,
    loading,
    loadEstados: loadInitialData, // Alias para manter compatibilidade
    loadMunicipios,
    clearMunicipios,
    getEstadoNome,
    getCidadeNome,
    getEstadoId,
    getCidadeId
  }
}