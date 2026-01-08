/* eslint-disable */
import { useState, useEffect, useCallback } from 'react'

interface RascunhoAlteracoes {
  imagens: {
    adicionadas: string[]     // IDs das imagens adicionadas
    removidas: string[]       // IDs das imagens removidas
  }
  documentos: {
    adicionados: string[]     // IDs dos documentos adicionados
    removidos: string[]       // IDs dos documentos removidos
  }
  video: {
    adicionado: boolean       // Se vÃ­deo foi adicionado
    removido: boolean         // Se vÃ­deo foi removido
    dados?: any              // Dados do vÃ­deo (se adicionado)
  }
  imagemPrincipal: string | null // ID da imagem selecionada como principal
  dadosBasicos: Partial<any> // AlteraÃ§Ãµes nos dados bÃ¡sicos
}

interface RascunhoState {
  id: number
  imovelId: number
  usuarioId: number
  timestampInicio: string
  alteracoes: RascunhoAlteracoes
  ativo: boolean
}

interface UseRascunhoReturn {
  rascunho: RascunhoState | null
  iniciarRascunho: () => Promise<void>
  registrarAlteracao: (tipo: 'imagem' | 'documento', acao: 'adicionar' | 'remover', id: string) => Promise<void>
  registrarVideoAlteracao: (acao: 'adicionar' | 'remover', dados?: any) => Promise<void>
  registrarImagemPrincipal: (imageId: string) => Promise<void>
  descartarRascunho: () => Promise<void>
  confirmarRascunho: () => Promise<void>
  loading: boolean
  error: string | null
}

