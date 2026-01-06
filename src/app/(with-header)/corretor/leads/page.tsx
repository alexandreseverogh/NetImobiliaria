'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { CheckCircle2, Clock, RefreshCcw, ChevronDown, ChevronUp } from 'lucide-react'

type LeadRow = {
  prospect_id: number
  status: string
  atribuido_em: string
  expira_em: string | null
  aceito_em: string | null
  motivo_type?: string | null
  requires_aceite?: boolean | null
  data_interesse?: string | null
  imovel_id: number
  codigo: string | null
  titulo: string | null
  descricao?: string | null
  tipo_nome?: string | null
  finalidade_nome?: string | null
  status_nome?: string | null
  preco: number | null
  preco_condominio?: number | null
  preco_iptu?: number | null
  taxa_extra?: number | null
  area_total?: number | null
  area_construida?: number | null
  quartos?: number | null
  banheiros?: number | null
  suites?: number | null
  vagas_garagem?: number | null
  varanda?: number | null
  andar?: number | null
  total_andares?: number | null
  aceita_permuta?: boolean | null
  aceita_financiamento?: boolean | null
  endereco?: string | null
  numero?: string | null
  complemento?: string | null
  bairro?: string | null
  cidade_fk: string | null
  estado_fk: string | null
  cep?: string | null
  proprietario_nome?: string | null
  proprietario_cpf?: string | null
  proprietario_telefone?: string | null
  proprietario_email?: string | null
  proprietario_endereco?: string | null
  proprietario_numero?: string | null
  proprietario_complemento?: string | null
  proprietario_bairro?: string | null
  proprietario_cidade?: string | null
  proprietario_estado?: string | null
  proprietario_cep?: string | null
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
  const statusParam = (searchParams?.get('status') || 'all').toLowerCase()
  const viewParam = (searchParams?.get('view') || '').toLowerCase()
  const [loading, setLoading] = useState(true)
  const [leads, setLeads] = useState<LeadRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [accepting, setAccepting] = useState<number | null>(null)
  const [unauthorized, setUnauthorized] = useState(false)
  const [openDetails, setOpenDetails] = useState<Record<number, boolean>>({})

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      setUnauthorized(false)
      const resp = await get(`/api/corretor/prospects?status=${encodeURIComponent(statusParam || 'all')}`)
      const data = await resp.json().catch(() => null)
      if (resp.status === 401 || data?.error === 'Não autorizado') {
        setUnauthorized(true)
        throw new Error('Não autorizado')
      }
      if (!resp.ok || !data?.success) throw new Error(data?.error || 'Erro ao carregar leads')
      setLeads(data.leads || [])
    } catch (e: any) {
      setError(e?.message || 'Erro ao carregar leads')
    } finally {
      setLoading(false)
    }
  }, [get, statusParam])

  useEffect(() => {
    load()
  }, [load])

  const formatMoney = (v: number | null) => {
    if (v === null || v === undefined) return '-'
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
  }

  const yn = (v: any) => (v === true ? 'Sim' : v === false ? 'Não' : '-')
  const toStr = (v: any) => {
    if (v === null || v === undefined) return '-'
    const s = String(v).trim()
    return s ? s : '-'
  }
  const formatDateTime = (value: any): string => {
    if (!value) return '-'
    try {
      const d = new Date(value)
      if (Number.isNaN(d.getTime())) return '-'
      const dd = String(d.getDate()).padStart(2, '0')
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const yyyy = d.getFullYear()
      const hh = String(d.getHours()).padStart(2, '0')
      const mi = String(d.getMinutes()).padStart(2, '0')
      return `${dd}/${mm}/${yyyy} ${hh}:${mi}`
    } catch {
      return '-'
    }
  }
  const joinParts = (parts: Array<any>) => parts.map((x) => String(x || '').trim()).filter(Boolean).join(', ')

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

  const hasAnyRequiresAceite = useMemo(() => {
    return leads.some((l) => l.status === 'atribuido' && (l.requires_aceite ?? (l.expira_em ? true : false)) === true)
  }, [leads])

  const filteredByView = useMemo(() => {
    const isReq = (l: any) => (l?.requires_aceite ?? (l?.expira_em ? true : false)) === true
    const v = viewParam
    if (!v) return withExpiry
    if (v === 'pendentes') return withExpiry.filter((l: any) => l.status === 'atribuido' && isReq(l))
    if (v === 'atribuido') return withExpiry.filter((l: any) => l.status === 'aceito' || (l.status === 'atribuido' && !isReq(l)))
    if (v === 'aceito') return withExpiry.filter((l: any) => l.status === 'aceito')
    if (v === 'expirado') return withExpiry.filter((l: any) => l.status === 'expirado')
    if (v === 'todos') return withExpiry
    if (v === 'fechado') return [] // futuro
    return withExpiry
  }, [withExpiry, viewParam])

  const pageTitle = useMemo(() => {
    const v = viewParam
    if (v === 'pendentes') return 'Leads pendentes (SLA)'
    if (v === 'atribuido') return 'Leads atribuídos (diretos ou via plataforma)'
    if (v === 'aceito') return 'Leads aceitos'
    if (v === 'expirado') return 'Leads perdidos (SLA)'
    if (v === 'fechado') return 'Leads fechados (em breve)'
    if (v === 'todos') return 'Todos os leads'
    if (statusParam === 'expirado') return 'Leads perdidos (SLA)'
    if (statusParam === 'aceito') return 'Leads aceitos'
    if (statusParam === 'atribuido') return 'Leads atribuídos (diretos ou via plataforma)'
    return 'Leads atribuídos (diretos ou via plataforma)'
  }, [viewParam, statusParam])

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-black text-slate-900">{pageTitle}</h1>
            <p className="text-sm text-slate-500 mt-1">
              {hasAnyRequiresAceite ? (
                <>
                  Você precisa <strong>aceitar</strong> para iniciar o atendimento <span className="text-slate-400">(somente para leads com SLA)</span>.
                </>
              ) : (
                <>
                  Estes leads já estão vinculados ao seu perfil.
                </>
              )}
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
            {unauthorized ? (
              <div className="space-y-2">
                <div className="font-bold">Não autorizado</div>
                <div>
                  Para acessar seus leads, você precisa <strong>entrar como corretor</strong>.
                </div>
                <a
                  className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-white font-black hover:bg-slate-800"
                  href={`/corretor/entrar?next=${encodeURIComponent(
                    `/corretor/leads${focusProspectId ? `?prospectId=${encodeURIComponent(String(focusProspectId))}` : ''}`
                  )}`}
                >
                  Entrar como corretor
                </a>
              </div>
            ) : (
              error
            )}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-slate-600">Carregando...</div>
        ) : filteredByView.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
            <div className="text-slate-900 font-bold">Nenhum lead nesta categoria.</div>
            <div className="text-slate-500 text-sm mt-1">Quando chegar um novo lead, ele aparecerá aqui.</div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredByView.map((l: any) => (
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
                      <strong>Proprietário:</strong> {toStr(l.proprietario_nome)}
                    </div>
                    <div className="mt-1 text-sm text-slate-700">
                      <strong>Preferência:</strong> {l.preferencia_contato || 'Não informado'}
                    </div>
                    <div className="mt-1 text-sm text-slate-700">
                      <strong>Data do interesse:</strong> {formatDateTime(l.data_interesse)}
                    </div>
                    {l.mensagem && (
                      <div className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">
                        <strong>Mensagem:</strong> {l.mensagem}
                      </div>
                    )}

                    {/* Detalhes (Imóvel + Proprietário), colapsável */}
                    {(openDetails[l.prospect_id] || focusProspectId === l.prospect_id) && (
                      <div className="mt-4 space-y-3">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                          <div className="text-xs font-black text-slate-500 uppercase tracking-widest">Imóvel</div>
                          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm text-slate-800">
                            <div><strong>Finalidade:</strong> {toStr(l.finalidade_nome)}</div>
                            <div><strong>Tipo:</strong> {toStr(l.tipo_nome)}</div>
                            <div><strong>Status:</strong> {toStr(l.status_nome)}</div>
                            <div><strong>Condomínio:</strong> {formatMoney(l.preco_condominio ?? null)}</div>
                            <div><strong>IPTU:</strong> {formatMoney(l.preco_iptu ?? null)}</div>
                            <div><strong>Taxa extra:</strong> {formatMoney(l.taxa_extra ?? null)}</div>
                            <div><strong>Área total:</strong> {l.area_total !== null && l.area_total !== undefined ? `${l.area_total} m²` : '-'}</div>
                            <div><strong>Área construída:</strong> {l.area_construida !== null && l.area_construida !== undefined ? `${l.area_construida} m²` : '-'}</div>
                            <div><strong>Quartos:</strong> {toStr(l.quartos)}</div>
                            <div><strong>Banheiros:</strong> {toStr(l.banheiros)}</div>
                            <div><strong>Suítes:</strong> {toStr(l.suites)}</div>
                            <div><strong>Vagas:</strong> {toStr(l.vagas_garagem)}</div>
                            <div><strong>Varanda:</strong> {toStr(l.varanda)}</div>
                            <div><strong>Andar:</strong> {toStr(l.andar)}</div>
                            <div><strong>Total de andares:</strong> {toStr(l.total_andares)}</div>
                            <div><strong>Aceita permuta:</strong> {yn(l.aceita_permuta)}</div>
                            <div><strong>Aceita financiamento:</strong> {yn(l.aceita_financiamento)}</div>
                          </div>
                          <div className="mt-3 text-sm text-slate-800">
                            <strong>Endereço:</strong>{' '}
                            {joinParts([
                              l.endereco,
                              l.numero ? `nº ${l.numero}` : '',
                              l.complemento,
                              l.bairro,
                              l.cidade_fk,
                              l.estado_fk,
                              l.cep ? `CEP: ${l.cep}` : ''
                            ]) || '-'}
                          </div>
                          {l.descricao && (
                            <div className="mt-2 text-sm text-slate-800 whitespace-pre-wrap">
                              <strong>Descrição:</strong> {l.descricao}
                            </div>
                          )}
                        </div>

                        <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
                          <div className="text-xs font-black text-amber-700 uppercase tracking-widest">Proprietário</div>
                          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm text-slate-800">
                            <div><strong>Nome:</strong> {toStr(l.proprietario_nome)}</div>
                            <div><strong>CPF:</strong> {toStr(l.proprietario_cpf)}</div>
                            <div><strong>Telefone:</strong> {toStr(l.proprietario_telefone)}</div>
                            <div><strong>E-mail:</strong> {toStr(l.proprietario_email)}</div>
                          </div>
                          <div className="mt-3 text-sm text-slate-800">
                            <strong>Endereço:</strong>{' '}
                            {joinParts([
                              l.proprietario_endereco,
                              l.proprietario_numero ? `nº ${l.proprietario_numero}` : '',
                              l.proprietario_complemento,
                              l.proprietario_bairro,
                              l.proprietario_cidade,
                              l.proprietario_estado,
                              l.proprietario_cep ? `CEP: ${l.proprietario_cep}` : ''
                            ]) || '-'}
                          </div>
                        </div>

                        <div className="rounded-xl border border-teal-200 bg-teal-50/40 p-4">
                          <div className="text-xs font-black text-teal-700 uppercase tracking-widest">Cliente (Tenho interesse)</div>
                          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm text-slate-800">
                            <div><strong>Nome:</strong> {toStr(l.cliente_nome)}</div>
                            <div><strong>Telefone:</strong> {toStr(l.cliente_telefone)}</div>
                            <div><strong>E-mail:</strong> {toStr(l.cliente_email)}</div>
                            <div><strong>Data do interesse:</strong> {formatDateTime(l.data_interesse)}</div>
                            <div className="sm:col-span-2"><strong>Preferência:</strong> {toStr(l.preferencia_contato || 'Não informado')}</div>
                          </div>
                          {l.mensagem && (
                            <div className="mt-2 text-sm text-slate-800 whitespace-pre-wrap">
                              <strong>Mensagem:</strong> {l.mensagem}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 flex flex-col items-stretch gap-2">
                    {l.status === 'aceito' ? (
                      <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-emerald-900 text-sm font-black">
                        <CheckCircle2 className="w-4 h-4" />
                        Aceito
                      </div>
                    ) : (l.requires_aceite ?? (l.expira_em ? true : false)) ? (
                      <>
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
                          {accepting === l.prospect_id ? 'Aceitando...' : 'Aceitar Lead'}
                        </button>
                      </>
                    ) : (
                      <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-emerald-900 text-sm font-black">
                        <CheckCircle2 className="w-4 h-4" />
                        Lead direto
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        const isOpen = !!(openDetails[l.prospect_id] || focusProspectId === l.prospect_id)
                        setOpenDetails((prev) => ({ ...prev, [l.prospect_id]: !isOpen }))
                      }}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-900 font-black hover:bg-slate-50"
                    >
                      {openDetails[l.prospect_id] || focusProspectId === l.prospect_id ? (
                        <>
                          <ChevronUp className="w-4 h-4" />
                          Ocultar detalhes
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4" />
                          Ver detalhes
                        </>
                      )}
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


