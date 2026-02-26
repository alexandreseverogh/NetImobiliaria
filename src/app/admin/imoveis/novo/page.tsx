'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import ImovelWizard from '@/components/admin/ImovelWizard'
import LocationStep from '@/components/admin/wizard/LocationStep'
import GeneralDataStep from '@/components/admin/wizard/GeneralDataStep'
import AmenidadesStep from '@/components/admin/wizard/AmenidadesStep'
import ProximidadesStep from '@/components/admin/wizard/ProximidadesStep'
import MediaStep from '@/components/admin/wizard/MediaStep'
import { TipoImovel } from '@/lib/database/tipos-imoveis'
import { Finalidade } from '@/lib/database/finalidades'
import { StatusImovel } from '@/lib/database/status-imovel'
import { useRouter, useSearchParams } from 'next/navigation'

export default function NovoImovelPage() {
  const { get, post, put, delete: del } = useAuthenticatedFetch()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [tiposImovel, setTiposImovel] = useState<TipoImovel[]>([])
  const [finalidadesImovel, setFinalidadesImovel] = useState<Finalidade[]>([])
  const [statusImovel, setStatusImovel] = useState<StatusImovel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lockedProprietario, setLockedProprietario] = useState<{ uuid: string, nome: string } | null>(null)

  const loadTiposStatusEFinalidades = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const [tiposResponse, finalidadesResponse, statusResponse] = await Promise.all([
        get('/api/admin/imoveis/tipos'),
        get('/api/admin/imoveis/finalidades'),
        get('/api/admin/status-imovel'),
      ])

      if (!tiposResponse.ok) throw new Error('Erro ao carregar tipos de imóvel')
      if (!finalidadesResponse.ok) throw new Error('Erro ao carregar finalidades de imóvel')
      if (!statusResponse.ok) throw new Error('Erro ao carregar status de imóvel')

      const tiposData = await tiposResponse.json()
      const finalidadesData = await finalidadesResponse.json()
      const statusData = await statusResponse.json()

      setTiposImovel(tiposData || [])
      setFinalidadesImovel(finalidadesData || [])
      setStatusImovel(statusData || [])

    } catch (err: any) {
      console.error('Erro ao carregar dados iniciais:', err)
      setError(err.message || 'Erro ao carregar dados iniciais')
    } finally {
      setLoading(false)
    }
  }, [get])

  // Detectar modo proprietário e carregar dados
  useEffect(() => {
    const fromProprietario = searchParams.get('fromProprietario')
    const proprietarioUuid = searchParams.get('proprietario_uuid')

    if (fromProprietario === 'true' && proprietarioUuid) {
      // Carregar nome do proprietário
      const loadProprietario = async () => {
        try {
          const response = await get(`/api/admin/proprietarios?uuid=${proprietarioUuid}`)
          if (response.ok) {
            const data = await response.json()
            if (data.proprietarios && data.proprietarios.length > 0) {
              setLockedProprietario({
                uuid: proprietarioUuid,
                nome: data.proprietarios[0].nome
              })
            }
          }
        } catch (err) {
          console.error('Erro ao carregar proprietário:', err)
        }
      }

      loadProprietario()
    }
  }, [searchParams, get])

  useEffect(() => {
    loadTiposStatusEFinalidades()
  }, [loadTiposStatusEFinalidades])

  // Ler finalidade da URL ou sessionStorage e limpar após uso
  const finalidadeParam = searchParams?.get('finalidade')
  const [finalidadeId, setFinalidadeId] = useState<string | null>(null)

  useEffect(() => {
    const finalidadeFromStorage = typeof window !== 'undefined' ? sessionStorage.getItem('finalidadeEscolhida') : null
    const id = finalidadeParam || finalidadeFromStorage

    // Limpar sessionStorage após ler a finalidade
    if (typeof window !== 'undefined' && finalidadeFromStorage) {
      sessionStorage.removeItem('finalidadeEscolhida')
    }

    setFinalidadeId(id)
  }, [finalidadeParam])

  // Preparar initialData com finalidade se disponível (memoizado para evitar recriações)
  // IMPORTANTE: Este hook deve ser chamado ANTES de qualquer retorno condicional
  const initialData = useMemo(() => {
    return finalidadeId ? { finalidade_fk: Number(finalidadeId) } : {}
  }, [finalidadeId])

  // Verificar se a finalidade foi pré-selecionada (vem da página pública)
  const finalidadePreSelecionada = !!finalidadeId

  // Fluxo iniciado via portal do corretor (modal público)
  const fromCorretorPortal = (searchParams?.get('from_corretor') || '').toLowerCase() === 'true'
  const [corretorSuccessRedirectTo, setCorretorSuccessRedirectTo] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (!fromCorretorPortal) {
      setCorretorSuccessRedirectTo(undefined)
      return
    }
    try {
      const returnUrl = sessionStorage.getItem('corretor_return_url') || '/landpaging'
      const url = new URL(returnUrl, window.location.origin)
      url.searchParams.set('corretor_home', 'true')
      setCorretorSuccessRedirectTo(url.pathname + url.search)
    } catch {
      setCorretorSuccessRedirectTo('/landpaging?corretor_home=true')
    }
  }, [fromCorretorPortal])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 flex items-center justify-center">
        <p className="text-gray-600">Carregando dados...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 flex items-center justify-center">
        <p className="text-red-600">Erro: {error}</p>
        <button
          onClick={loadTiposStatusEFinalidades}
          className="ml-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Tentar novamente
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Novo Imóvel</h1>
        <ImovelWizard
          mode="create"
          initialData={initialData}
          finalidadesImovel={finalidadesImovel}
          tiposImovel={tiposImovel}
          statusImovel={statusImovel}
          redirectTo={searchParams?.get('noSidebar') === 'true' ? '/landpaging' : undefined}
          successRedirectTo={fromCorretorPortal ? corretorSuccessRedirectTo : undefined}
          onlyMineProprietarios={fromCorretorPortal}
          finalidadePreSelecionada={finalidadePreSelecionada}
          lockedProprietario={lockedProprietario}
          onSave={async (data) => {
            console.log('🔍 onSave chamado com dados:', data)
            try {
              // 1. Separar dados de mídia para upload posterior
              const { imagens, documentos, video, ...propertyData } = data as any

              // 2. Preparar dados básicos do imóvel
              const noSidebar = searchParams?.get('noSidebar') === 'true'
              const fromPublic = noSidebar || (typeof document !== 'undefined' && document.referrer.includes('/landpaging'))

              const requestBody = {
                ...propertyData,
                created_by: "1",
                origemPublica: fromPublic,
                fromCorretorPortal,
                proprietario_uuid: lockedProprietario?.uuid || data.proprietario_uuid,
                // Enviar arrays vazios para evitar processamento pesado de base64 no body
                imagens: [],
                documentos: [],
                video: null
              }

              console.log('🚀 Step 1: Salvando dados básicos do imóvel...')
              const response = await post('/api/admin/imoveis', requestBody)

              if (!response.ok) {
                const errorText = await response.text()
                throw new Error(`Erro ao criar imóvel: ${response.status} - ${errorText}`)
              }

              const result = await response.json()
              const imovelId = result.data.id
              console.log('✅ Imóvel criado com sucesso, ID:', imovelId)

              // 3. Step 2: Upload de arquivos de mídia se existirem
              const uploadPromises: Promise<any>[] = []

              // A. Upload de Imagens (via FormData - Lote)
              const imagensParaUpload = imagens?.filter((img: any) => img.file instanceof File) || []
              if (imagensParaUpload.length > 0) {
                console.log(`🚀 Step 2A: Fazendo upload de ${imagensParaUpload.length} imagens...`)
                const imagesFormData = new FormData()
                imagensParaUpload.forEach((img: any) => {
                  imagesFormData.append('images', img.file)
                })

                uploadPromises.push(
                  fetch(`/api/admin/imoveis/${imovelId}/imagens`, {
                    method: 'POST',
                    body: imagesFormData
                  }).then(async r => {
                    if (!r.ok) console.error('❌ Erro no upload de imagens:', await r.text())
                    return r
                  })
                )
              }

              // B. Upload de Documentos (Individuais)
              const documentosParaUpload = documentos?.filter((doc: any) => doc.file instanceof File) || []
              if (documentosParaUpload.length > 0) {
                console.log(`🚀 Step 2B: Fazendo upload de ${documentosParaUpload.length} documentos...`)
                documentosParaUpload.forEach((doc: any) => {
                  const docFormData = new FormData()
                  docFormData.append('documento', doc.file)
                  docFormData.append('tipo_documento_id', doc.tipoDocumentoId.toString())

                  uploadPromises.push(
                    fetch(`/api/admin/imoveis/${imovelId}/documentos`, {
                      method: 'POST',
                      body: docFormData
                    }).then(async r => {
                      if (!r.ok) console.error(`❌ Erro no upload do documento ${doc.nomeArquivo}:`, await r.text())
                      return r
                    })
                  )
                })
              }

              // C. Upload de Vídeo
              if (video && video.arquivo instanceof File) {
                console.log('🚀 Step 2C: Fazendo upload de vídeo...')
                const videoFormData = new FormData()
                videoFormData.append('video', video.arquivo)

                uploadPromises.push(
                  fetch(`/api/admin/imoveis/${imovelId}/video`, {
                    method: 'POST',
                    body: videoFormData
                  }).then(async r => {
                    if (!r.ok) console.error('❌ Erro no upload de vídeo:', await r.text())
                    return r
                  })
                )
              }

              // Aguardar todos os uploads (opcionalmente poderíamos lidar com falhas parciais aqui)
              if (uploadPromises.length > 0) {
                console.log('⏳ Aguardando uploads de mídia...')
                await Promise.allSettled(uploadPromises)
                console.log('✅ Processo de uploads finalizado')
              }

              // 4. Redirecionamento e Finalização
              if (typeof window !== 'undefined') {
                if (fromPublic) {
                  sessionStorage.setItem('imovelCreatedFromPublic', 'true')
                } else {
                  sessionStorage.removeItem('imovelCreatedFromPublic')
                }
              }

              return result.data
            } catch (error) {
              console.error('❌ Erro no fluxo de salvamento:', error)
              throw error
            }
          }}
          onCancel={() => {
            // Verificar se veio da página pública (via noSidebar ou referrer)
            const noSidebar = searchParams?.get('noSidebar') === 'true'
            const fromPublic = noSidebar || document.referrer.includes('/landpaging')

            if (fromPublic) {
              router.push('/landpaging')
            } else {
              router.push('/admin/imoveis')
            }
          }}
        />
      </div>
    </div>
  )
}