'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { ArrowLeft, CheckCircle2, Clock, RefreshCcw } from 'lucide-react'

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

export default function CorretorLeadDetalhePage() {
  const params = useParams()
  const { get, post } = useAuthenticatedFetch()
  const prospectId = Number((params as any)?.prospectId || '')

  const [loading, setLoading] = useState(true)
  const [lead, setLead] = useState<LeadRow | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [accepting, setAccepting] = useState(false)

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

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      if (!Number.isFinite(prospectId) || prospectId <= 0) throw new Error('Lead inválido')
      const resp = await get(`/api/corretor/prospects/${encodeURIComponent(String(prospectId))}`)
      const data = await resp.json().catch(() => null)
      if (!resp.ok || !data?.success) throw new Error(data?.error || 'Erro ao carregar lead')
      setLead(data.lead || null)
    } catch (e: any) {
      setError(e?.message || 'Erro ao carregar lead')
      setLead(null)
    } finally {
      setLoading(false)
    }
  }, [get, prospectId])

  useEffect(() => {
    load()
  }, [load])

  const requiresAceite = useMemo(() => {
    if (!lead) return false
    const req = (lead.requires_aceite ?? (lead.expira_em ? true : false)) === true
    return lead.status === 'atribuido' && req
  }, [lead])

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

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between gap-3 mb-6">
          <a
            href="/corretor/leads?status=all"
            className="inline-flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-4 py-2 text-slate-900 font-black hover:bg-slate-50"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </a>
          <button
            onClick={load}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-white font-black hover:bg-slate-800"
          >
            <RefreshCcw className="w-4 h-4" />
            Atualizar
          </button>
        </div>

        {error && <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 text-sm">{error}</div>}

        {loading ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-slate-600">Carregando...</div>
        ) : !lead ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
            <div className="text-slate-900 font-black">Lead não encontrado.</div>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-white to-slate-50">
              <div className="text-xs font-black text-slate-500 uppercase tracking-widest">
                Código {lead.codigo || '-'} • {formatMoney(lead.preco)}
              </div>
              <div className="mt-1 text-2xl font-black text-slate-900">{lead.titulo || 'Lead'}</div>
              <div className="mt-2 text-sm text-slate-600">
                <strong>Data do interesse:</strong> {formatDateTime(lead.data_interesse || lead.atribuido_em)}
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
        )}
      </div>
    </div>
  )
}


