'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'

// Importar componente do mapa dinamicamente (apenas no cliente)
const MapaImoveis = dynamic(() => import('@/components/mapa/MapaImoveis'), { 
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-lg text-gray-600">Carregando mapa...</p>
      </div>
    </div>
  )
})

interface ImovelMapa {
  id: number
  titulo: string
  preco: number
  latitude: number
  longitude: number
  quartos: number
  suites: number
  banheiros: number
  vagas_garagem: number
  andar: number | null
  total_andares: number | null
  preco_condominio: number | null
  preco_iptu: number | null
  taxa_extra: number | null
  tipo_nome: string
  finalidade_nome: string
}

export default function MapaImoveisPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [imoveis, setImoveis] = useState<ImovelMapa[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)
  const [popupImovel, setPopupImovel] = useState<ImovelMapa | null>(null)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    async function fetchImoveis() {
      try {
        setLoading(true)
        setError(null)

        // Construir query params baseado nos parâmetros da URL
        const tipo = searchParams.get('tipo') || 'nacional'
        const tipoDestaque = searchParams.get('tipo_destaque')
        const estado = searchParams.get('estado')
        const cidade = searchParams.get('cidade')
        const operation = searchParams.get('operation')

        const params = new URLSearchParams({ tipo })
        if (tipoDestaque) params.append('tipo_destaque', tipoDestaque)
        if (estado) params.append('estado', estado)
        if (cidade) params.append('cidade', cidade)
        if (operation) params.append('operation', operation)

        // Adicionar outros filtros se existirem
        const precoMin = searchParams.get('precoMin')
        const precoMax = searchParams.get('precoMax')
        const quartos = searchParams.get('quartos')
        const banheiros = searchParams.get('banheiros')
        const tipoId = searchParams.get('tipoId')
        const bairro = searchParams.get('bairro')

        if (precoMin) params.append('precoMin', precoMin)
        if (precoMax) params.append('precoMax', precoMax)
        if (quartos) params.append('quartos', quartos)
        if (banheiros) params.append('banheiros', banheiros)
        if (tipoId) params.append('tipoId', tipoId)
        if (bairro) params.append('bairro', bairro)

        const response = await fetch(`/api/public/imoveis/mapa?${params.toString()}`)
        const data = await response.json()

        if (data.success) {
          setImoveis(data.data || [])
        } else {
          setError(data.error || 'Erro ao carregar imóveis')
        }
      } catch (err: any) {
        console.error('Erro ao buscar imóveis:', err)
        setError('Erro ao carregar imóveis do mapa')
      } finally {
        setLoading(false)
      }
    }

    if (isClient) {
      fetchImoveis()
    }
  }, [searchParams, isClient])

  if (!isClient) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Carregando mapa...</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Carregando imóveis...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-red-600 mb-4">{error}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Voltar
          </button>
        </div>
      </div>
    )
  }

  if (imoveis.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-gray-600 mb-4">Nenhum imóvel encontrado com coordenadas válidas</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Voltar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Visualização no Mapa
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {imoveis.length} {imoveis.length === 1 ? 'imóvel encontrado' : 'imóveis encontrados'}
              </p>
            </div>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Voltar
            </button>
          </div>
        </div>
      </div>

      {/* Mapa */}
      <div className="w-full h-[calc(100vh-120px)] relative" style={{ position: 'relative', width: '100%', height: 'calc(100vh - 120px)' }}>
        <MapaImoveis imoveis={imoveis} onImovelClick={setPopupImovel} />
      </div>

      {/* Modal com página de consulta pública do imóvel */}
      {popupImovel && (
        <div 
          style={{
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 999999,
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            margin: 0,
            padding: 0,
            overflow: 'auto'
          }}
          onClick={() => setPopupImovel(null)}
        >
          <div 
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              border: '2px solid #93c5fd',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              padding: 0,
              width: '95vw',
              maxWidth: '1400px',
              height: '95vh',
              maxHeight: '95vh',
              overflow: 'hidden',
              margin: 'auto',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: '1px solid #e5e7eb' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#111827' }}>
                Consulta Pública - Imóvel #{popupImovel.id}
              </h2>
              <button
                onClick={() => setPopupImovel(null)}
                style={{
                  color: '#6b7280',
                  fontSize: '24px',
                  fontWeight: 'bold',
                  lineHeight: 1,
                  cursor: 'pointer',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
            </div>
            <iframe
              src={`/imoveis/${popupImovel.id}`}
              style={{
                width: '100%',
                height: 'calc(95vh - 65px)',
                border: 'none',
                flex: 1
              }}
              title={`Consulta pública do imóvel ${popupImovel.id}`}
            />
          </div>
        </div>
      )}
    </div>
  )
}


