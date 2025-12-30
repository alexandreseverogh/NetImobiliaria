'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'

type ImovelCorretorRow = {
  id: number
  imovel_fk: number
  corretor_fk: string
  created_at: string
  created_by: string | null
  titulo: string
  preco: number | null
  quartos: number | null
  suites: number | null
  banheiros: number | null
  varanda: number | null
  vagas_garagem: number | null
  preco_condominio: number | null
  preco_iptu: number | null
  taxa_extra: number | null
  area_total: number | null
  area_construida: number | null
  andar: number | null
  total_andares: number | null
  endereco: string | null
  numero: string | null
  cep: string | null
  estado_fk: string | null
  cidade_fk: string | null
  bairro: string | null
}

export default function ImoveisDoCorretorPage() {
  const { get } = useAuthenticatedFetch()
  const [rows, setRows] = useState<ImovelCorretorRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [corretorNome, setCorretorNome] = useState<string | null>(null)
  const [corretorFotoDataUrl, setCorretorFotoDataUrl] = useState<string | null>(null)

  const handleFechar = () => {
    try {
      const returnUrl = sessionStorage.getItem('corretor_return_url') || '/landpaging'
      const url = new URL(returnUrl, window.location.origin)
      url.searchParams.set('corretor_home', 'true')
      window.location.href = url.pathname + url.search
    } catch {
      window.location.href = '/landpaging?corretor_home=true'
    }
  }

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const resp = await get('/api/public/corretor/imoveis')
        const data = await resp.json().catch(() => null)
        if (!resp.ok || !data?.success) {
          throw new Error(data?.error || 'Erro ao carregar imóveis do corretor')
        }
        setRows(data.data || [])
      } catch (e: any) {
        setError(e?.message || 'Erro ao carregar')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [get])

  const total = rows.length

  // Carregar dados do corretor logado (nome + foto) do localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('user-data')
      if (!raw) return
      const u = JSON.parse(raw)
      const nome = u?.nome ? String(u.nome) : null
      const fotoBase64 = u?.foto ? String(u.foto) : null
      const fotoMime = u?.foto_tipo_mime ? String(u.foto_tipo_mime) : 'image/jpeg'
      setCorretorNome(nome)
      setCorretorFotoDataUrl(fotoBase64 ? `data:${fotoMime};base64,${fotoBase64}` : null)
    } catch {
      // ignore
    }
  }, [])

  const formatBRL = useMemo(() => {
    return (v: unknown) => {
      if (v === null || v === undefined || v === '') return '—'
      const n = typeof v === 'number' ? v : parseFloat(String(v))
      if (Number.isNaN(n)) return '—'
      return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    }
  }, [])

  const formatCEP = useMemo(() => {
    return (cep: string | null) => {
      const c = (cep || '').replace(/\D/g, '')
      if (c.length !== 8) return cep || '—'
      return c.replace(/(\d{5})(\d{3})/, '$1-$2')
    }
  }, [])

  const formatNumber = useMemo(() => {
    return (v: unknown) => (v === null || v === undefined || v === '' ? '—' : String(v))
  }, [])

  const buildGoogleMapsUrl = useMemo(() => {
    return (r: ImovelCorretorRow) => {
      const parts = [
        r.estado_fk,
        r.cidade_fk,
        r.endereco ? `${r.endereco}${r.numero ? `, ${r.numero}` : ''}` : null,
        r.bairro
      ].filter(Boolean)
      const q = parts.join(' - ')
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Carregando imóveis...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-md max-w-xl w-full">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Erro</h1>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={handleFechar}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl p-6">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl font-bold text-gray-900">Imóveis Cadastrados</h1>
                {corretorNome && (
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold text-gray-800">• {corretorNome}</span>
                    {corretorFotoDataUrl ? (
                      <img
                        src={corretorFotoDataUrl}
                        alt={corretorNome}
                        className="w-20 h-20 rounded-full object-cover border-2 border-white shadow"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-gray-200 border-2 border-white shadow flex items-center justify-center text-gray-600 text-lg font-bold">
                        {corretorNome.trim().split(/\s+/).slice(0, 2).map((p: string) => p[0]?.toUpperCase()).join('')}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <p className="text-gray-600 mt-1">
                {total} {total === 1 ? 'imóvel vinculado ao seu cadastro' : 'imóveis vinculados ao seu cadastro'}
              </p>
            </div>
            <button
              onClick={handleFechar}
              className="px-5 py-2.5 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors shadow-md"
            >
              Fechar
            </button>
          </div>

          {rows.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-8">
              <p className="text-gray-700">Nenhum imóvel foi vinculado ao seu cadastro ainda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {rows.map((r) => (
                <div
                  key={r.id}
                  className="bg-white border border-gray-200 rounded-2xl shadow-md hover:shadow-xl transition-shadow p-6 flex flex-col h-full"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-3xl font-extrabold text-blue-700">{formatBRL(r.preco)}</p>
                      <h3 className="text-lg font-semibold text-gray-900 mt-1 whitespace-normal break-words">
                        {r.titulo}
                      </h3>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Vinculado em</p>
                      <p className="text-sm text-gray-900">
                        {r.created_at ? new Date(r.created_at).toLocaleDateString('pt-BR') : '—'}
                      </p>
                      <a
                        href={buildGoogleMapsUrl(r)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex mt-2 px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                      >
                        Mapa
                      </a>
                    </div>
                  </div>

                  <div className="mt-3 text-sm text-gray-700">
                    <span className="font-semibold">{r.estado_fk || '—'}</span>
                    <span className="mx-2 text-gray-400">•</span>
                    <span className="font-semibold">{r.cidade_fk || '—'}</span>
                    <span className="mx-2 text-gray-400">•</span>
                    <span className="font-semibold">
                      {r.endereco ? `${r.endereco}${r.numero ? `, ${r.numero}` : ''}` : '—'}
                    </span>
                    <span className="mx-2 text-gray-400">•</span>
                    <span className="font-semibold">CEP:</span> {formatCEP(r.cep)}
                  </div>

                  {/* Duas listas verticais (layout compacto) */}
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-1 text-gray-800">
                      <div>
                        <span className="font-semibold">{formatNumber(r.quartos)}</span> quartos
                      </div>
                      <div>
                        <span className="font-semibold">{formatNumber(r.suites)}</span> suítes
                      </div>
                      <div>
                        <span className="font-semibold">{formatNumber(r.banheiros)}</span> banheiros
                      </div>
                      <div>
                        <span className="font-semibold">{formatNumber(r.varanda)}</span> varanda
                      </div>
                      <div>
                        <span className="font-semibold">{formatNumber(r.vagas_garagem)}</span> garagem
                      </div>
                      <div className="pt-1 text-gray-700">
                        <span className="font-semibold">{formatNumber(r.area_total)}</span>m² total
                      </div>
                      <div className="text-gray-700">
                        <span className="font-semibold">{formatNumber(r.area_construida)}</span>m² const.
                      </div>
                    </div>

                    <div className="space-y-1 text-gray-800">
                      <div className="grid grid-cols-2 items-center gap-3 w-full">
                        <span className="text-left -ml-2">Condomínio:</span>
                        <span className="font-semibold text-right whitespace-nowrap justify-self-end">{formatBRL(r.preco_condominio)}</span>
                      </div>
                      <div className="grid grid-cols-2 items-center gap-3 w-full">
                        <span className="text-left -ml-2">IPTU:</span>
                        <span className="font-semibold text-right whitespace-nowrap justify-self-end">{formatBRL(r.preco_iptu)}</span>
                      </div>
                      <div className="grid grid-cols-2 items-center gap-3 w-full">
                        <span className="text-left -ml-2">Taxa Extra:</span>
                        <span className="font-semibold text-right whitespace-nowrap justify-self-end">{formatBRL(r.taxa_extra)}</span>
                      </div>
                      <div className="grid grid-cols-2 items-center gap-3 w-full pt-1">
                        <span className="text-left -ml-2">Andar:</span>
                        <span className="font-semibold text-right whitespace-nowrap justify-self-end">{formatNumber(r.andar)}</span>
                      </div>
                      <div className="grid grid-cols-2 items-center gap-3 w-full">
                        <span className="text-left -ml-2">Total Andares:</span>
                        <span className="font-semibold text-right whitespace-nowrap justify-self-end">{formatNumber(r.total_andares)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto pt-5">
                    <button
                      onClick={() => window.open(`/imoveis/${r.imovel_fk}`, '_blank', 'noopener,noreferrer')}
                      className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md"
                    >
                      Detalhes do Imóvel
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


