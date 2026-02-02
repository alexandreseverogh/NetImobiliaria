import { useState, useEffect, useCallback } from 'react'

interface ImovelBasico {
  id: number
  codigo: string
  titulo: string
  descricao: string
  preco: number
  preco_condominio?: number
  preco_iptu?: number
  taxa_extra?: number
  area_total: number
  area_construida?: number
  quartos: number
  banheiros: number
  suites: number
  vagas_garagem: number
  varanda?: number
  andar?: number
  total_andares?: number
  bairro: string
  endereco: string
  numero?: string
  complemento?: string
  cep?: string
  estado_fk: string
  cidade_fk: string
  tipo_nome: string
  finalidade_nome: string
  status_nome: string
  latitude?: number
  longitude?: number
  status_cor: string
  aceita_permuta?: boolean
  aceita_financiamento?: boolean
  lancamento?: boolean
  imagem_principal: {
    url: string
    alt: string
  } | null
  total_imagens: number
  total_amenidades: number
  total_proximidades: number
  total_videos?: number
  total_documentos?: number
  consulta_imovel_internauta?: boolean
}

interface ImovelDetalhado extends ImovelBasico {
  amenidades: {
    por_categoria: Record<string, any[]>
    lista: any[]
  }
  proximidades: {
    por_categoria: Record<string, any[]>
    lista: any[]
  }
}

interface ImovelCompleto extends ImovelDetalhado {
  imagens: any[]
  videos: any[]
  documentos: any[]
}

interface LoadingState {
  basico: boolean
  detalhado: boolean
  completo: boolean
}

interface ErrorState {
  basico: string | null
  detalhado: string | null
  completo: string | null
}

export const useFichaCompleta = (imovelId: string) => {
  const [dadosBasicos, setDadosBasicos] = useState<ImovelBasico | null>(null)
  const [dadosDetalhados, setDadosDetalhados] = useState<ImovelDetalhado | null>(null)
  const [dadosCompletos, setDadosCompletos] = useState<ImovelCompleto | null>(null)
  const [loading, setLoading] = useState<LoadingState>({
    basico: true,  // Iniciar como true para evitar flash de "não encontrado"
    detalhado: false,
    completo: false
  })
  const [error, setError] = useState<ErrorState>({
    basico: null,
    detalhado: null,
    completo: null
  })

  // Carregar dados básicos
  const carregarBasicos = useCallback(async () => {
    console.log('🔍 useFichaCompleta - Iniciando carregamento básico para imovelId:', imovelId)

    // Evitar chamadas duplas - verificar se já está carregando
    setLoading(prev => {
      if (prev.basico) {
        console.log('🔍 useFichaCompleta - Já está carregando, ignorando chamada dupla')
        return prev
      }
      return { ...prev, basico: true }
    })

    setError(prev => ({ ...prev, basico: null }))

    try {
      const response = await fetch(`/api/public/imoveis/${imovelId}/ficha-completa?nivel=basico`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao carregar dados básicos')
      }

      if (data.success) {
        console.log('🔍 useFichaCompleta - Dados básicos carregados com sucesso:', data.imovel?.id)
        setDadosBasicos(data.imovel)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      console.log('🔍 useFichaCompleta - Erro ao carregar dados básicos:', errorMessage)
      setError(prev => ({ ...prev, basico: errorMessage }))
      console.error('Erro ao carregar dados básicos:', err)
    } finally {
      console.log('🔍 useFichaCompleta - Finalizando carregamento básico')
      setLoading(prev => ({ ...prev, basico: false }))
    }
  }, [imovelId])

  // Carregar dados detalhados
  const carregarDetalhados = useCallback(async () => {
    setLoading(prev => ({ ...prev, detalhado: true }))
    setError(prev => ({ ...prev, detalhado: null }))

    try {
      const response = await fetch(`/api/public/imoveis/${imovelId}/ficha-completa?nivel=detalhado`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao carregar dados detalhados')
      }

      if (data.success) {
        setDadosDetalhados(data.imovel)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(prev => ({ ...prev, detalhado: errorMessage }))
      console.error('Erro ao carregar dados detalhados:', err)
    } finally {
      setLoading(prev => ({ ...prev, detalhado: false }))
    }
  }, [imovelId])

  // Carregar dados completos
  const carregarCompletos = useCallback(async () => {
    setLoading(prev => ({ ...prev, completo: true }))
    setError(prev => ({ ...prev, completo: null }))

    try {
      const response = await fetch(`/api/public/imoveis/${imovelId}/ficha-completa?nivel=completo`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao carregar dados completos')
      }

      if (data.success) {
        setDadosCompletos(data.imovel)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(prev => ({ ...prev, completo: errorMessage }))
      console.error('Erro ao carregar dados completos:', err)
    } finally {
      setLoading(prev => ({ ...prev, completo: false }))
    }
  }, [imovelId])

  // Carregar dados básicos automaticamente
  useEffect(() => {
    console.log('🔍 useFichaCompleta - useEffect executado para imovelId:', imovelId)
    if (imovelId) {
      console.log('🔍 useFichaCompleta - Chamando carregarBasicos para:', imovelId)
      carregarBasicos()
    }
  }, [imovelId, carregarBasicos])

  // Carregar dados detalhados em segundo plano quando básicos estiverem prontos
  useEffect(() => {
    if (dadosBasicos && !dadosDetalhados && !loading.detalhado) {
      carregarDetalhados()
    }
  }, [dadosBasicos, dadosDetalhados, loading.detalhado, carregarDetalhados])

  // Função para recarregar todos os dados
  const recarregar = useCallback(() => {
    setDadosBasicos(null)
    setDadosDetalhados(null)
    setDadosCompletos(null)
    setError({ basico: null, detalhado: null, completo: null })
    carregarBasicos()
  }, [carregarBasicos])

  // Função para limpar dados
  const limpar = useCallback(() => {
    setDadosBasicos(null)
    setDadosDetalhados(null)
    setDadosCompletos(null)
    setLoading({ basico: false, detalhado: false, completo: false })
    setError({ basico: null, detalhado: null, completo: null })
  }, [])

  return {
    // Dados
    dadosBasicos,
    dadosDetalhados,
    dadosCompletos,

    // Estados de carregamento
    loading,
    error,

    // Funções de carregamento
    carregarBasicos,
    carregarDetalhados,
    carregarCompletos,

    // Funções utilitárias
    recarregar,
    limpar,

    // Estados derivados
    temDadosBasicos: !!dadosBasicos,
    temDadosDetalhados: !!dadosDetalhados,
    temDadosCompletos: !!dadosCompletos,
    carregandoAlgum: loading.basico || loading.detalhado || loading.completo,
    temErro: !!(error.basico || error.detalhado || error.completo)
  }
}

export default useFichaCompleta
