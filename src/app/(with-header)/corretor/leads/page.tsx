'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { CheckCircle2, Clock, RefreshCcw } from 'lucide-react'

type LeadRow = {
  prospect_id: number
  status: string
  atribuido_em: string
  expira_em: string | null
  aceito_em: string | null
  imovel_id: number
  codigo: string | null
  titulo: string | null
  preco: number | null
  cidade_fk: string | null
  estado_fk: string | null
  cliente_nome: string | null
  cliente_email: string | null
  cliente_telefone: string | null
  preferencia_contato: string | null
  mensagem: string | null
}

export default function CorretorLeadsPage() {
  const { get, post } = useAuthenticatedFetch()
  const searchParams = useSearchParams()
  const focusProspectId = Number(searchParams?.get('prospectId') || '') || null
  const [loading, setLoading] = useState(true)
  const [leads, setLeads] = useState<LeadRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [accepting, setAccepting] = useState<number | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const resp = await get('/api/corretor/prospects?status=atribuido')
      const data = await resp.json()
      if (!resp.ok || !data?.success) throw new Error(data?.error || 'Erro ao carregar leads')
      setLeads(data.leads || [])
    } catch (e: any) {
      setError(e?.message || 'Erro ao carregar leads')
    } finally {
      setLoading(false)
    }
  }, [get])

  useEffect(() => {
    load()
  }, [load])

  const formatMoney = (v: number | null) => {
    if (v === null || v === undefined) return '-'
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
  }

  const acceptLead = async (prospectId: number) => {
    try {
      setAccepting(prospectId)
      const resp = await post(`/api/corretor/prospects/${prospectId}/accept`, {})
      const data = await resp.json()
      if (!resp.ok || !data?.success) throw new Error(data?.error || 'Não foi possível aceitar o lead')
      await load()
    } catch (e: any) {
      setError(e?.message || 'Erro ao aceitar lead')
    } finally {
      setAccepting(null)
    }
  }

  const now = Date.now()
  const withExpiry = useMemo(() => {
    const mapped = leads.map((l) => {
      const exp = l.expira_em ? new Date(l.expira_em).getTime() : null
      const ms = exp ? Math.max(0, exp - now) : null
      return { ...l, ms_to_expire: ms }
    })
    if (focusProspectId) {
      // Trazer o lead focado pro topo (quando vier do e-mail)
      mapped.sort((a: any, b: any) => {
        const af = a.prospect_id === focusProspectId ? 0 : 1
        const bf = b.prospect_id === focusProspectId ? 0 : 1
        if (af !== bf) return af - bf
        return 0
      })
    }
    return mapped
  }, [leads, now])

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Leads atribuídos</h1>
            <p className="text-sm text-slate-500 mt-1">
              Você precisa <strong>aceitar</strong> para iniciar o atendimento.
            </p>
          </div>
          <button
            onClick={load}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-white font-bold hover:bg-slate-800"
          >
            <RefreshCcw className="w-4 h-4" />
            Atualizar
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-slate-600">Carregando...</div>
        ) : withExpiry.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
            <div className="text-slate-900 font-bold">Nenhum lead pendente.</div>
            <div className="text-slate-500 text-sm mt-1">Quando chegar um novo lead, ele aparecerá aqui.</div>
          </div>
        ) : (
          <div className="space-y-4">
            {withExpiry.map((l: any) => (
              <div
                key={l.prospect_id}
                className={`rounded-2xl border bg-white p-5 shadow-sm ${
                  focusProspectId && l.prospect_id === focusProspectId
                    ? 'border-blue-500 ring-2 ring-blue-200'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-xs font-black text-slate-400 uppercase tracking-widest">
                      {l.estado_fk || '-'} • {l.cidade_fk || '-'} • Código {l.codigo || '-'}
                    </div>
                    <div className="text-lg font-extrabold text-slate-900 truncate mt-1">
                      {l.titulo || 'Imóvel'}
                    </div>
                    <div className="mt-2 text-slate-900 font-black">{formatMoney(l.preco)}</div>
                    <div className="mt-3 text-sm text-slate-700">
                      <strong>Cliente:</strong> {l.cliente_nome || '-'} • {l.cliente_telefone || '-'} • {l.cliente_email || '-'}
                    </div>
                    <div className="mt-1 text-sm text-slate-700">
                      <strong>Preferência:</strong> {l.preferencia_contato || 'Não informado'}
                    </div>
                    {l.mensagem && (
                      <div className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">
                        <strong>Mensagem:</strong> {l.mensagem}
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 flex flex-col items-stretch gap-2">
                    <div className="inline-flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-amber-900 text-sm font-bold">
                      <Clock className="w-4 h-4" />
                      {l.ms_to_expire !== null ? `SLA: ${Math.ceil(l.ms_to_expire / 1000)}s` : 'SLA'}
                    </div>
                    <button
                      onClick={() => acceptLead(l.prospect_id)}
                      disabled={accepting === l.prospect_id}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-white font-black hover:bg-blue-700 disabled:opacity-60"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      {accepting === l.prospect_id ? 'Aceitando...' : 'Aceitar lead'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}