export const useRascunho = (imovelId: number): UseRascunhoReturn => {
  const [rascunho, setRascunho] = useState<RascunhoState | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Validar imovelId
  if (!imovelId || isNaN(imovelId)) {
    console.warn('âš ï¸ useRascunho: imovelId invÃ¡lido:', imovelId)
  }

  // Verificar se jÃ¡ existe rascunho ativo para este imÃ³vel
  const verificarRascunhoAtivo = useCallback(async () => {
    if (!imovelId) return

    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/admin/imoveis/${imovelId}/rascunho`)
      
      if (response.ok) {
        const data = await response.json()
        if (data.rascunho && data.rascunho.ativo) {
          setRascunho(data.rascunho)
          console.log('ðŸ” Rascunho ativo encontrado:', data.rascunho)
        } else {
          console.log('ðŸ” Nenhum rascunho ativo encontrado')
          setRascunho(null)
        }
      } else if (response.status === 404) {
        // Nenhum rascunho encontrado - isso Ã© normal
        console.log('ðŸ” Nenhum rascunho ativo encontrado (404)')
        setRascunho(null)
      } else {
        throw new Error(`Erro ao verificar rascunho: ${response.status}`)
      }
    } catch (err) {
      console.error('Erro ao verificar rascunho ativo:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [imovelId])

  // Iniciar novo rascunho
  const iniciarRascunho = useCallback(async () => {
    if (!imovelId) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/admin/imoveis/${imovelId}/rascunho`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imovelId,
          alteracoes: {
            imagens: { adicionadas: [], removidas: [] },
            documentos: { adicionados: [], removidos: [] },
            video: { adicionado: false, removido: false, dados: null },
            imagemPrincipal: null,
            dadosBasicos: {}
          }
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Erro ao iniciar rascunho: ${response.status}`)
      }

      const data = await response.json()
      setRascunho(data.rascunho)
      console.log('âœ… Rascunho iniciado:', data.rascunho)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(errorMessage)
      console.error('âŒ Erro ao iniciar rascunho:', err)
    } finally {
      setLoading(false)
    }
  }, [imovelId])

  // Registrar alteraÃ§Ã£o no rascunho
  const registrarAlteracao = useCallback(async (
    tipo: 'imagem' | 'documento', 
    acao: 'adicionar' | 'remover', 
    id: string
  ) => {
    if (!rascunho || !imovelId) return

    try {
      const alteracoesAtualizadas = { ...rascunho.alteracoes }
      
      if (tipo === 'imagem') {
        if (acao === 'adicionar') {
          alteracoesAtualizadas.imagens.adicionadas.push(id)
        } else {
          alteracoesAtualizadas.imagens.removidas.push(id)
        }
      } else if (tipo === 'documento') {
        if (acao === 'adicionar') {
          alteracoesAtualizadas.documentos.adicionados.push(id)
        } else {
          alteracoesAtualizadas.documentos.removidos.push(id)
        }
      }

      const response = await fetch(`/api/admin/imoveis/${imovelId}/rascunho`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          alteracoes: alteracoesAtualizadas
        })
      })

      if (!response.ok) {
        throw new Error('Erro ao registrar alteraÃ§Ã£o no rascunho')
      }

      const data = await response.json()
      setRascunho(data.rascunho)
      console.log('âœ… AlteraÃ§Ã£o registrada no rascunho:', { tipo, acao, id })
    } catch (err) {
      console.error('âŒ Erro ao registrar alteraÃ§Ã£o no rascunho:', err)
    }
  }, [rascunho, imovelId])

  // Registrar alteraÃ§Ã£o de vÃ­deo no rascunho
  const registrarVideoAlteracao = useCallback(async (
    acao: 'adicionar' | 'remover',
    dados?: any
  ) => {
    if (!rascunho || !imovelId) return

    try {
      const alteracoesAtualizadas = { ...rascunho.alteracoes }
      
      if (acao === 'adicionar') {
        alteracoesAtualizadas.video.adicionado = true
        alteracoesAtualizadas.video.removido = false
        
        // Converter arquivo para Buffer antes de armazenar no rascunho
        if (dados && dados.arquivo && typeof dados.arquivo.arrayBuffer === 'function') {
          console.log('ðŸ” Convertendo arquivo para Buffer antes de armazenar no rascunho')
          const arrayBuffer = await dados.arquivo.arrayBuffer()
          const videoBuffer = Buffer.from(arrayBuffer)
          
          // Criar novo objeto com Buffer em vez do arquivo original
          alteracoesAtualizadas.video.dados = {
            ...dados,
            videoBuffer: videoBuffer,
            arquivo: null // Remover o arquivo original
          }
          
          console.log('âœ… Arquivo convertido para Buffer, tamanho:', videoBuffer.length)
        } else {
          alteracoesAtualizadas.video.dados = dados
        }
      } else {
        alteracoesAtualizadas.video.adicionado = false
        alteracoesAtualizadas.video.removido = true
        alteracoesAtualizadas.video.dados = null
      }

      const response = await fetch(`/api/admin/imoveis/${imovelId}/rascunho`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          alteracoes: alteracoesAtualizadas
        })
      })

      if (!response.ok) {
        throw new Error('Erro ao registrar alteraÃ§Ã£o de vÃ­deo no rascunho')
      }

      const data = await response.json()
      setRascunho(data.rascunho)
      console.log('âœ… AlteraÃ§Ã£o de vÃ­deo registrada no rascunho:', { acao, dados })
    } catch (err) {
      console.error('âŒ Erro ao registrar alteraÃ§Ã£o de vÃ­deo no rascunho:', err)
    }
  }, [rascunho, imovelId])

  // Registrar alteraÃ§Ã£o de imagem principal no rascunho
  const registrarImagemPrincipal = useCallback(async (imageId: string) => {
    if (!rascunho || !imovelId) return

    try {
      const alteracoesAtualizadas = { ...rascunho.alteracoes }
      alteracoesAtualizadas.imagemPrincipal = imageId

      const response = await fetch(`/api/admin/imoveis/${imovelId}/rascunho`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          alteracoes: alteracoesAtualizadas
        })
      })

      if (!response.ok) {
        throw new Error('Erro ao registrar alteraÃ§Ã£o de imagem principal no rascunho')
      }

      const data = await response.json()
      setRascunho(data.rascunho)
      console.log('âœ… Imagem principal registrada no rascunho:', imageId)
    } catch (err) {
      console.error('âŒ Erro ao registrar imagem principal no rascunho:', err)
    }
  }, [rascunho, imovelId])

  // Descartar rascunho (reverter alteraÃ§Ãµes)
  const descartarRascunho = useCallback(async () => {
    if (!rascunho || !imovelId) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/admin/imoveis/${imovelId}/rascunho`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Erro ao descartar rascunho')
      }

      setRascunho(null)
      console.log('âœ… Rascunho descartado com sucesso')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(errorMessage)
      console.error('âŒ Erro ao descartar rascunho:', err)
    } finally {
      setLoading(false)
    }
  }, [rascunho, imovelId])

  // Confirmar rascunho (manter alteraÃ§Ãµes)
  const confirmarRascunho = useCallback(async () => {
    if (!rascunho || !imovelId) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/admin/imoveis/${imovelId}/rascunho/confirmar`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Erro ao confirmar rascunho')
      }

      setRascunho(null)
      console.log('âœ… Rascunho confirmado com sucesso')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(errorMessage)
      console.error('âŒ Erro ao confirmar rascunho:', err)
    } finally {
      setLoading(false)
    }
  }, [rascunho, imovelId])

  // Verificar rascunho ativo ao montar o componente
  useEffect(() => {
    verificarRascunhoAtivo()
  }, [verificarRascunhoAtivo])

  return {
    rascunho,
    iniciarRascunho,
    registrarAlteracao,
    registrarVideoAlteracao,
    registrarImagemPrincipal,
    descartarRascunho,
    confirmarRascunho,
    loading,
    error
  }
}

