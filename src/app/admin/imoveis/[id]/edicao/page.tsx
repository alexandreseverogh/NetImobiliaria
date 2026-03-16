'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Imovel } from '@/lib/types/admin'
import ImovelWizard from '@/components/admin/ImovelWizard'
import RascunhoStatusBar from '@/components/admin/RascunhoStatusBar'
import { TipoImovel } from '@/lib/database/tipos-imoveis'
import { Finalidade } from '@/lib/database/finalidades'
import { StatusImovel } from '@/lib/database/status-imovel'
import { useRascunho } from '@/hooks/useRascunho'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'

export default function EditarImovelPage() {
  const { get, post, put, delete: del } = useAuthenticatedFetch()
  const router = useRouter()
  const params = useParams()
  const imovelId = params.id as string

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [initialData, setInitialData] = useState<Partial<Imovel>>({})
  const [tiposImovel, setTiposImovel] = useState<TipoImovel[]>([])
  const [finalidadesImovel, setFinalidadesImovel] = useState<Finalidade[]>([])
  const [statusImovel, setStatusImovel] = useState<StatusImovel[]>([])
  const [isSaving, setIsSaving] = useState(false) // Flag para evitar criação de rascunho durante salvamento
  const [hasInitialized, setHasInitialized] = useState(false) // Flag para controlar inicialização única

  // Hook de rascunho - só inicializar quando imovelId estiver disponível
  const {
    rascunho,
    iniciarRascunho,
    registrarAlteracao,
    registrarVideoAlteracao,
    substituirVideo,
    registrarImagemPrincipal,
    descartarRascunho,
    confirmarRascunho,
    loading: rascunhoLoading,
    error: rascunhoError
  } = useRascunho(imovelId ? parseInt(imovelId) : 0)

  // Limpar rascunhos antigos deste imóvel específico antes de carregar dados
  const clearOldRascunhos = useCallback(async () => {
    try {
      console.log('🧹 Limpando rascunhos antigos do imóvel:', imovelId)
      const response = await del(`/api/admin/imoveis/${imovelId}/rascunho`)

      if (response.ok) {
        const result = await response.json()
        console.log('✅ Rascunhos antigos do imóvel limpos:', result.message)
      } else {
        console.log('⚠️ Erro na limpeza de rascunhos do imóvel')
      }
    } catch (error) {
      console.error('❌ Erro ao limpar rascunhos antigos:', error)
    }
  }, [imovelId, del])

  const loadImovelData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Primeiro, limpar rascunhos antigos
      await clearOldRascunhos()

      console.log('🔍 Carregando dados do imóvel ID:', imovelId)

      // Carregar dados do imóvel e dados de referência em paralelo
      const [imovelResponse, tiposResponse, finalidadesResponse, statusResponse] = await Promise.all([
        get(`/api/admin/imoveis/${imovelId}`),
        get('/api/admin/imoveis/tipos'),
        get('/api/admin/imoveis/finalidades'),
        get('/api/admin/status-imovel'),
      ])

      console.log('🔍 Resposta da API imóvel:', imovelResponse.status)

      if (!imovelResponse.ok) {
        throw new Error('Erro ao carregar imóvel')
      }

      const response = await imovelResponse.json()
      console.log('🔍 Resposta completa da API:', response)
      const imovel = response.data
      console.log('🔍 Dados do imóvel extraídos:', imovel)

      // Log específico dos documentos
      console.log('🔍 Documentos recebidos da API:', imovel.documentos)
      if (imovel.documentos && imovel.documentos.length > 0) {
        console.log('🔍 Estrutura do primeiro documento da API:', imovel.documentos[0])
        imovel.documentos.forEach((doc: any, index: number) => {
          console.log(`🔍 Documento ${index + 1}:`, {
            id: doc.id,
            tipo_documento_descricao: doc.tipo_documento_descricao,
            id_tipo_documento: doc.id_tipo_documento,
            nome_arquivo: doc.nome_arquivo
          })
        })
      }
      console.log('🔍 Código do imóvel:', imovel.codigo)
      const tipos = await tiposResponse.json()
      const finalidades = await finalidadesResponse.json()
      const status = await statusResponse.json()

      // Função para converter valores numéricos do banco para formato brasileiro
      // Formatar dados para o wizard
      console.log('🔍 ===== VALORES DO BANCO =====')
      console.log('🔍 imovel.preco:', imovel.preco, typeof imovel.preco)
      console.log('🔍 imovel.preco_condominio:', imovel.preco_condominio, typeof imovel.preco_condominio)
      console.log('🔍 imovel.taxa_extra:', imovel.taxa_extra, typeof imovel.taxa_extra)
      console.log('🔍 imovel.area_total:', imovel.area_total, typeof imovel.area_total)
      console.log('🔍 imovel.area_construida:', imovel.area_construida, typeof imovel.area_construida)

      type FormattedAmenidade = {
        amenidadeId: string
        id: number
        nome: string
        categoria_nome: string
        observacoes: any
      }

      const formattedAmenidades: FormattedAmenidade[] = Array.isArray(imovel.amenidades)
        ? imovel.amenidades
          .map((amenidade: any): FormattedAmenidade | null => {
            const amenidadeId =
              amenidade?.amenidade_id ??
              amenidade?.amenidadeId ??
              amenidade?.id ??
              null

            if (amenidadeId === null || amenidadeId === undefined) {
              return null
            }

            return {
              amenidadeId: amenidadeId.toString(),
              id: amenidadeId,
              nome: amenidade?.amenidade_nome ?? amenidade?.nome ?? '',
              categoria_nome: amenidade?.categoria_nome ?? '',
              observacoes: amenidade?.observacoes ?? null,
            }
          })
          .filter(
            (amenidade: FormattedAmenidade | null): amenidade is FormattedAmenidade =>
              amenidade !== null
          )
        : []

      const formattedProximidades = Array.isArray(imovel.proximidades)
        ? imovel.proximidades.map((prox: any) => ({
          id: prox?.proximidade_id ?? prox?.id,
          proximidade_id: prox?.proximidade_id ?? prox?.id,
          nome: prox?.proximidade_nome ?? prox?.nome ?? '',
          categoria_nome: prox?.categoria_nome ?? '',
          distancia_metros:
            prox?.distancia_metros ??
            (typeof prox?.distancia === 'number' ? prox.distancia : null),
          distancia: prox?.distancia ?? '',
          tempo_caminhada: prox?.tempo_caminhada ?? '',
          observacoes: prox?.observacoes ?? '',
        }))
        : []

      const formattedImagens = Array.isArray(imovel.imagens)
        ? imovel.imagens.map((img: any) => {
          const base64 =
            img?.url ??
            (img?.imagem_base64
              ? `data:${img?.tipo_mime || 'image/jpeg'};base64,${img.imagem_base64}`
              : null)

          return {
            id:
              img?.id !== undefined && img?.id !== null
                ? img.id.toString()
                : `imagem-temp-${Date.now()}-${Math.random()}`,
            url: base64 ?? '',
            nome: img?.nome_arquivo ?? `imagem_${img?.id ?? 'sem-id'}`,
            descricao: img?.descricao ?? '',
            ordem: img?.ordem ?? 0,
            principal: Boolean(img?.principal ?? img?.is_principal),
            dataUpload: img?.created_at ?? new Date().toISOString(),
            tamanho: img?.tamanho_bytes ?? 0,
            tipo: img?.tipo_mime ?? 'image/jpeg',
            nome_arquivo: img?.nome_arquivo ?? null,
          }
        })
        : []

      const formattedDocumentos = Array.isArray(imovel.documentos)
        ? imovel.documentos.map((doc: any) => ({
          id: doc?.id,
          nome_arquivo: doc?.nome_arquivo ?? `documento_${doc?.id ?? 'sem-id'}`,
          tipo_mime: doc?.tipo_mime ?? 'application/pdf',
          id_tipo_documento: doc?.id_tipo_documento ?? doc?.tipo_documento_id ?? null,
          tipo_documento_descricao: doc?.tipo_documento_descricao ?? doc?.tipoDocumentoDescricao ?? 'Tipo não encontrado',
          tamanho_bytes:
            typeof doc?.tamanho_bytes === 'string'
              ? parseInt(doc.tamanho_bytes, 10)
              : doc?.tamanho_bytes ?? doc?.tamanhoBytes ?? 0,
          url: doc?.url ?? null,
          created_at: doc?.created_at ?? new Date().toISOString(),
        }))
        : []

      const formattedVideo = imovel.video
        ? {
          ...imovel.video,
          id: imovel.video.id,
          imovel_id: imovel.video.imovel_id ?? imovel.id,
          url: imovel.video.url ?? null,
          nome_arquivo: imovel.video.nome_arquivo ?? '',
          tipo_mime: imovel.video.tipo_mime ?? '',
          tamanho_bytes: imovel.video.tamanho_bytes ?? 0,
          duracao_segundos: imovel.video.duracao_segundos ?? null,
          resolucao: imovel.video.resolucao ?? null,
          formato: imovel.video.formato ?? null,
          ativo: imovel.video.ativo ?? true,
        }
        : null

      const formattedData: Partial<Imovel> = {
        id: imovel.id,
        codigo: imovel.codigo,
        titulo: imovel.titulo,
        descricao: imovel.descricao,
        observacoes: imovel.observacoes,
        endereco: {
          endereco: imovel.endereco,
          numero: imovel.numero,
          complemento: imovel.complemento,
          bairro: imovel.bairro,
          cidade: imovel.cidade_fk,
          estado: imovel.estado_fk,
          cep: imovel.cep
        },
        preco: Number(imovel.preco) || 0,
        precoCondominio: imovel.preco_condominio != null ? Number(imovel.preco_condominio) : undefined,
        precoIPTU: imovel.preco_iptu != null ? Number(imovel.preco_iptu) : undefined,
        taxaExtra: imovel.taxa_extra != null ? Number(imovel.taxa_extra) : undefined,
        areaTotal: Number(imovel.area_total) || 0,
        areaConstruida: imovel.area_construida != null ? Number(imovel.area_construida) : undefined,
        quartos: imovel.quartos,
        banheiros: imovel.banheiros,
        suites: imovel.suites,
        varanda: imovel.varanda,
        vagasGaragem: imovel.vagas_garagem,
        andar: imovel.andar,
        totalAndares: imovel.total_andares,
        mobiliado: imovel.mobiliado,
        aceita_permuta: imovel.aceita_permuta,
        aceita_financiamento: imovel.aceita_financiamento,
        lancamento: imovel.lancamento,
        tipo_fk: imovel.tipo_fk,
        finalidade_fk: imovel.finalidade_fk,
        proprietario_uuid: imovel.proprietario_uuid,
        status: imovel.status_fk,
        imagens: formattedImagens as any,
        documentos: formattedDocumentos as any,
        amenidades: formattedAmenidades as any,
        proximidades: formattedProximidades as any,
        video: formattedVideo as any
      }

      console.log('🔍 ===== DADOS FORMATADOS PARA O WIZARD =====')
      console.log('🔍 formattedData.preco:', formattedData.preco, typeof formattedData.preco)
      console.log('🔍 formattedData.precoCondominio:', formattedData.precoCondominio, typeof formattedData.precoCondominio)
      console.log('🔍 formattedData.taxaExtra:', formattedData.taxaExtra, typeof formattedData.taxaExtra)
      console.log('🔍 formattedData.areaTotal:', formattedData.areaTotal, typeof formattedData.areaTotal)
      console.log('🔍 formattedData.areaConstruida:', formattedData.areaConstruida, typeof formattedData.areaConstruida)
      console.log('🔍 Código nos dados formatados:', formattedData.codigo)
      console.log('🔍 Proprietário UUID nos dados formatados:', formattedData.proprietario_uuid)

      // Log específico dos documentos formatados
      console.log('🔍 Documentos formatados para o wizard:', formattedData.documentos)
      if (formattedData.documentos && formattedData.documentos.length > 0) {
        formattedData.documentos.forEach((doc: any, index: number) => {
          console.log(`🔍 Documento formatado ${index + 1}:`, {
            id: doc.id,
            tipo_documento_descricao: doc.tipo_documento_descricao,
            id_tipo_documento: doc.id_tipo_documento,
            nome_arquivo: doc.nome_arquivo
          })
        })
      }
      console.log('🔍 Dados de endereço formatados:', formattedData.endereco)
      console.log('🔍 PÁGINA DE EDIÇÃO - Vídeo no formattedData:', {
        hasVideo: !!formattedData.video,
        videoId: formattedData.video?.id,
        videoNomeArquivo: formattedData.video?.nome_arquivo,
        videoTipoMime: formattedData.video?.tipo_mime,
        videoTamanhoBytes: formattedData.video?.tamanho_bytes
      })
      console.log('🔍 Vídeo recebido da API:', imovel.video)
      console.log('🔍 Vídeo no formattedData:', formattedData.video)
      console.log('🔍 Detalhes do vídeo da API:', {
        id: imovel.video?.id,
        imovel_id: imovel.video?.imovel_id,
        nome_arquivo: imovel.video?.nome_arquivo,
        tamanho_bytes: imovel.video?.tamanho_bytes,
        tipo_mime: imovel.video?.tipo_mime,
        duracao_segundos: imovel.video?.duracao_segundos,
        resolucao: imovel.video?.resolucao,
        formato: imovel.video?.formato,
        ativo: imovel.video?.ativo,
        hasVideo: !!imovel.video,
        videoKeys: imovel.video ? Object.keys(imovel.video) : 'no video'
      })
      console.log('🔍 Amenidades recebidas da API:', imovel.amenidades)
      console.log('🔍 Proximidades recebidas da API:', imovel.proximidades)
      console.log('🔍 Amenidades no formattedData:', formattedData.amenidades)
      console.log('🔍 Proximidades no formattedData:', formattedData.proximidades)

      setInitialData(formattedData)
      setTiposImovel(tipos)
      setFinalidadesImovel(finalidades)
      setStatusImovel(status)

      // O rascunho será verificado automaticamente pelo hook useRascunho
    } catch (error) {
      console.error('Erro ao carregar dados do imóvel:', error)
      setError('Erro ao carregar dados do imóvel')
    } finally {
      setLoading(false)
    }
  }, [imovelId, get, clearOldRascunhos])

  useEffect(() => {
    if (imovelId) {
      loadImovelData()
    }
  }, [imovelId, loadImovelData])

  // Inicializar rascunho após dados carregados e se não existir um ativo - SEM LOOP
  useEffect(() => {
    console.log('🔍 useEffect rascunho EXECUTADO - Condições:', {
      loading,
      error,
      imovelId,
      rascunhoLoading,
      isSaving,
      hasInitialized,
      shouldInit: !loading && !error && imovelId && !rascunhoLoading && !isSaving && !hasInitialized
    })

    if (!loading && !error && imovelId && !rascunhoLoading && !isSaving && !hasInitialized) {
      console.log('🔍 Inicializando rascunho para imóvel:', imovelId)
      setHasInitialized(true) // Marcar como inicializado
      iniciarRascunho().catch(err => {
        console.error('Erro ao inicializar rascunho:', err)
        setHasInitialized(false) // Resetar em caso de erro
      })
    } else {
      console.log('🔍 NÃO inicializando rascunho - condições não atendidas')
    }
  }, [loading, error, imovelId, rascunhoLoading, iniciarRascunho, isSaving, hasInitialized]) // REMOVIDO rascunho das dependências

  const handleSave = async (data: Imovel) => {
    try {
      setIsSaving(true) // Marcar como salvando
      console.log('🟢 [EDIÇÃO] handleSave chamado - Dados COMPLETOS recebidos:', data)
      console.log('🟢 [EDIÇÃO] Dados de ENDEREÇO:', data.endereco)
      console.log('🟢 [EDIÇÃO] Campo NUMERO especificamente:', data.endereco?.numero)
      console.log('🟢 [EDIÇÃO] Tipo do numero:', typeof data.endereco?.numero)

      // Limpar campos de mídia pesados que não são salvos via PUT para evitar erro 413
      // Imagens e Documentos na edição são salvos via MediaStep (chamadas individuais)
      const { imagens: _, documentos, ...propertyData } = data as any
      const requestBody: any = { ...propertyData }

      if (data.video?.arquivo instanceof File) {
        console.log('🔍 Convertendo vídeo File para base64...')
        const reader = new FileReader()
        const base64Video = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string)
          reader.readAsDataURL(data.video!.arquivo as File)
        })

        requestBody.video = {
          ...data.video,
          arquivo: base64Video
        }
        console.log('🔍 Vídeo convertido para base64')
      } else {
        // Se o vídeo não mudou ou não é um novo arquivo, remover arquivo base64 existente para poupar payload
        if (requestBody.video) {
          delete requestBody.video.arquivo
        }
      }

      console.log('🟢 [EDIÇÃO] requestBody FINAL antes do PUT:', requestBody)
      console.log('🟢 [EDIÇÃO] requestBody.endereco FINAL:', requestBody.endereco)
      console.log('🟢 [EDIÇÃO] requestBody.endereco.numero FINAL:', requestBody.endereco?.numero)

      const response = await put(`/api/admin/imoveis/${imovelId}`, requestBody)

      if (!response.ok) {
        const errorData = await response.json()

        // Se for erro de validação do número, exibir mensagem específica
        if (errorData.field === 'numero' && response.status === 400) {
          alert(`❌ ERRO DE VALIDAÇÃO:\n\n${errorData.error}\n\n${errorData.details?.mensagem || ''}`)
        }

        throw new Error(errorData.error || 'Erro ao salvar alterações')
      }

      const result = await response.json()
      console.log('🔍 Imóvel atualizado com sucesso:', result)

      // Confirmar rascunho (manter alterações)
      if (rascunho) {
        await confirmarRascunho()
      }

      // Garantir que a tabela imovel_rascunho esteja limpa após o salvamento
      try {
        console.log('🧹 Limpando tabela imovel_rascunho após salvamento...')
        const cleanResponse = await del('/api/admin/limpar-rascunhos')

        if (cleanResponse.ok) {
          const cleanResult = await cleanResponse.json()
          console.log('✅ Tabela imovel_rascunho limpa após salvamento:', cleanResult.registrosRemovidos, 'registros removidos')
        }
      } catch (cleanError) {
        console.error('⚠️ Erro ao limpar tabela imovel_rascunho após salvamento:', cleanError)
        // Não falhar o salvamento por causa da limpeza
      }

      // Redirecionar
      try {
        const adminUserRaw = localStorage.getItem('admin-user-data')
        const adminUser = adminUserRaw ? JSON.parse(adminUserRaw) : {}
        const isOwner = adminUser.role_name === 'Proprietário' || adminUser.tipo === 'proprietario' || adminUser.role === 'proprietario' || adminUser.cargo === 'Proprietário'

        if (isOwner) {
          console.log('🔄 Redirecionando Proprietário para Portal na Landpaging')
          window.location.href = '/landpaging?action=meus-imoveis'
        } else {
          router.push('/admin/imoveis')
        }
      } catch (error) {
        console.error('Erro ao processar redirecionamento:', error)
        router.push('/admin/imoveis')
      }
    } catch (error) {
      console.error('Erro ao salvar alterações:', error)
      alert('Erro ao salvar alterações: ' + (error as Error).message)
      setIsSaving(false) // Resetar flag em caso de erro
    }
  }

  const handleDescartarRascunho = async () => {
    try {
      console.log('🔍 Descartando rascunho...')
      await descartarRascunho()

      // Recarregar dados do imóvel para reverter alterações
      await loadImovelData()

      alert('Rascunho descartado com sucesso! Todas as alterações foram revertidas.')
    } catch (error) {
      console.error('Erro ao descartar rascunho:', error)
      alert('Erro ao descartar rascunho: ' + (error as Error).message)
    }
  }


  console.log('🔍 PÁGINA DE EDIÇÃO - Estado atual:', { loading, error, initialData: !!initialData })
  console.log('🔍 PÁGINA DE EDIÇÃO - initialData completo:', initialData)
  console.log('🔍 PÁGINA DE EDIÇÃO - initialData.video:', initialData?.video)

  if (loading) {
    console.log('🔍 PÁGINA DE EDIÇÃO - Mostrando loading...')
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Carregando imóvel...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Erro: {error}</p>
          <button
            onClick={loadImovelData}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Editar Imóvel</h1>

        {/* Barra de status do rascunho */}
        {rascunho && (
          <RascunhoStatusBar
            rascunho={rascunho}
            onDescartar={handleDescartarRascunho}
            loading={rascunhoLoading}
          />
        )}

        {/* Exibir erro do rascunho se houver */}
        {rascunhoError && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-red-700">
                  <strong>Erro no rascunho:</strong> {rascunhoError}
                </p>
              </div>
            </div>
          </div>
        )}

        {(() => {
          console.log('🔍 PÁGINA DE EDIÇÃO - Renderizando ImovelWizard com initialData:', initialData)
          console.log('🔍 PÁGINA DE EDIÇÃO - TESTE SIMPLES - 1, 2, 3')
          return null
        })()}
        <ImovelWizard
          key={initialData?.id ? `imovel-${initialData.id}` : 'imovel-edit'}
          initialData={initialData}
          tiposImovel={tiposImovel}
          finalidadesImovel={finalidadesImovel}
          statusImovel={statusImovel}
          onSave={handleSave}
          onCancel={() => router.push('/admin/imoveis')}
          mode="edit"
          registrarAlteracaoRascunho={registrarAlteracao}
          registrarVideoAlteracaoRascunho={registrarVideoAlteracao}
          substituirVideoRascunho={substituirVideo}
          registrarImagemPrincipalRascunho={registrarImagemPrincipal}
          rascunho={rascunho}
        />
      </div>
    </div>
  )
}