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
      setError(err.message || 'Erro ao carregar dados iniciais.')
    } finally {
      setLoading(false)
    }
  }, [get])

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
          finalidadePreSelecionada={finalidadePreSelecionada}
          onSave={async (data) => {
            console.log('🔍 onSave chamado com dados:', data)
            console.log('🔍 onSave - proximidades:', data.proximidades)
            console.log('🔍 onSave - video:', data.video)
            try {
              // Função para converter File objects para base64 antes do JSON.stringify
              // EXCEÇÃO: Não converter o arquivo do vídeo (body.video.arquivo) - a API espera um File object
              const convertFileToBase64 = async (obj: any, isVideoArquivo: boolean = false): Promise<any> => {
                if (obj === null || obj === undefined) return obj
                
                // Se for o arquivo do vídeo, não converter para base64 - manter como File object
                if (isVideoArquivo && obj instanceof File) {
                  return obj
                }
                
                if (obj instanceof File) {
                  return new Promise((resolve) => {
                    const reader = new FileReader()
                    reader.onload = () => resolve(reader.result)
                    reader.readAsDataURL(obj)
                  })
                }
                if (Array.isArray(obj)) {
                  return Promise.all(obj.map(item => convertFileToBase64(item, false)))
                }
                if (typeof obj === 'object') {
                  const converted: any = {}
                  for (const [key, value] of Object.entries(obj)) {
                    // Se for o arquivo do vídeo, não converter para base64
                    const isVideoArquivoField = key === 'arquivo' && obj === data.video
                    converted[key] = await convertFileToBase64(value, isVideoArquivoField)
                  }
                  return converted
                }
                return obj
              }
              
              // Detectar se é acesso público
              const noSidebar = searchParams?.get('noSidebar') === 'true'
              const fromPublic = noSidebar || (typeof document !== 'undefined' && document.referrer.includes('/landpaging'))
              
              // Preparar requestBody convertendo todos os arquivos para base64
              const requestBody: any = {
                ...data,
                created_by: "1",
                origemPublica: fromPublic // Flag para indicar origem pública
              }
              
              // Converter vídeo para base64 se for File object
              if (requestBody.video && requestBody.video.arquivo instanceof File) {
                console.log('🔍 Convertendo arquivo de vídeo para base64:', requestBody.video.arquivo.name)
                const videoFile = requestBody.video.arquivo
                requestBody.video.arquivo = await new Promise((resolve) => {
                  const reader = new FileReader()
                  reader.onload = () => resolve(reader.result)
                  reader.readAsDataURL(videoFile)
                })
                console.log('🔍 Arquivo de vídeo convertido para base64')
              }
              
              // Converter imagens e documentos para base64
              if (requestBody.imagens && Array.isArray(requestBody.imagens)) {
                requestBody.imagens = await Promise.all(requestBody.imagens.map((img: any) => convertFileToBase64(img, false)))
              }
              
              if (requestBody.documentos && Array.isArray(requestBody.documentos)) {
                requestBody.documentos = await Promise.all(requestBody.documentos.map((doc: any) => convertFileToBase64(doc, false)))
              }
              
              console.log('🔍 Request body preparado:', requestBody)
              console.log('🔍 Request body - IMAGENS:', requestBody.imagens)
              console.log('🔍 Request body - IMAGENS count:', requestBody.imagens?.length)
              console.log('🔍 Request body - PROXIMIDADES:', requestBody.proximidades)
              console.log('🔍 Request body - PROXIMIDADES count:', requestBody.proximidades?.length)
              console.log('🔍 Request body - VIDEO:', requestBody.video)
              console.log('🔍 Request body - VIDEO.arquivo é File?', requestBody.video?.arquivo instanceof File)
              console.log('🔍 Request body - Primeira imagem detalhada:', requestBody.imagens?.[0])
              
              const response = await post('/api/admin/imoveis', requestBody)

              console.log('🔍 Response status:', response.status)
              console.log('🔍 Response ok:', response.ok)

              if (response.ok) {
                const result = await response.json()
                console.log('✅ Imóvel criado com sucesso, ID:', result.data.id)
                
                // Verificar origem para redirecionamento após sucesso
                const noSidebar = searchParams?.get('noSidebar') === 'true'
                const fromPublic = noSidebar || (typeof document !== 'undefined' && document.referrer.includes('/landpaging'))
                
                // Armazenar origem para uso no popup de sucesso
                if (typeof window !== 'undefined') {
                  if (fromPublic) {
                    sessionStorage.setItem('imovelCreatedFromPublic', 'true')
                  } else {
                    sessionStorage.removeItem('imovelCreatedFromPublic')
                  }
                }
                
                return result.data // Retornar o imóvel criado para o popup
              } else {
                const errorText = await response.text()
                console.log('❌ Erro response:', errorText)
                throw new Error(`Erro ao criar imóvel: ${response.status} - ${errorText}`)
              }
            } catch (error) {
              console.error('❌ Erro ao salvar imóvel:', error)
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