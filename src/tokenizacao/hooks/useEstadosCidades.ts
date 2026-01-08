/* eslint-disable */
import { useState, useEffect, useCallback } from 'react'

interface Estado {
  id: string
  nome: string
  sigla: string
}

interface Municipio {
  id: string
  nome: string
}

export const useEstadosCidades = () => {
  const [estados, setEstados] = useState<Estado[]>([])
  const [municipios, setMunicipios] = useState<Municipio[]>([])
  const [loading, setLoading] = useState(false)

  // Carregar estados do JSON
  const loadEstados = useCallback(async () => {
    try {
      setLoading(true)
      const municipiosData = await import('@/lib/admin/municipios.json')
      const estadosComId = municipiosData.estados?.map((estado, index) => ({
        id: index.toString(),
        sigla: estado.sigla,
        nome: estado.nome
      })) || []
      setEstados(estadosComId)
    } catch (error) {
      console.error('Erro ao carregar estados:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Carregar municÃ­pios baseado no estado selecionado
  const loadMunicipios = useCallback(async (estadoId: string) => {
    if (!estadoId) {
      setMunicipios([])
      return
    }

    try {
      setLoading(true)
      const municipiosData = await import('@/lib/admin/municipios.json')
      const estadoIndex = parseInt(estadoId)
      const estadoSelecionado = municipiosData.estados?.[estadoIndex]
      
      if (estadoSelecionado?.municipios) {
        const municipiosDoEstado = estadoSelecionado.municipios.map((municipio: string, index: number) => ({
          id: index.toString(),
          nome: municipio
        }))
        setMunicipios(municipiosDoEstado)
      } else {
        setMunicipios([])
      }
    } catch (error) {
      console.error('Erro ao carregar municÃ­pios:', error)
      setMunicipios([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Converter ID do estado para nome
  const getEstadoNome = useCallback((estadoId: string): string => {
    const estado = estados.find(e => e.id === estadoId)
    return estado?.nome || ''
  }, [estados])

  // Converter ID da cidade para nome
  const getCidadeNome = useCallback((cidadeId: string): string => {
    const cidade = municipios.find(m => m.id === cidadeId)
    return cidade?.nome || ''
  }, [municipios])

  // Converter nome do estado para ID (para busca)
  const getEstadoId = useCallback((estadoNome: string): string => {
    const estado = estados.find(e => e.nome === estadoNome)
    return estado?.id || ''
  }, [estados])

  // Converter nome da cidade para ID (para busca)
  const getCidadeId = useCallback((cidadeNome: string): string => {
    const cidade = municipios.find(m => m.nome === cidadeNome)
    return cidade?.id || ''
  }, [municipios])

  // FunÃ§Ã£o para limpar municÃ­pios
  const clearMunicipios = useCallback(() => {
    setMunicipios([])
  }, [])

  // Carregar estados na inicializaÃ§Ã£o
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
