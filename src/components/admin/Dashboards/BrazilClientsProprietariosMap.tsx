"use client"

import { useMemo } from 'react'

interface MapDatum {
  state: string
  stateName?: string
  clientes: number
  proprietarios: number
  destaqueVenda: number
  destaqueAluguel: number
  totalImoveis: number
}

interface BrazilClientsProprietariosMapProps {
  data: MapDatum[]
  loading?: boolean
}

const STATE_NAMES: Record<string, string> = {
  AC: 'Acre',
  AL: 'Alagoas',
  AM: 'Amazonas',
  AP: 'Amapá',
  BA: 'Bahia',
  CE: 'Ceará',
  DF: 'Distrito Federal',
  ES: 'Espírito Santo',
  GO: 'Goiás',
  MA: 'Maranhão',
  MG: 'Minas Gerais',
  MS: 'Mato Grosso do Sul',
  MT: 'Mato Grosso',
  PA: 'Pará',
  PB: 'Paraíba',
  PE: 'Pernambuco',
  PI: 'Piauí',
  PR: 'Paraná',
  RJ: 'Rio de Janeiro',
  RN: 'Rio Grande do Norte',
  RO: 'Rondônia',
  RR: 'Roraima',
  RS: 'Rio Grande do Sul',
  SC: 'Santa Catarina',
  SE: 'Sergipe',
  SP: 'São Paulo',
  TO: 'Tocantins',
  NAO_INFORMADO: 'Não informado'
}

export function BrazilClientsProprietariosMap({ data, loading = false }: BrazilClientsProprietariosMapProps) {
  const tableData = useMemo(() => {
    const merged = new Map<string, {
      state: string
      stateName: string
      clientes: number
      proprietarios: number
      destaqueVenda: number
      destaqueAluguel: number
      totalImoveis: number
    }>()

    data.forEach((item) => {
      const uf = item.state?.toUpperCase()
      if (!uf) return

      const current = merged.get(uf) ?? {
        state: uf,
        stateName: STATE_NAMES[uf] ?? item.stateName ?? uf,
        clientes: 0,
        proprietarios: 0,
        destaqueVenda: 0,
        destaqueAluguel: 0,
        totalImoveis: 0
      }

      current.clientes += item.clientes ?? 0
      current.proprietarios += item.proprietarios ?? 0
      current.destaqueVenda += item.destaqueVenda ?? 0
      current.destaqueAluguel += item.destaqueAluguel ?? 0
      current.totalImoveis += item.totalImoveis ?? 0

      merged.set(uf, current)
    })

    return Array.from(merged.values()).sort((a, b) => a.state.localeCompare(b.state))
  }, [data])

  const totals = useMemo(() => {
    return tableData.reduce(
      (acc, item) => {
        acc.clientes += item.clientes
        acc.proprietarios += item.proprietarios
        acc.destaqueVenda += item.destaqueVenda
        acc.destaqueAluguel += item.destaqueAluguel
        acc.totalImoveis += item.totalImoveis
        return acc
      },
      { clientes: 0, proprietarios: 0, destaqueVenda: 0, destaqueAluguel: 0, totalImoveis: 0 }
    )
  }, [tableData])

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 h-[420px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="text-gray-500 text-sm">Carregando dados...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Clientes e Proprietários por Estado</h3>
          <p className="text-sm text-gray-500">Totais agregados por UF</p>
        </div>

        <div className="flex gap-4 flex-wrap">
          <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800 shadow-sm">
            <p className="font-semibold uppercase text-xs tracking-wide text-blue-700">Clientes</p>
            <p className="text-2xl font-bold">{totals.clientes}</p>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-sm">
            <p className="font-semibold uppercase text-xs tracking-wide text-emerald-700">Proprietários</p>
            <p className="text-2xl font-bold">{totals.proprietarios}</p>
          </div>
          <div className="rounded-xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm text-orange-800 shadow-sm">
            <p className="font-semibold uppercase text-xs tracking-wide text-orange-700">Destaques Venda</p>
            <p className="text-2xl font-bold">{totals.destaqueVenda}</p>
          </div>
          <div className="rounded-xl border border-purple-100 bg-purple-50 px-4 py-3 text-sm text-purple-800 shadow-sm">
            <p className="font-semibold uppercase text-xs tracking-wide text-purple-700">Destaques Aluguel</p>
            <p className="text-2xl font-bold">{totals.destaqueAluguel}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 shadow-sm">
            <p className="font-semibold uppercase text-xs tracking-wide text-slate-700">Imóveis</p>
            <p className="text-2xl font-bold">{totals.totalImoveis}</p>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 shadow-inner">
        <table className="min-w-full table-fixed text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">UF</th>
              <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Estado</th>
              <th className="px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">Clientes</th>
              <th className="px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">Proprietários</th>
              <th className="px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">Destaques Venda</th>
              <th className="px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">Destaques Aluguel</th>
              <th className="px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">Imóveis</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {tableData.map((item, index) => {
              const zebra = index % 2 === 0 ? 'bg-white' : 'bg-slate-50'
              return (
                <tr key={item.state} className={`${zebra} transition-colors hover:bg-blue-50/60`}>
                  <td className="px-4 py-2 text-[13px] font-semibold text-slate-700">{item.state}</td>
                  <td className="px-4 py-2 text-[13px] text-slate-600">{item.stateName}</td>
                  <td className="px-4 py-2 text-[13px] text-right font-semibold text-blue-700">{item.clientes}</td>
                  <td className="px-4 py-2 text-[13px] text-right font-semibold text-emerald-700">{item.proprietarios}</td>
                  <td className="px-4 py-2 text-[13px] text-right font-semibold text-orange-700">
                    {item.destaqueVenda}
                    <span className="ml-1 text-xs text-orange-500">
                      ({item.totalImoveis > 0 ? ((item.destaqueVenda / item.totalImoveis) * 100).toFixed(1) : '0.0'}%)
                    </span>
                  </td>
                  <td className="px-4 py-2 text-[13px] text-right font-semibold text-purple-700">
                    {item.destaqueAluguel}
                    <span className="ml-1 text-xs text-purple-500">
                      ({item.totalImoveis > 0 ? ((item.destaqueAluguel / item.totalImoveis) * 100).toFixed(1) : '0.0'}%)
                    </span>
                  </td>
                  <td className="px-4 py-2 text-[13px] text-right font-semibold text-slate-700">{item.totalImoveis}</td>
                </tr>
              )
            })}

            {tableData.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-sm text-slate-500">
                  Nenhum dado disponível para exibir.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
