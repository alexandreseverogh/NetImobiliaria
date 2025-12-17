import { useState, useEffect, useCallback } from 'react'
import { Buffer } from 'buffer'

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
    adicionado: boolean       // Se vídeo foi adicionado
    removido: boolean         // Se vídeo foi removido
    dados?: any              // Dados do vídeo (se adicionado)
  }
  imagemPrincipal: string | null // ID da imagem selecionada como principal
  dadosBasicos: Partial<any> // Alterações nos dados básicos
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
  substituirVideo: (novosDados: any) => Promise<void>
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
    console.warn('⚠️ useRascunho: imovelId inválido:', imovelId)
  }

  // Verificar se já existe rascunho ativo para este imóvel
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
          console.log('🔍 Rascunho ativo encontrado:', data.rascunho)
        } else {
          console.log('🔍 Nenhum rascunho ativo encontrado')
          setRascunho(null)
        }
      } else if (response.status === 404) {
        // Nenhum rascunho encontrado - isso é normal
        console.log('🔍 Nenhum rascunho ativo encontrado (404)')
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
      console.log('✅ Rascunho iniciado:', data.rascunho)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(errorMessage)
      console.error('❌ Erro ao iniciar rascunho:', err)
    } finally {
      setLoading(false)
    }
  }, [imovelId])

  // Registrar alteração no rascunho
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
        throw new Error('Erro ao registrar alteração no rascunho')
      }

      const data = await response.json()
      setRascunho(data.rascunho)
      console.log('✅ Alteração registrada no rascunho:', { tipo, acao, id })
    } catch (err) {
      console.error('❌ Erro ao registrar alteração no rascunho:', err)
    }
  }, [rascunho, imovelId])

  // Registrar alteração de vídeo no rascunho
  const registrarVideoAlteracao = useCallback(async (
    acao: 'adicionar' | 'remover',
    dados?: any
  ) => {
    if (!imovelId) return

    try {
      // Se não há rascunho ativo, criar um primeiro
      let rascunhoAtual = rascunho
      if (!rascunhoAtual) {
        console.log('🔍 Criando novo rascunho para registrar alteração de vídeo')
        
        const response = await fetch(`/api/admin/imoveis/${imovelId}/rascunho`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            alteracoes: {
              video: { dados: null, removido: false, adicionado: false },
              imagens: { adicionadas: [], removidas: [] },
              documentos: { adicionados: [], removidos: [] },
              dadosBasicos: {}
            }
          })
        })

        if (!response.ok) {
          throw new Error('Erro ao criar rascunho para vídeo')
        }

        const data = await response.json()
        rascunhoAtual = data.rascunho
        setRascunho(rascunhoAtual)
        console.log('✅ Rascunho criado para vídeo:', rascunhoAtual)
      }

      if (!rascunhoAtual || !rascunhoAtual.alteracoes) {
        console.error('❌ Rascunho inválido ao registrar alteração de vídeo')
        return
      }

      const alteracoesAtualizadas = { ...rascunhoAtual.alteracoes }
      const videoAnterior = alteracoesAtualizadas.video || {}
      alteracoesAtualizadas.video = {
        ...videoAnterior,
        dados: videoAnterior.dados ?? null,
        removido: typeof videoAnterior.removido === 'boolean' ? videoAnterior.removido : false,
        adicionado: typeof videoAnterior.adicionado === 'boolean' ? videoAnterior.adicionado : false
      }
      
      if (acao === 'adicionar') {
        alteracoesAtualizadas.video.adicionado = true
        alteracoesAtualizadas.video.removido = false
        
        // Converter arquivo para base64 antes de armazenar no rascunho
        if (dados && dados.arquivo && typeof dados.arquivo.arrayBuffer === 'function') {
          console.log('🔍 Convertendo arquivo para base64 antes de armazenar no rascunho')
          const arrayBuffer = await dados.arquivo.arrayBuffer()
          const videoBuffer = Buffer.from(arrayBuffer)
          const videoBase64 = videoBuffer.toString('base64')
          
          // Criar novo objeto com base64 em vez do arquivo original
          alteracoesAtualizadas.video.dados = {
            nomeArquivo: dados.nomeArquivo,
            tipoMime: dados.tipoMime,
            tamanhoBytes: dados.tamanhoBytes,
            duracaoSegundos: dados.duracaoSegundos,
            resolucao: dados.resolucao,
            formato: dados.formato,
            arquivo: videoBase64 // Converter para base64 string
          }
          
          console.log('✅ Arquivo convertido para base64, tamanho:', videoBuffer.length)
        } else {
          alteracoesAtualizadas.video.dados = dados
        }
      } else {
        alteracoesAtualizadas.video.adicionado = false
        alteracoesAtualizadas.video.removido = true
        alteracoesAtualizadas.video.dados = null
      }

      console.log('🔍 Tentando fazer PUT no rascunho:', {
        imovelId,
        rascunhoAtual,
        alteracoesAtualizadas
      })
      
      const response = await fetch(`/api/admin/imoveis/${imovelId}/rascunho`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          alteracoes: alteracoesAtualizadas
        })
      })

      console.log('🔍 Resposta do PUT:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Erro detalhado do PUT:', errorText)
        throw new Error(`Erro ao registrar alteração de vídeo no rascunho: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      setRascunho(data.rascunho)
      console.log('✅ Alteração de vídeo registrada no rascunho:', { acao, dados })
    } catch (err) {
      console.error('❌ Erro ao registrar alteração de vídeo no rascunho:', err)
    }
  }, [rascunho, imovelId])

  // Substituir vídeo (remove antigo e adiciona novo em uma única operação)
  const substituirVideo = useCallback(async (novosDados: any) => {
    if (!imovelId) return

    try {
      // Se não há rascunho ativo, criar um primeiro
      let rascunhoAtual = rascunho
      if (!rascunhoAtual) {
        console.log('🔍 Criando novo rascunho para substituir vídeo')
        
        const response = await fetch(`/api/admin/imoveis/${imovelId}/rascunho`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            alteracoes: {
              video: { dados: null, removido: false, adicionado: false },
              imagens: { adicionadas: [], removidas: [] },
              documentos: { adicionados: [], removidos: [] },
              dadosBasicos: {}
            }
          })
        })

        if (!response.ok) {
          throw new Error('Erro ao criar rascunho para vídeo')
        }

        const data = await response.json()
        rascunhoAtual = data.rascunho
        setRascunho(rascunhoAtual)
        console.log('✅ Rascunho criado para substituição de vídeo:', rascunhoAtual)
      }

      if (!rascunhoAtual || !rascunhoAtual.alteracoes) {
        console.error('❌ Rascunho inválido ao substituir vídeo')
        return
      }

      const alteracoesAtualizadas = { ...rascunhoAtual.alteracoes }
      const videoAnterior = alteracoesAtualizadas.video || {}
      alteracoesAtualizadas.video = {
        ...videoAnterior,
        dados: videoAnterior.dados ?? null,
        removido: typeof videoAnterior.removido === 'boolean' ? videoAnterior.removido : false,
        adicionado: typeof videoAnterior.adicionado === 'boolean' ? videoAnterior.adicionado : false
      }
      
      // Marcar como removido E adicionado (substituição)
      alteracoesAtualizadas.video.removido = true
      alteracoesAtualizadas.video.adicionado = true
      
      // Converter arquivo para base64 antes de armazenar no rascunho
      console.log('🔍 novosDados recebidos em substituirVideo:', {
        novosDados,
        hasArquivo: !!novosDados?.arquivo,
        arquivoType: typeof novosDados?.arquivo,
        nomeArquivo: novosDados?.nomeArquivo,
        tipoMime: novosDados?.tipoMime,
        tamanhoBytes: novosDados?.tamanhoBytes,
        duracaoSegundos: novosDados?.duracaoSegundos,
        resolucao: novosDados?.resolucao,
        formato: novosDados?.formato
      })
      
      if (novosDados && novosDados.arquivo && typeof novosDados.arquivo.arrayBuffer === 'function') {
        console.log('🔍 Convertendo arquivo para base64 antes de substituir vídeo no rascunho')
        const arrayBuffer = await novosDados.arquivo.arrayBuffer()
        const videoBuffer = Buffer.from(arrayBuffer)
        const videoBase64 = videoBuffer.toString('base64')
        
        // Criar novo objeto com base64 em vez do arquivo original
        alteracoesAtualizadas.video.dados = {
          nomeArquivo: novosDados.nomeArquivo,
          tipoMime: novosDados.tipoMime,
          tamanhoBytes: novosDados.tamanhoBytes,
          duracaoSegundos: novosDados.duracaoSegundos,
          resolucao: novosDados.resolucao,
          formato: novosDados.formato,
          arquivo: videoBase64 // Converter para base64 string
        }
        
        console.log('✅ Arquivo convertido para base64, tamanho:', videoBuffer.length)
        console.log('✅ Dados salvos no rascunho:', alteracoesAtualizadas.video.dados)
      } else {
        console.log('⚠️ Salvando novosDados diretamente (sem conversão)')
        alteracoesAtualizadas.video.dados = novosDados
      }

      console.log('🔍 Tentando fazer PUT no rascunho para substituir vídeo:', {
        imovelId,
        rascunhoAtual,
        alteracoesAtualizadas
      })
      
      const response = await fetch(`/api/admin/imoveis/${imovelId}/rascunho`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          alteracoes: alteracoesAtualizadas
        })
      })

      console.log('🔍 Resposta do PUT (substituição):', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Erro detalhado do PUT (substituição):', errorText)
        throw new Error(`Erro ao substituir vídeo no rascunho: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      setRascunho(data.rascunho)
      console.log('✅ Vídeo substituído no rascunho:', novosDados)
    } catch (err) {
      console.error('❌ Erro ao substituir vídeo no rascunho:', err)
    }
  }, [rascunho, imovelId])

  // Registrar alteração de imagem principal no rascunho
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
        throw new Error('Erro ao registrar alteração de imagem principal no rascunho')
      }

      const data = await response.json()
      setRascunho(data.rascunho)
      console.log('✅ Imagem principal registrada no rascunho:', imageId)
    } catch (err) {
      console.error('❌ Erro ao registrar imagem principal no rascunho:', err)
    }
  }, [rascunho, imovelId])

  // Descartar rascunho (reverter alterações)
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
      console.log('✅ Rascunho descartado com sucesso')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(errorMessage)
      console.error('❌ Erro ao descartar rascunho:', err)
    } finally {
      setLoading(false)
    }
  }, [rascunho, imovelId])

  // Confirmar rascunho (manter alterações)
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
      console.log('✅ Rascunho confirmado com sucesso')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(errorMessage)
      console.error('❌ Erro ao confirmar rascunho:', err)
    } finally {
      setLoading(false)
    }
  }, [rascunho, imovelId])

  // Verificar rascunho ativo ao montar o componente - só se imovelId for válido
  useEffect(() => {
    if (imovelId && imovelId > 0) {
      console.log('🔍 useRascunho - Verificando rascunho ativo para imovelId:', imovelId)
      verificarRascunhoAtivo()
    }
  }, [imovelId, verificarRascunhoAtivo]) // Adicionado verificarRascunhoAtivo de volta

  return {
    rascunho,
    iniciarRascunho,
    registrarAlteracao,
    registrarVideoAlteracao,
    substituirVideo,
    registrarImagemPrincipal,
    descartarRascunho,
    confirmarRascunho,
    loading,
    error
  }
}
