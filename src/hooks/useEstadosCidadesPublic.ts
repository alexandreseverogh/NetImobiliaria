import { useState, useEffect } from 'react'
import municipiosJson from '@/lib/admin/municipios.json'

interface Estado {
  sigla: string
  nome: string
}

/**
 * Hook simplificado para uso em formulários públicos
 * Retorna estados e função para obter cidades por estado
 */
export const useEstadosCidadesPublic = () => {
  const [estados, setEstados] = useState<Estado[]>([])

  useEffect(() => {
    // Carregar estados do JSON
    if (municipiosJson.estados) {
      const estadosOrdenados = municipiosJson.estados
        .map(e => ({ sigla: e.sigla, nome: e.nome }))
        .sort((a, b) => a.nome.localeCompare(b.nome))
      
      setEstados(estadosOrdenados)
    }
  }, [])

  /**
   * Obter lista de cidades de um estado (por sigla)
   */
  const getCidadesPorEstado = (estadoSigla: string): string[] => {
    if (!estadoSigla) return []
    
    const estadoEncontrado = municipiosJson.estados.find(e => e.sigla === estadoSigla)
    return estadoEncontrado ? estadoEncontrado.municipios.sort() : []
  }

  /**
   * Obter nome do estado pela sigla
   */
  const getEstadoNome = (sigla: string): string => {
    const estado = estados.find(e => e.sigla === sigla)
    return estado?.nome || sigla
  }

  return {
    estados,
    getCidadesPorEstado,
    getEstadoNome
  }
}


