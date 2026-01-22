'use client'

import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { CheckCircle2, Clock, RefreshCcw, ChevronDown, ChevronUp, Bed, Bath, Car, Layers, Building2, DollarSign, CreditCard, ArrowLeftRight, BadgeCheck, X } from 'lucide-react'

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
  imovel_status_fk: number | null
}

export default function CorretorLeadsPage() {
  const { get, post } = useAuthenticatedFetch()
  const searchParams = useSearchParams()
  const focusProspectId = Number(searchParams?.get('prospectId') || '') || null
  const statusParam = (searchParams?.get('status') || 'all').toLowerCase()
  const viewParam = (searchParams?.get('view') || '').toLowerCase()
  const [loading, setLoading] = useState(true)

  const [tipoCorretor, setTipoCorretor] = useState<string | null>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('admin-user-data')
      if (stored) {
        const parsed = JSON.parse(stored)
        setTipoCorretor(parsed.tipo_corretor || null)
      }
    } catch { }
  }, [])

  const [leads, setLeads] = useState<LeadRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [accepting, setAccepting] = useState<number | null>(null)

  // Estados para o Modal de Negócio Fechado
  const [isNegocioFechadoOpen, setIsNegocioFechadoOpen] = useState(false)
  const [codigoBusca, setCodigoBusca] = useState('')
  const inputBuscaRef = useRef<HTMLInputElement>(null)
  const [imovelEncontrado, setImovelEncontrado] = useState<any>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [isConfirmingNegocio, setIsConfirmingNegocio] = useState(false)
  const [negocioFechadoChecked, setNegocioFechadoChecked] = useState(false)
  const [negocioError, setNegocioError] = useState<string | null>(null)
  const [showParabens, setShowParabens] = useState(false)
  const [initialStatus, setInitialStatus] = useState<number | null>(null)
  const [unauthorized, setUnauthorized] = useState(false)
  const [openDetails, setOpenDetails] = useState<Record<number, boolean>>({})
  const [slaMinutos, setSlaMinutos] = useState<number | null>(null)
  const [slaMinutosInterno, setSlaMinutosInterno] = useState<number | null>(null)

  const loadConfig = useCallback(async () => {
    try {
      const resp = await get('/api/corretor/lead-config')
      const data = await resp.json()
      if (resp.ok && data?.success) {
        const n = Number(data?.data?.sla_minutos_aceite_lead)
        if (Number.isFinite(n) && n > 0) setSlaMinutos(n)
        const ni = Number(data?.data?.sla_minutos_aceite_lead_interno)
        if (Number.isFinite(ni) && ni > 0) setSlaMinutosInterno(ni)
      }
    } catch { }
  }, [get])

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      setUnauthorized(false)
      loadConfig()
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

  // Efeito para focar o input ao abrir o modal de Negócio Fechado
  useEffect(() => {
    if (isNegocioFechadoOpen) {
      setTimeout(() => {
        inputBuscaRef.current?.focus()
      }, 300)
    }
  }, [isNegocioFechadoOpen])

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

  const handleBuscarImovelStatus = async () => {
    if (!codigoBusca.trim()) return
    setIsSearching(true)
    setNegocioError(null)
    setImovelEncontrado(null)
    setInitialStatus(null)
    try {
      const resp = await fetch(`/api/admin/imoveis/by-codigo/${codigoBusca}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin-auth-token') || localStorage.getItem('auth-token')}`
        }
      })
      const data = await resp.json()
      if (resp.ok && data.success) {
        const imovel = data.imovel

        // Validação: conferir se o imóvel pertence ao corretor logado
        let currentBrokerId = ''
        try {
          const stored = localStorage.getItem('admin-user-data')
          if (stored) {
            const parsed = JSON.parse(stored)
            currentBrokerId = String(parsed.id || '')
          }
        } catch { }

        const imovelBrokerId = String(imovel?.corretor_fk || '').toLowerCase().trim()

        if (imovelBrokerId !== currentBrokerId.toLowerCase().trim()) {
          setNegocioError('Este código de imóvel não está associado a você')
          return
        }

        setImovelEncontrado(imovel)
        setNegocioFechadoChecked(data.imovel.status_fk === 100)
        setInitialStatus(data.imovel.status_fk)
      } else {
        setNegocioError('Este código de imóvel não está associado a você')
      }
    } catch (err) {
      setNegocioError('Erro ao buscar imóvel.')
    } finally {
      setIsSearching(false)
    }
  }

  const handleConfirmarNegocioFechado = async () => {
    if (!imovelEncontrado) return
    setIsConfirmingNegocio(true)
    setNegocioError(null)
    try {
      const novoStatus = negocioFechadoChecked ? 100 : 1
      const resp = await fetch(`/api/admin/imoveis/${imovelEncontrado.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin-auth-token') || localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify({ status_fk: novoStatus })
      })
      const data = await resp.json()
      if (resp.ok && data.success) {
        if (novoStatus === 100) {
          setShowParabens(true)
          setTimeout(() => {
            setIsNegocioFechadoOpen(false)
            setShowParabens(false)
            setImovelEncontrado(null)
            setCodigoBusca('')

            // Limpar cache de destaques da landpaging para garantir sincronia após reload
            try {
              Object.keys(sessionStorage).forEach(key => {
                if (key.startsWith('featured-destaque-cache:')) {
                  sessionStorage.removeItem(key)
                }
              })
            } catch { }

            const statusAlterado = novoStatus !== initialStatus
            if (statusAlterado) {
              window.location.href = '/landpaging'
            } else {
              window.location.reload()
            }
          }, 3000)
        } else {
          setIsNegocioFechadoOpen(false)
          setImovelEncontrado(null)
          setCodigoBusca('')

          const statusAlterado = novoStatus !== initialStatus
          if (statusAlterado) {
            try {
              Object.keys(sessionStorage).forEach(key => {
                if (key.startsWith('featured-destaque-cache:')) {
                  sessionStorage.removeItem(key)
                }
              })
            } catch { }
            window.location.href = '/landpaging'
          } else {
            window.location.reload()
          }
        }

        try {
          window.dispatchEvent(new CustomEvent('ui-toast', {
            detail: { type: 'success', message: 'Status do imóvel atualizado com sucesso!' }
          }))
        } catch { }
      } else {
        setNegocioError(data.error || 'Erro ao atualizar status.')
      }
    } catch (err) {
      setNegocioError('Erro ao atualizar status.')
    } finally {
      setIsConfirmingNegocio(false)
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
    if (v === 'pendentes') return withExpiry.filter((l: any) => l.status === 'atribuido' && isReq(l) && l.imovel_status_fk !== 100)
    if (v === 'atribuido') return withExpiry.filter((l: any) => (l.status === 'aceito' || (l.status === 'atribuido' && !isReq(l))) && l.imovel_status_fk !== 100)
    if (v === 'aceito') return withExpiry.filter((l: any) => l.status === 'aceito' && l.imovel_status_fk !== 100)
    if (v === 'expirado') return withExpiry.filter((l: any) => l.status === 'expirado')
    if (v === 'todos') return withExpiry
    if (v === 'fechado') return withExpiry.filter((l: any) => l.imovel_status_fk === 100)
    return withExpiry
  }, [withExpiry, viewParam])

  const pageTitle = useMemo(() => {
    const v = viewParam
    if (v === 'pendentes') return 'Leads pendentes (SLA)'
    if (v === 'atribuido') return 'Leads atribuídos (diretos ou via plataforma)'
    if (v === 'aceito') return 'Leads aceitos'
    if (v === 'expirado') return 'Leads perdidos (SLA)'
    if (v === 'fechado') return 'Leads fechados'
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
          <button
            onClick={() => {
              setNegocioError(null)
              setImovelEncontrado(null)
              setCodigoBusca('')
              setIsNegocioFechadoOpen(true)
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-white font-bold hover:bg-indigo-700 shadow-sm transition-all"
          >
            <BadgeCheck className="w-4 h-4" />
            Negócio Fechado
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
                className={`rounded-2xl border bg-white p-5 shadow-sm ${focusProspectId && l.prospect_id === focusProspectId
                  ? 'border-blue-500 ring-2 ring-blue-200'
                  : 'border-gray-200'
                  }`}
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="min-w-0">
                    <div className="mt-1 text-sm text-slate-600 font-bold mb-2">
                      <span className="text-slate-500 font-black">Data do interesse:</span>{' '}
                      {formatDateTime(l.data_interesse)}
                    </div>
                    <div className="text-xs font-black text-slate-400 uppercase tracking-widest space-y-0.5">
                      <div>{l.estado_fk || '-'} • {l.cidade_fk || '-'}</div>
                      <div>Negócio: <span className="text-slate-700">{l.codigo || '-'}</span></div>
                      <div>Código do Imóvel: <span className="text-slate-700">{l.imovel_id || '-'}</span></div>
                    </div>
                    <div className="text-lg font-extrabold text-slate-900 truncate mt-2">
                      {l.titulo || 'Imóvel'}
                    </div>
                    <div className="mt-2 text-slate-900 font-black text-lg">{formatMoney(l.preco)}</div>

                    {/* Características rápidas do imóvel no CARD da listagem */}
                    <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-y-3 gap-x-4 py-4 border-y border-slate-50 bg-slate-50/30 rounded-2xl px-4">
                      <div className="flex items-center gap-2 text-[11px]">
                        <Bed className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="text-slate-600"><strong>Quartos:</strong> <span className="font-black text-slate-900">{toStr(l.quartos)}</span></span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px]">
                        <Bed className="w-4 h-4 text-purple-400 shrink-0" />
                        <span className="text-slate-600"><strong>Suítes:</strong> <span className="font-black text-slate-900">{toStr(l.suites)}</span></span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px]">
                        <Bath className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="text-slate-600"><strong>Banheiros:</strong> <span className="font-black text-slate-900">{toStr(l.banheiros)}</span></span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px]">
                        <Car className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="text-slate-600"><strong>Garagem:</strong> <span className="font-black text-slate-900">{toStr(l.vagas_garagem)}</span></span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px]">
                        <Layers className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="text-slate-600"><strong>Andar:</strong> <span className="font-black text-slate-900">{toStr(l.andar)}</span></span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px]">
                        <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="text-slate-600"><strong>Total Andares:</strong> <span className="font-black text-slate-900">{toStr(l.total_andares)}</span></span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px]">
                        <DollarSign className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span className="text-slate-600"><strong>IPTU:</strong> <span className="font-black text-slate-900">{formatMoney(l.preco_iptu)}</span></span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px]">
                        <DollarSign className="w-4 h-4 text-blue-500 shrink-0" />
                        <span className="text-slate-600"><strong>Taxas:</strong> <span className="font-black text-slate-900">{formatMoney(l.taxa_extra)}</span></span>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 py-3 px-4 border-t border-slate-50 bg-slate-50/20 rounded-b-2xl">
                      <div className="flex items-center gap-2 text-[11px]">
                        <CreditCard className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="text-slate-600"><strong>Financiamento:</strong> <span className="font-black text-slate-900">{yn(l.aceita_financiamento)}</span></span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px]">
                        <ArrowLeftRight className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="text-slate-600"><strong>Permuta:</strong> <span className="font-black text-slate-900">{yn(l.aceita_permuta)}</span></span>
                      </div>
                    </div>

                    <div className="mt-4 text-sm text-slate-700">
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
                    <div className="mt-2 text-sm text-slate-700">
                      <strong>Status:</strong>{' '}
                      <span className="text-slate-600 font-bold">
                        {l.status || '-'}
                        {l.status === 'expirado' && (() => {
                          const type = String(tipoCorretor || '').toLowerCase()
                          const mins = type === 'interno' ? slaMinutosInterno : slaMinutos
                          return mins ? ` SLA ${mins} min` : ''
                        })()}
                      </span>
                    </div>

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

      {/* Modal de Negócio Fechado */}
      {isNegocioFechadoOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in duration-200">
            {/* Header / Parabens */}
            <div className={`p-6 border-b border-slate-100 transition-all duration-500 ${showParabens ? 'bg-indigo-600 text-white' : 'bg-gradient-to-br from-indigo-50 to-white'}`}>
              <div className="flex items-center justify-between">
                {!showParabens ? (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                        <BadgeCheck className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-slate-900 leading-tight">Negócio Fechado</h3>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-0.5">Gerenciar Status</p>
                      </div>
                    </div>
                    <button
                      onClick={() => !isConfirmingNegocio && setIsNegocioFechadoOpen(false)}
                      className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </>
                ) : (
                  <div className="flex-1 text-center py-4 animate-bounce">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4">
                      <BadgeCheck className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-4xl font-black tracking-tighter">Parabéns !!!</h3>
                    <p className="text-white/80 font-bold mt-2 uppercase text-xs tracking-[0.3em]">Negócio Finalizado com Sucesso</p>
                  </div>
                )}
              </div>
            </div>

            {!showParabens && (
              <>
                <div className="p-6 space-y-6">
                  {/* Busca */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                      Buscar Imóvel por Código
                    </label>
                    <div className="flex gap-2">
                      <input
                        ref={inputBuscaRef}
                        type="text"
                        value={codigoBusca}
                        onChange={(e) => setCodigoBusca(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === 'Enter' && handleBuscarImovelStatus()}
                        placeholder="Ex: 123"
                        className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                      />
                      <button
                        onClick={handleBuscarImovelStatus}
                        disabled={isSearching || !codigoBusca.trim()}
                        className="px-4 py-2.5 bg-slate-900 text-white text-xs font-black rounded-xl hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center gap-2"
                      >
                        {isSearching ? <RefreshCcw className="w-4 h-4 animate-spin" /> : 'Buscar'}
                      </button>
                    </div>
                  </div>

                  {negocioError && (
                    <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-700 text-xs font-bold animate-in slide-in-from-top-2 duration-200">
                      {negocioError}
                    </div>
                  )}

                  {imovelEncontrado && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Código</span>
                          <span className="text-sm font-black text-slate-900">{imovelEncontrado.codigo}</span>
                        </div>
                        <div className="space-y-1">
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Título</div>
                          <div className="text-sm font-bold text-slate-700 line-clamp-2">{imovelEncontrado.titulo}</div>
                        </div>
                        {imovelEncontrado.preco && (
                          <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Preço</span>
                            <span className="text-sm font-black text-indigo-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(imovelEncontrado.preco)}</span>
                          </div>
                        )}
                      </div>

                      <label className="flex items-center gap-3 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl cursor-pointer group transition-all hover:bg-indigo-100">
                        <div className="relative flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={negocioFechadoChecked}
                            onChange={(e) => setNegocioFechadoChecked(e.target.checked)}
                            className="peer sr-only"
                          />
                          <div className="w-6 h-6 border-2 border-indigo-200 rounded-lg bg-white peer-checked:bg-indigo-600 peer-checked:border-indigo-600 transition-all"></div>
                          <BadgeCheck className="absolute w-4 h-4 text-white opacity-0 peer-checked:opacity-100 transition-all" />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-black text-indigo-900">Negócio Fechado</div>
                          <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-tight">Vendido / Alugado</div>
                        </div>
                      </label>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex gap-3">
                  <button
                    onClick={() => setIsNegocioFechadoOpen(false)}
                    className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-600 text-xs font-black rounded-xl hover:bg-slate-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmarNegocioFechado}
                    disabled={!imovelEncontrado || isConfirmingNegocio}
                    className="flex-[2] px-4 py-3 bg-indigo-600 text-white text-xs font-black rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
                  >
                    {isConfirmingNegocio ? <RefreshCcw className="w-4 h-4 animate-spin" /> : 'Confirmar Alteração'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}


