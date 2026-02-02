'use client'

import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { ArrowLeft, CheckCircle2, Clock, RefreshCcw, Bed, Bath, Car, Layers, Building2, DollarSign, CreditCard, ArrowLeftRight, BadgeCheck, X } from 'lucide-react'

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

export default function CorretorLeadDetalhePage() {
  const params = useParams()
  const { get, post } = useAuthenticatedFetch()
  const prospectId = Number((params as any)?.prospectId || '')

  const [loading, setLoading] = useState(true)
  const [lead, setLead] = useState<LeadRow | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [accepting, setAccepting] = useState(false)

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
  const [slaMinutos, setSlaMinutos] = useState<number | null>(null)
  const [slaMinutosInterno, setSlaMinutosInterno] = useState<number | null>(null)
  const [tipoCorretor, setTipoCorretor] = useState<string | null>(null)

  const formatMoney = (v: number | null | undefined) => {
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
      loadConfig()
      if (!Number.isFinite(prospectId) || prospectId <= 0) throw new Error('Lead inválido')
      const resp = await get(`/api/corretor/prospects/${encodeURIComponent(String(prospectId))}`)
      const data = await resp.json().catch(() => null)
      if (!resp.ok || !data?.success) throw new Error(data?.error || 'Erro ao carregar lead')
      const leadData = data.lead || null
      setLead(leadData)

      // Auto-open modal if param is present
      const urlParams = new URLSearchParams(window.location.search)
      const openNegocioId = urlParams.get('openNegocioId')
      if (openNegocioId) {
        openNegocioFechadoForLeadById(openNegocioId)
      }
    } catch (e: any) {
      setError(e?.message || 'Erro ao carregar lead')
      setLead(null)
    } finally {
      setLoading(false)
    }
  }, [get, prospectId])

  useEffect(() => {
    try {
      const stored = localStorage.getItem('admin-user-data')
      if (stored) {
        const parsed = JSON.parse(stored)
        setTipoCorretor(parsed.tipo_corretor || null)
      }
    } catch { }
    load()
  }, [load])

  const requiresAceite = useMemo(() => {
    if (!lead) return false
    const req = (lead.requires_aceite ?? (lead.expira_em ? true : false)) === true
    return lead.status === 'atribuido' && req
  }, [lead])

  // Efeito para focar o input ao abrir o modal de Negócio Fechado
  useEffect(() => {
    if (isNegocioFechadoOpen) {
      setTimeout(() => {
        inputBuscaRef.current?.focus()
      }, 300)
    }
  }, [isNegocioFechadoOpen])

  const acceptLead = useCallback(async () => {
    if (!lead) return
    try {
      setAccepting(true)
      const resp = await post(`/api/corretor/prospects/${lead.prospect_id}/accept`, {})
      const data = await resp.json().catch(() => null)
      if (!resp.ok || !data?.success) throw new Error(data?.error || 'Não foi possível aceitar o lead')
      await load()
    } catch (e: any) {
      setError(e?.message || 'Erro ao aceitar lead')
    } finally {
      setAccepting(false)
    }
  }, [lead, post, load])

  const handleBuscarImovelStatus = async (specificCodigo?: string, specificId?: string) => {
    const codigo = specificCodigo || codigoBusca
    const id = specificId

    if (!codigo.trim() && !id) return
    setIsSearching(true)
    setNegocioError(null)
    setImovelEncontrado(null)
    setInitialStatus(null)
    try {
      let url = ''
      if (id) {
        url = `/api/admin/imoveis/by-id/${id}`
      } else if (/^\d+$/.test(codigo)) {
        url = `/api/admin/imoveis/by-id/${codigo}`
      } else {
        url = `/api/admin/imoveis/by-codigo/${codigo}`
      }

      const resp = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin-auth-token') || localStorage.getItem('auth-token')}`
        }
      })
      const data = await resp.json()
      if (resp.ok && data.success) {
        const imovel = data.imovel

        // Validação: corretor logado
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
          setNegocioError('Este imóvel não está associado a você')
          return
        }

        setImovelEncontrado(imovel)
        setNegocioFechadoChecked(imovel.status_fk === 100)
        setInitialStatus(imovel.status_fk)
      } else {
        setNegocioError('Imóvel não encontrado ou não associado a você')
      }
    } catch (err) {
      setNegocioError('Erro ao buscar imóvel.')
    } finally {
      setIsSearching(false)
    }
  }

  const openNegocioFechadoForLead = (id: string | number) => {
    const sId = String(id)
    setNegocioError(null)
    setImovelEncontrado(null)
    setCodigoBusca(sId)
    setIsNegocioFechadoOpen(true)
    setTimeout(() => {
      handleBuscarImovelStatus(undefined, sId)
    }, 100)
  }

  const openNegocioFechadoForLeadById = (id: string) => {
    setNegocioError(null)
    setImovelEncontrado(null)
    setCodigoBusca(id)
    setIsNegocioFechadoOpen(true)
    setTimeout(() => {
      handleBuscarImovelStatus(undefined, id)
    }, 100)
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

        // Disparar toast de sucesso se possível
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <div className="text-slate-600 font-bold">Carregando...</div>
      </div>
    )
  }

  if (!lead) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex flex-col items-center justify-center gap-4">
        <div className="text-slate-900 font-black text-xl">Lead não encontrado</div>
        <button
          onClick={() => window.location.href = '/corretor/leads'}
          className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold"
        >
          Voltar para Leads
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-end gap-3 mb-6">
          <button
            onClick={() => openNegocioFechadoForLead(lead.imovel_id || '')}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-white font-black hover:bg-indigo-700 shadow-sm transition-all"
          >
            <BadgeCheck className="w-4 h-4" />
            Negócio Fechado
          </button>
          <button
            onClick={() => {
              try {
                const returnUrl = sessionStorage.getItem('corretor_return_url') || '/landpaging'
                const url = new URL(returnUrl, window.location.origin)
                url.searchParams.set('corretor_home', 'true')
                window.location.href = url.toString()
              } catch {
                window.location.href = '/landpaging?corretor_home=true'
              }
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-4 py-2 text-slate-900 font-black hover:bg-slate-50"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
        </div>

        {error && <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 text-sm">{error}</div>}

        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-white to-slate-50">
            <div className="text-xs font-black text-slate-500 uppercase tracking-widest space-y-0.5">
              <div>Data do interesse: <span className="text-slate-900">{formatDateTime(lead.data_interesse || lead.atribuido_em)}</span></div>
              <div>Negócio: <span className="text-slate-900">{lead.codigo || '-'}</span></div>
              <div>Código do Imóvel: <span className="text-slate-900">{lead.imovel_id || '-'}</span></div>
              <div className="mt-2 text-sm text-slate-600">
                <strong>Status:</strong>{' '}
                <span className="text-slate-700 font-bold">
                  {lead.status || '-'}
                  {lead.status === 'expirado' && (() => {
                    const type = String(tipoCorretor || '').toLowerCase()
                    const mins = type === 'interno' ? slaMinutosInterno : slaMinutos
                    return mins ? ` SLA ${mins} min` : ''
                  })()}
                </span>
              </div>
              <div className="text-slate-900 text-sm mt-2">{formatMoney(lead.preco)}</div>
            </div>
            <div className="mt-3 text-2xl font-black text-slate-900">{lead.titulo || 'Lead'}</div>

            {/* Características rápidas do imóvel */}
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-y-3 gap-x-4 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2 text-sm">
                <Bed className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-slate-600"><strong>Quartos:</strong> <span className="font-black text-slate-900">{toStr(lead.quartos)}</span></span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Bed className="w-4 h-4 text-purple-400 shrink-0" />
                <span className="text-slate-600"><strong>Suítes:</strong> <span className="font-black text-slate-900">{toStr(lead.suites)}</span></span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Bath className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-slate-600"><strong>Banheiros:</strong> <span className="font-black text-slate-900">{toStr(lead.banheiros)}</span></span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Car className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-slate-600"><strong>Garagem:</strong> <span className="font-black text-slate-900">{toStr(lead.vagas_garagem)}</span></span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Layers className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-slate-600"><strong>Andar:</strong> <span className="font-black text-slate-900">{toStr(lead.andar)}</span></span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-slate-600"><strong>Total Andares:</strong> <span className="font-black text-slate-900">{toStr(lead.total_andares)}</span></span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="text-slate-600"><strong>IPTU:</strong> <span className="font-black text-slate-900">{formatMoney(lead.preco_iptu)}</span></span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="w-4 h-4 text-blue-500 shrink-0" />
                <span className="text-slate-600"><strong>Taxas:</strong> <span className="font-black text-slate-900">{formatMoney(lead.taxa_extra)}</span></span>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 py-4 px-6 border-t border-slate-100 bg-slate-50/20">
              <div className="flex items-center gap-2 text-sm">
                <CreditCard className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-slate-600"><strong>Financiamento:</strong> <span className="font-black text-slate-900">{yn(lead.aceita_financiamento)}</span></span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <ArrowLeftRight className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-slate-600"><strong>Permuta:</strong> <span className="font-black text-slate-900">{yn(lead.aceita_permuta)}</span></span>
              </div>
            </div>

            {requiresAceite && (
              <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="text-amber-900 font-black flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Aceite necessário (SLA)
                </div>
                <button
                  onClick={acceptLead}
                  disabled={accepting}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-white text-sm font-black hover:bg-blue-700 disabled:opacity-60"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {accepting ? 'Aceitando...' : 'Aceitar lead'}
                </button>
              </div>
            )}
          </div>

          <div className="p-6 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="text-xs font-black text-slate-500 uppercase tracking-widest">Cliente (Tenho interesse)</div>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm text-slate-800">
                <div><strong>Nome:</strong> {toStr(lead.cliente_nome)}</div>
                <div><strong>Telefone:</strong> {toStr(lead.cliente_telefone)}</div>
                <div className="sm:col-span-2"><strong>E-mail:</strong> {toStr(lead.cliente_email)}</div>
                <div><strong>Preferência:</strong> {toStr(lead.preferencia_contato)}</div>
                <div><strong>Mensagem:</strong> {lead.mensagem ? String(lead.mensagem) : 'Sem mensagem'}</div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="text-xs font-black text-slate-500 uppercase tracking-widest">Imóvel</div>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm text-slate-800">
                <div><strong>Finalidade:</strong> {toStr(lead.finalidade_nome)}</div>
                <div><strong>Tipo:</strong> {toStr(lead.tipo_nome)}</div>
                <div><strong>Status:</strong> {toStr(lead.status_nome)}</div>
                <div><strong>Condomínio:</strong> {formatMoney(lead.preco_condominio ?? null)}</div>
                <div><strong>IPTU:</strong> {formatMoney(lead.preco_iptu ?? null)}</div>
                <div><strong>Taxa extra:</strong> {formatMoney(lead.taxa_extra ?? null)}</div>
                <div><strong>Área total:</strong> {lead.area_total !== null && lead.area_total !== undefined ? `${lead.area_total} m²` : '-'}</div>
                <div><strong>Área construída:</strong> {lead.area_construida !== null && lead.area_construida !== undefined ? `${lead.area_construida} m²` : '-'}</div>
                <div><strong>Quartos:</strong> {toStr(lead.quartos)}</div>
                <div><strong>Banheiros:</strong> {toStr(lead.banheiros)}</div>
                <div><strong>Suítes:</strong> {toStr(lead.suites)}</div>
                <div><strong>Vagas:</strong> {toStr(lead.vagas_garagem)}</div>
                <div><strong>Varanda:</strong> {toStr(lead.varanda)}</div>
                <div><strong>Andar:</strong> {toStr(lead.andar)}</div>
                <div><strong>Total de andares:</strong> {toStr(lead.total_andares)}</div>
                <div><strong>Aceita permuta:</strong> {yn(lead.aceita_permuta)}</div>
                <div><strong>Aceita financiamento:</strong> {yn(lead.aceita_financiamento)}</div>
                <div className="sm:col-span-2">
                  <strong>Endereço:</strong>{' '}
                  {joinParts([
                    lead.endereco,
                    lead.numero && `nº ${lead.numero}`,
                    lead.complemento,
                    lead.bairro,
                    lead.cidade_fk,
                    lead.estado_fk,
                    lead.cep && `CEP: ${lead.cep}`
                  ]) || '-'}
                </div>
                {lead.descricao && (
                  <div className="sm:col-span-2">
                    <strong>Descrição:</strong> {String(lead.descricao)}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="text-xs font-black text-slate-500 uppercase tracking-widest">Proprietário</div>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm text-slate-800">
                <div><strong>Nome:</strong> {toStr(lead.proprietario_nome)}</div>
                <div><strong>CPF:</strong> {toStr(lead.proprietario_cpf)}</div>
                <div><strong>Telefone:</strong> {toStr(lead.proprietario_telefone)}</div>
                <div><strong>E-mail:</strong> {toStr(lead.proprietario_email)}</div>
                <div className="sm:col-span-2">
                  <strong>Endereço:</strong>{' '}
                  {joinParts([
                    lead.proprietario_endereco,
                    lead.proprietario_numero && `nº ${lead.proprietario_numero}`,
                    lead.proprietario_complemento,
                    lead.proprietario_bairro,
                    lead.proprietario_cidade,
                    lead.proprietario_estado,
                    lead.proprietario_cep && `CEP: ${lead.proprietario_cep}`
                  ]) || '-'}
                </div>
              </div>
            </div>
          </div>
        </div>
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
                      CÓDIGO DO IMÓVEL (ID)
                    </label>
                    <div className="flex gap-2">
                      <input
                        ref={inputBuscaRef}
                        type="text"
                        value={codigoBusca}
                        onChange={(e) => setCodigoBusca(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === 'Enter' && handleBuscarImovelStatus()}
                        placeholder="Ex: 45"
                        className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                      />
                      <button
                        onClick={() => handleBuscarImovelStatus()}
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
