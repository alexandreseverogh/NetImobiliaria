'use client'

import { useEffect, useState } from 'react'
import { GlobeAmericasIcon } from '@heroicons/react/24/solid'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { BrazilClientsProprietariosMap } from './BrazilClientsProprietariosMap'

interface MapDatum {
  state: string
  stateName?: string
  clientes: number
  proprietarios: number
  destaqueVenda: number
  destaqueAluguel: number
  totalImoveis: number
}

interface ClientesProprietariosDashboardProps {
  refreshKey: number
}

export function ClientesProprietariosDashboard({ refreshKey }: ClientesProprietariosDashboardProps) {
  const { get } = useAuthenticatedFetch()
  const [data, setData] = useState<MapDatum[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    const loadData = async () => {
      setLoading(true)
      try {
        const res = await get('/api/admin/dashboards/clientes-proprietarios-estado')
        if (res.ok) {
          const payload = await res.json()
          if (isMounted) {
            const normalized: MapDatum[] = (payload || []).map((item: Partial<MapDatum>) => ({
              state: item.state || '??',
              stateName: item.stateName,
              clientes: item.clientes ?? 0,
              proprietarios: item.proprietarios ?? 0,
              destaqueVenda: item.destaqueVenda ?? 0,
              destaqueAluguel: item.destaqueAluguel ?? 0,
              totalImoveis: item.totalImoveis ?? 0
            }))
            setData(normalized)
          }
        } else if (isMounted) {
          setData([])
        }
      } catch (error) {
        console.error('Erro ao carregar dados de clientes/proprietários por estado:', error)
        if (isMounted) setData([])
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadData()
    return () => {
      isMounted = false
    }
  }, [get, refreshKey])

  return (
    <div className="bg-gradient-to-br from-sky-50 to-blue-50 rounded-lg shadow-lg p-6 mb-6 border border-blue-200 space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-blue-600 p-3 rounded-lg">
          <GlobeAmericasIcon className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Imóveis, Destaques, Proprietários e Clientes</h2>
          <p className="text-sm text-gray-600">Consolidado por UF incluindo totais e destaques</p>
        </div>
      </div>

      <BrazilClientsProprietariosMap data={data} loading={loading} />
    </div>
  )
}
