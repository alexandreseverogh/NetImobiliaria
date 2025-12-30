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
  estado_fk: string | null
  cidade_fk: string | null
  bairro: string | null
}

export default function ImoveisCorretorPage() {
  // Esta rota /admin/... não deve ser usada no fluxo do portal do corretor.
  // Mantemos apenas como compatibilidade/redirect para a nova rota pública do corretor.
  useEffect(() => {
    try {
      window.location.href = '/corretor/imoveis'
    } catch {}
  }, [])

  const { get } = useAuthenticatedFetch()
  const [rows, setRows] = useState<ImovelCorretorRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
        const resp = await get('/api/admin/imoveis-corretor')
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

  const formatPreco = useMemo(() => {
    return (v: number | null) => {
      if (v === null || v === undefined) return '—'
      try {
        return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      } catch {
        return String(v)
      }
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Carregando imóveis do corretor...</div>
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
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Imóveis Cadastrados</h1>
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
          <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
            <p className="text-gray-700">Nenhum imóvel foi vinculado ao seu cadastro ainda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {rows.map((r) => (
              <div
                key={r.id}
                className="bg-white border border-gray-200 rounded-2xl shadow-md hover:shadow-xl transition-shadow p-6"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500">Vínculo #{r.id}</p>
                    <h3 className="text-lg font-semibold text-gray-900 truncate" title={r.titulo}>
                      {r.titulo}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {r.bairro ? `${r.bairro} • ` : ''}
                      {r.cidade_fk || '—'}
                      {r.estado_fk ? `/${r.estado_fk}` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Imóvel</p>
                    <p className="text-sm font-semibold text-gray-900">#{r.imovel_fk}</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">Preço</p>
                    <p className="text-sm font-semibold text-gray-900">{formatPreco(r.preco)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Vinculado em</p>
                    <p className="text-sm text-gray-900">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString('pt-BR') : '—'}
                    </p>
                  </div>
                </div>

                <div className="mt-5">
                  <button
                    onClick={() => window.open(`/imoveis/${r.imovel_fk}`, '_blank', 'noopener,noreferrer')}
                    className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md"
                  >
                    Consultar imóvel
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}


