'use client'

import React, { useState, useEffect } from 'react'
import {
  UsersIcon, MagnifyingGlassIcon, EnvelopeIcon, PhoneIcon,
  FingerPrintIcon, ArrowPathIcon, XMarkIcon, SparklesIcon,
  CheckBadgeIcon, ChatBubbleBottomCenterTextIcon, ChatBubbleLeftRightIcon, MapPinIcon,
  ArrowTrendingUpIcon, CalendarDaysIcon, ChevronDownIcon, ChevronUpIcon
} from '@heroicons/react/24/outline'
import EnrichedLeadData from '@/components/crm/EnrichedLeadData'
import AgendamentosLead from '@/components/crm/AgendamentosLead'
import AtividadesLead from '@/components/crm/AtividadesLead'
import NextBestActionCard from '@/components/crm/NextBestActionCard'
import AgendarVisitaModal from '@/components/crm/AgendarVisitaModal'
import DateInputPtBR from '@/components/ui/DateInputPtBR'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'

interface LeadStaging {
  lead_uuid: string; nome: string; email: string; telefone: string;
  status: string; tag_sonho: string; resumo_ia: string;
  /** Texto literal digitado/enviado pelo lead na captação — nunca reescrito pela IA (resumo_ia
   *  é a versão dela). null pra leads anteriores a esta coluna, ou sem nenhuma mensagem livre. */
  mensagem_original?: string | null;
  score_prontidao: number;
  /** Encaixe no perfil ideal de cliente — dimensão separada de score_prontidao
   *  (intenção). null = ainda não avaliado (sem critério de fit cadastrado pro
   *  segmento/tenant), nunca um número inventado. */
  score_fit?: number | null;
  imovel_id: number | null;
  enriquecimento_cache?: any; created_at: string;
  /** Etapa real do Kanban — `coluna_nome` é o slug interno (ex. "lead_captado"),
   *  `coluna_titulo` é o rótulo amigável (ex. "Lead Captado") que a Master/tenant
   *  configura em /crm/config/kanban. Exibir sempre `coluna_titulo`. */
  coluna_id?: number | null;
  coluna_nome: string;
  coluna_titulo?: string | null;
  corretor_atribuido_id?: string | null;
  corretor_nome?: string | null;
  corretor_tem_foto?: boolean;
  client_id?: string | null;
  valor_venda?: number | null;
  valor_venda_estimado?: number | null;
}

interface Coluna { id: number; nome: string; titulo_exibicao: string }

const formatPhone = (phone: string) => {
  if (!phone) return 'S/ Telefone'
  const c = phone.replace(/\D/g, '')
  if (c.length === 11) return `(${c.slice(0,2)}) ${c.slice(2,7)}-${c.slice(7)}`
  if (c.length === 10) return `(${c.slice(0,2)}) ${c.slice(2,6)}-${c.slice(6)}`
  return phone
}

const getInitials = (name: string) => {
  if (!name) return 'LD'
  const parts = name.trim().split(' ')
  return parts.length > 1 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : name.substring(0, 2).toUpperCase()
}

/** Avatar do dono do lead — mesmo padrão (foto → iniciais → ícone genérico) já usado no
 *  card do Kanban (/crm/kanban); reaproveitado aqui pra manter a mesma linguagem visual. */
function OwnerAvatar({ lead, isDark }: { lead: LeadStaging; isDark: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1" title={lead.corretor_nome ? `Responsável: ${lead.corretor_nome}` : 'Sem responsável atribuído'}>
      <div className={`h-9 w-9 rounded-lg overflow-hidden flex items-center justify-center shrink-0 ${isDark ? 'bg-white/5' : 'bg-slate-50 border border-slate-100'}`}>
        {lead.corretor_atribuido_id && lead.corretor_tem_foto ? (
          <img src={`/api/admin/usuarios/${lead.corretor_atribuido_id}/foto`} alt={lead.corretor_nome || 'Responsável'} className="h-9 w-9 object-cover" />
        ) : lead.corretor_nome ? (
          <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center text-[10px] font-black text-white">
            {getInitials(lead.corretor_nome)}
          </div>
        ) : (
          <UsersIcon className={`h-5 w-5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
        )}
      </div>
      {lead.corretor_nome && (
        <span className={`text-[9px] font-bold leading-none text-center max-w-[52px] truncate ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
          {lead.corretor_nome.split(' ')[0]}
        </span>
      )}
    </div>
  )
}

export default function LeadsStagingPage() {
  const t = useTheme()
  const { user } = useAuth()
  const tenantId = user?.currentTenant?.id
  const [leads, setLeads] = useState<LeadStaging[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedLead, setSelectedLead] = useState<LeadStaging | null>(null)
  // Filtro de período (De/Até) — mesmo seletor 7/30/90/Personalizado/Histórico já usado em
  // /crm (docs/CHECKPOINT.md, 2026-08-16), pedido pra funcionar igual aqui.
  const [timeframe, setTimeframe] = useState('30')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  // Filtro de Etapa — real, ligado às colunas reais do Kanban do tenant (substitui o antigo
  // dropdown "Todos os Status/Novos/Duplicados", que nunca teve value/onChange nenhum).
  const [colunas, setColunas] = useState<Coluna[]>([])
  const [filterColunaId, setFilterColunaId] = useState<number | ''>('')
  // Config do tenant (calendário pessoal/empresa) — necessária pro botão "Agendar Visita" e
  // pro "+ Nova visita" dentro de AgendamentosLead, mesmo padrão já usado em /crm/kanban.
  const [tenantConfig, setTenantConfig] = useState<any>(null)
  const [isAgendarOpen, setIsAgendarOpen] = useState(false)
  const [agendamentosVersion, setAgendamentosVersion] = useState(0)
  // "Registrar como Atividade" no card "Sugestão da IA" pré-preenche o form de Nova
  // Atividade — mesmo mecanismo de /crm/kanban (nonce garante reabrir o form mesmo se o
  // atendente clicar 2x seguidas na mesma sugestão).
  const [activityPrefill, setActivityPrefill] = useState<{ text: string; nonce: number } | undefined>(undefined)
  const handleUseSuggestionAsActivity = (text: string) => setActivityPrefill({ text, nonce: Date.now() })
  // Expandir/recolher o snippet de mensagem original na listagem — lista densa (muitos leads
  // por tela) nunca mostra a mensagem inteira por padrão, mas o hover no `title` nativo é
  // pouco descobrível e não funciona em touch; este toggle dá uma forma explícita e clicável
  // de ver a íntegra sem precisar abrir a ficha inteira.
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set())
  const toggleMessageExpand = (leadUuid: string) => {
    setExpandedMessages(prev => {
      const next = new Set(prev)
      if (next.has(leadUuid)) next.delete(leadUuid)
      else next.add(leadUuid)
      return next
    })
  }

  useEffect(() => { fetchLeads() }, [timeframe])
  useEffect(() => { fetchColunas(); fetchTenantConfig() }, [tenantId])

  const fetchLeads = async () => {
    setLoading(true)
    try {
      const qs = `timeframe=${timeframe}${timeframe === 'custom' ? `&startDate=${startDate}&endDate=${endDate}` : ''}`
      const res = await fetch(`/api/crm/leads?${qs}`)
      const data = await res.json()
      if (data.success) setLeads(data.leads)
    } finally { setLoading(false) }
  }

  const fetchColunas = async () => {
    try {
      const res = await fetch('/api/crm/kanban/colunas')
      const data = await res.json()
      if (data.success) setColunas(data.colunas || [])
    } catch { /* silent — filtro de Etapa só não aparece populado */ }
  }

  const fetchTenantConfig = async () => {
    try {
      const token = localStorage.getItem('admin-auth-token')
      const res = await fetch(`/api/crm/config/tenant?tenantId=${tenantId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      const data = await res.json()
      if (data.success) setTenantConfig(data.config)
    } catch { /* silent — botão "Agendar Visita" só não aparece */ }
  }

  const filteredLeads = leads.filter(l => {
    const searchDigits = search.replace(/\D/g, '')
    const matchesSearch = !search ||
      l.nome?.toLowerCase().includes(search.toLowerCase()) ||
      l.email?.toLowerCase().includes(search.toLowerCase()) ||
      l.tag_sonho?.toLowerCase().includes(search.toLowerCase()) ||
      l.mensagem_original?.toLowerCase().includes(search.toLowerCase()) ||
      (searchDigits.length > 0 && l.telefone?.replace(/\D/g, '').includes(searchDigits))
    const matchesEtapa = filterColunaId === '' || l.coluna_id === filterColunaId
    return matchesSearch && matchesEtapa
  })

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className={`text-2xl font-bold tracking-tight italic flex items-center ${t.textPrimary}`}>
            <span className="text-blue-500">LEADS</span>
          </h2>
          <p className={`mt-1 text-sm ${t.textSecondary}`}>Gerenciamento de Leads</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Filtro de período — mesmo seletor 7/30/90/Personalizado/Histórico de /crm */}
          <div className={`flex ${t.selectorBg} rounded-xl p-1`}>
            {['7', '30', '90', 'custom', 'all'].map(tf => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1 text-[10px] font-black uppercase rounded-lg transition-all ${timeframe === tf ? 'bg-blue-600 text-white shadow-lg' : t.selectorBtn}`}
              >
                {tf === 'all' ? 'Histórico' : tf === 'custom' ? 'Personalizado' : `${tf} Dias`}
              </button>
            ))}
          </div>
          {timeframe === 'custom' && (
            <div className={`flex items-center space-x-2 ${t.selectorBg} rounded-xl p-1`}>
              <DateInputPtBR value={startDate} onChange={setStartDate}
                className={`bg-transparent border-0 text-[10px] font-bold outline-none focus:ring-0 px-2 ${t.textPrimary}`} />
              <span className={`text-[10px] ${t.textMuted}`}>até</span>
              <DateInputPtBR value={endDate} onChange={setEndDate}
                className={`bg-transparent border-0 text-[10px] font-bold outline-none focus:ring-0 px-2 ${t.textPrimary}`} />
              <button onClick={fetchLeads} className={`p-1 rounded-lg transition-all ${t.hoverBg}`}>
                <ArrowTrendingUpIcon className="h-4 w-4 text-emerald-400 rotate-90" />
              </button>
            </div>
          )}
          <button onClick={fetchLeads}
            className={`p-2.5 ${t.textMuted} ${t.hoverBg} ${t.cardBg} rounded-xl transition-all`} title="Atualizar">
            <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-lg">
            Importar CSV/Planilha
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className={`flex flex-col md:flex-row gap-4 ${t.cardBg} p-4 rounded-2xl`}>
        <div className="relative flex-1">
          <MagnifyingGlassIcon className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${t.textMuted}`} />
          <input type="text" placeholder="Filtrar por nome, telefone, email, tag de sonho ou mensagem original..."
            value={search} onChange={e => setSearch(e.target.value)}
            className={`w-full rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-blue-500/50 transition-all font-medium ${t.inputBg}`} />
        </div>
        {/* Filtro de Etapa real — antes era um <select> decorativo ("Todos os Status/Novos/
            Duplicados"), sem value/onChange, sem correspondência nenhuma com o schema real.
            Opções vêm das colunas reais do Kanban do tenant, na mesma ordem do board. */}
        <select
          value={filterColunaId}
          onChange={e => setFilterColunaId(e.target.value === '' ? '' : Number(e.target.value))}
          className={`rounded-xl px-4 py-2 text-sm focus:outline-none ${t.inputBg}`}
        >
          <option value="">Todas as Etapas</option>
          {colunas.map(c => (
            <option key={c.id} value={c.id}>{c.titulo_exibicao}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className={`${t.cardBg} rounded-3xl overflow-hidden shadow-sm`}>
        <table className="min-w-full">
          <thead className={`${t.isDark ? 'bg-black/20' : 'bg-gray-50'}`}>
            <tr>
              {/* "Score IPVE" era o nome antigo dessa coluna — resíduo de quando a
                  plataforma era só Imobiliário, mas o valor exibido sempre foi
                  score_prontidao (Intenção), nunca nada específico de IPVE. Renomeado
                  pra bater com o mesmo rótulo já usado na ficha do Kanban. Coluna "Fit"
                  (score_fit) adicionada ao lado — mesma dimensão separada já exibida no
                  drawer, "—" honesto quando o segmento/tenant não tem critério cadastrado.
                  Coluna "Etapa" nova, ao lado de "Tag do Sonho". */}
              {['Identidade', 'Dados Enriquecidos', 'Tag do Sonho', 'Etapa', 'Intenção', 'Aderência', 'Responsável', 'Origem / Data', 'Ação'].map((h, i) => (
                <th key={h} className={`px-6 py-4 text-left text-xs font-bold uppercase tracking-widest ${i === 1 ? 'text-emerald-500' : t.textMuted} ${i >= 3 && i <= 6 ? 'text-center' : ''} ${i === 8 ? 'text-right' : ''}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className={`divide-y ${t.borderSub}`}>
            {loading ? (
              <tr><td colSpan={9} className="py-20 text-center text-blue-500 animate-pulse font-bold italic">Sincronizando Leads...</td></tr>
            ) : filteredLeads.length > 0 ? filteredLeads.map(lead => (
              <tr key={lead.lead_uuid} className={`group transition-all ${t.hoverBg}`}>
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white border transition-all ${lead.imovel_id ? 'bg-gradient-to-tr from-blue-600 to-indigo-600' : 'bg-gradient-to-tr from-emerald-600 to-green-600'}`}>
                      {lead.imovel_id ? <UsersIcon className="h-5 w-5" /> : <MapPinIcon className="h-5 w-5" />}
                    </div>
                    <div className="ml-4">
                      <div className={`text-sm font-bold leading-tight ${t.textPrimary}`}>{lead.nome || 'Não Identificado'}</div>
                      <div className={`flex items-center text-[10px] mt-1 space-x-2 ${t.textMuted}`}>
                        <span className="flex items-center font-bold text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                          <PhoneIcon className="h-3 w-3 mr-1" />{formatPhone(lead.telefone)}
                        </span>
                        <span className="flex items-center"><EnvelopeIcon className="h-3 w-3 mr-1" />{lead.email || 'S/ Email'}</span>
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {lead.enriquecimento_cache ? (
                    <div className="min-w-[240px] max-w-sm"><EnrichedLeadData cache={lead.enriquecimento_cache} /></div>
                  ) : lead.imovel_id ? (
                    <div className="flex items-center text-[10px] text-blue-500 font-bold italic">
                      <SparklesIcon className="h-3 w-3 mr-1 animate-pulse" />Aguardando Processamento...
                    </div>
                  ) : (
                    <div className={`flex items-center text-[10px] font-medium italic ${t.textMuted}`}>
                      <MapPinIcon className="h-3 w-3 mr-1" />Captação Genérica
                    </div>
                  )}
                  {/* Snippet de 1 linha da mensagem original, com botão de expandir — nunca a
                      mensagem inteira por padrão aqui (lista densa, muitos leads por tela).
                      `truncate` corta com reticências no estado recolhido; expandido mostra o
                      texto completo com quebra de linha, sem depender só do hover (`title`,
                      mantido como reforço, mas pouco descobrível e inútil em touch). A íntegra
                      também está sempre disponível na ficha ("Abrir Ficha" → "Mensagem
                      Original do Lead"). */}
                  {lead.mensagem_original && (() => {
                    const isExpanded = expandedMessages.has(lead.lead_uuid)
                    return (
                      <button
                        type="button"
                        onClick={() => toggleMessageExpand(lead.lead_uuid)}
                        title={isExpanded ? 'Recolher mensagem' : lead.mensagem_original}
                        className={`mt-1.5 flex items-start gap-1 text-[10px] italic text-left transition-colors ${t.textMuted} ${t.isDark ? 'hover:text-white' : 'hover:text-gray-700'} ${isExpanded ? 'max-w-sm' : 'max-w-[220px]'}`}
                      >
                        <ChatBubbleLeftRightIcon className="h-3 w-3 mt-px shrink-0" />
                        <span className={isExpanded ? 'whitespace-pre-wrap break-words' : 'truncate'}>
                          "{lead.mensagem_original}"
                        </span>
                        {isExpanded ? (
                          <ChevronUpIcon className="h-3 w-3 mt-px shrink-0" />
                        ) : (
                          <ChevronDownIcon className="h-3 w-3 mt-px shrink-0" />
                        )}
                      </button>
                    )
                  })()}
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold border uppercase ${lead.imovel_id ? 'bg-blue-600/10 text-blue-500 border-blue-500/20' : 'bg-emerald-600/10 text-emerald-500 border-emerald-500/20'}`}>
                    {lead.tag_sonho}
                  </span>
                  {lead.imovel_id ? (
                    <div className={`text-[9px] mt-1 font-bold italic ${t.textMuted}`}>Ref: Imóvel #{lead.imovel_id}</div>
                  ) : (
                    <div className="text-[9px] text-emerald-500/70 mt-1 font-bold italic uppercase flex items-center justify-center">
                      <SparklesIcon className="h-2 w-2 mr-1" />Procura em Região
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${t.isDark ? 'bg-white/5 text-white/70' : 'bg-slate-100 text-slate-600'}`}>
                    {lead.coluna_titulo || 'Sem etapa'}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`text-xs font-bold ${lead.score_prontidao > 80 ? 'text-green-500' : lead.score_prontidao > 50 ? 'text-blue-500' : t.textMuted}`}>
                    {lead.score_prontidao}%
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`text-xs font-bold ${lead.score_fit == null ? t.textMuted : lead.score_fit > 80 ? 'text-green-500' : lead.score_fit > 50 ? 'text-blue-500' : t.textMuted}`}>
                    {lead.score_fit != null ? `${lead.score_fit}%` : '—'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-center">
                    <OwnerAvatar lead={lead} isDark={t.isDark} />
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className={`text-xs ${t.textSecondary}`}>{new Date(lead.created_at).toLocaleDateString('pt-BR')} às {new Date(lead.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                  <div className="text-[10px] text-blue-500/50 uppercase font-black tracking-widest">{lead.imovel_id ? 'API LANDPAGING' : 'CAMPANHA GENÉRICA'}</div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end space-x-2">
                    <button className={`p-2 ${t.textMuted} ${t.hoverBg} ${t.cardBg} rounded-lg transition-all`}>
                      <FingerPrintIcon className="h-4 w-4" />
                    </button>
                    <button onClick={() => setSelectedLead(lead)}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black rounded-lg uppercase tracking-widest transition-all">
                      Abrir Ficha
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={9} className={`py-20 text-center italic ${t.textMuted}`}>Nenhum lead encontrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal — mesmos campos/componentes já usados na ficha do Kanban (Dashboard de
          Interesse, Análise por IA, Sugestão da IA, Histórico de Visitas, Atividades)
          reaproveitados aqui pra paridade real, não uma versão resumida à parte. Fora de
          escopo, deliberadamente: barra de progresso de etapa e botões Avançar/Recuar —
          são navegação de board, não campos do lead; esta tela nunca teve conceito de
          "próxima coluna" pra oferecer. */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className={`${t.modalBg} w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border ${t.borderSub}`}>
            <div className={`relative p-6 border-b ${t.borderSub} bg-gradient-to-br from-blue-600/10 to-indigo-600/5`}>
              <button onClick={() => setSelectedLead(null)}
                className={`absolute right-6 top-1/2 -translate-y-1/2 p-2 ${t.textMuted} ${t.hoverBg} rounded-full transition-all`}>
                <XMarkIcon className="h-6 w-6" />
              </button>
              <div className="flex items-center space-x-5">
                <div className="h-14 w-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                  <UsersIcon className="h-8 w-8" />
                </div>
                <div>
                  <h3 className={`text-xl font-bold italic tracking-tight ${t.textPrimary}`}>{selectedLead.nome}</h3>
                  <div className={`flex items-center text-xs space-x-3 mt-1 ${t.textMuted}`}>
                    <span className="font-medium bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-md">{formatPhone(selectedLead.telefone)}</span>
                    <span className="opacity-30">•</span>
                    <span className="opacity-80">{selectedLead.email}</span>
                    {selectedLead.coluna_titulo && (
                      <>
                        <span className="opacity-30">•</span>
                        <span className={`font-bold px-2 py-0.5 rounded-md ${t.isDark ? 'bg-white/5' : 'bg-slate-100'}`}>{selectedLead.coluna_titulo}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
              {/* Mensagem Original — texto literal digitado/enviado pelo lead, nunca a reescrita
                  da IA (essa vive em "Análise por IA" logo abaixo). Deliberadamente NEUTRO (não
                  azul/âmbar) — essas cores já significam "isto é trabalho da IA" nesta UI, e este
                  bloco é o oposto disso: a palavra exata do lead. Só renderiza quando existe —
                  leads anteriores a esta coluna nunca tiveram esse texto persistido. */}
              {selectedLead.mensagem_original && (
                <div className={`p-5 ${t.cardBg} rounded-3xl border ${t.borderSub}`}>
                  <div className="flex items-center space-x-2 mb-3">
                    <ChatBubbleLeftRightIcon className={`h-4 w-4 ${t.textMuted}`} />
                    <span className={`text-xs font-bold uppercase tracking-widest ${t.textMuted}`}>Mensagem Original do Lead</span>
                  </div>
                  <p className={`text-sm leading-relaxed whitespace-pre-wrap ${t.textPrimary}`}>
                    "{selectedLead.mensagem_original}"
                  </p>
                </div>
              )}

              {/* Grid 2 colunas para dados principais */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {/* Coluna 1: Dados Enriquecidos */}
                {selectedLead.enriquecimento_cache ? (
                  <div className={`p-5 ${t.cardBg} rounded-3xl border-emerald-500/20 border relative h-full`}>
                    <div className="absolute -top-3 left-6 flex items-center space-x-2 bg-emerald-600 text-[9px] font-bold text-white px-3 py-0.5 rounded-full uppercase shadow-lg shadow-emerald-500/20">
                      <CheckBadgeIcon className="h-3 w-3" /><span>Dashboard de Interesse</span>
                    </div>
                    <div className="mt-2"><EnrichedLeadData cache={selectedLead.enriquecimento_cache} /></div>
                  </div>
                ) : (
                  <div className={`p-5 ${t.cardBg} rounded-3xl border-dashed border ${t.borderSub} flex flex-col items-center justify-center text-center min-h-[200px]`}>
                    <SparklesIcon className="h-8 w-8 text-blue-500/20 mb-3" />
                    <p className={`text-xs font-bold ${t.textMuted}`}>Aguardando Enriquecimento de Dados</p>
                  </div>
                )}

                {/* Coluna 2: Análise IA */}
                <div className={`p-5 ${t.cardBg} rounded-3xl border border-blue-500/20 relative h-full flex flex-col`}>
                  <div className="absolute -top-3 left-6 flex items-center space-x-2 bg-blue-600 text-[9px] font-bold text-white px-3 py-0.5 rounded-full uppercase shadow-lg shadow-blue-500/20">
                    <SparklesIcon className="h-3 w-3" /><span>Análise por IA</span>
                  </div>

                  <div className="mt-4 flex-1">
                    <div className={`flex items-center justify-between border-b pb-3 mb-4 ${t.borderSub}`}>
                      <div className="flex items-center space-x-2">
                        <ChatBubbleBottomCenterTextIcon className="h-4 w-4 text-blue-500" />
                        <span className={`text-xs font-bold uppercase tracking-tighter ${t.textPrimary}`}>Perfil Emocional</span>
                      </div>
                      <span className="bg-blue-500/10 text-blue-400 px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase border border-blue-500/20">
                        {selectedLead.tag_sonho}
                      </span>
                    </div>

                    <div className={`text-xs leading-relaxed italic ${t.textMuted} bg-blue-500/5 p-4 rounded-2xl border border-blue-500/10`}>
                      "{selectedLead.resumo_ia || 'A IA ainda não processou uma análise profunda deste lead.'}"
                    </div>

                    {/* Intenção (score_prontidao) e Aderência (score_fit) — 2 dimensões
                        SEPARADAS, nunca combinadas num 3º número sintético (docs/
                        PLANO_AGENTES_ACELERACAO_CRM.md §3.1). Mesma cor de fundo distinta
                        já usada na ficha do Kanban — azul pra Intenção, violeta pra
                        Aderência (mesma cor já usada em todo o resto da plataforma pra
                        esse conceito — SegmentFitCriteriaModal.tsx). */}
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      {[
                        {
                          label: 'Intenção',
                          val: `${selectedLead.score_prontidao}%`,
                          bg: t.isDark ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-200',
                          fg: t.isDark ? 'text-blue-400' : 'text-blue-700',
                        },
                        {
                          label: 'Aderência',
                          val: selectedLead.score_fit != null ? `${selectedLead.score_fit}%` : '—',
                          bg: t.isDark ? 'bg-violet-500/10 border-violet-500/20' : 'bg-violet-50 border-violet-200',
                          fg: t.isDark ? 'text-violet-400' : 'text-violet-700',
                        },
                      ].map(({ label, val, bg, fg }) => (
                        <div key={label} className={`p-3 rounded-xl border ${bg}`}>
                          <p className={`text-[9px] font-bold uppercase tracking-widest mb-1 ${fg}`}>{label}</p>
                          <span className={`text-lg font-bold ${fg}`}>{val}</span>
                        </div>
                      ))}
                    </div>

                    {/* Valor Fechado (REAL, só existe no negócio ganho) e Valor Potencial
                        (ESTIMADO, palpite editável durante o pipeline) — nunca no mesmo
                        tile, nunca a mesma cor (docs/CHECKPOINT.md, 2026-08-13). */}
                    {(selectedLead.valor_venda != null || selectedLead.valor_venda_estimado != null) && (
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        {selectedLead.valor_venda != null && (
                          <div className="p-3 rounded-xl border bg-emerald-500/5 border-emerald-500/20">
                            <p className="text-[9px] font-bold uppercase tracking-widest mb-1 text-emerald-500">Valor Fechado (real)</p>
                            <span className="text-lg font-bold text-emerald-500">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedLead.valor_venda)}</span>
                          </div>
                        )}
                        {selectedLead.valor_venda_estimado != null && (
                          <div className={`p-3 rounded-xl border ${t.isDark ? 'bg-amber-500/5 border-amber-500/20' : 'bg-amber-50 border-amber-200'}`}>
                            <p className={`text-[9px] font-bold uppercase tracking-widest mb-1 ${t.isDark ? 'text-amber-400' : 'text-amber-600'}`}>Valor Potencial (estimado)</p>
                            <span className={`text-lg font-bold ${t.isDark ? 'text-amber-400' : 'text-amber-600'}`}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedLead.valor_venda_estimado)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Sugestão da IA — F3 next_best_action, informativo, nunca bloqueante */}
              <NextBestActionCard
                leadUuid={selectedLead.lead_uuid}
                onUseAsActivity={handleUseSuggestionAsActivity}
              />

              {/* Histórico de Visitas */}
              <div className={`p-5 ${t.cardBg} rounded-3xl border border-indigo-500/10`}>
                <AgendamentosLead
                  leadUuid={selectedLead.lead_uuid}
                  onAgendar={tenantConfig?.calendario ? () => setIsAgendarOpen(true) : undefined}
                  refreshKey={agendamentosVersion}
                />
              </div>

              {/* Atividades do Ciclo de Vendas/Perda */}
              <div className={`p-5 ${t.cardBg} rounded-3xl border border-indigo-500/10`}>
                <AtividadesLead
                  leadUuid={selectedLead.lead_uuid}
                  clientId={selectedLead.client_id}
                  prefill={activityPrefill}
                />
              </div>
            </div>

            <div className={`p-6 border-t ${t.borderSub} ${t.isDark ? 'bg-black/20' : 'bg-gray-50'} flex flex-wrap items-center justify-between gap-3`}>
              <div />
              <div className="flex flex-wrap items-center gap-3">
                <button onClick={() => setSelectedLead(null)} className={`px-6 py-3 text-xs font-bold uppercase tracking-widest ${t.textMuted} hover:text-blue-500 transition-all`}>Fechar</button>
                {tenantConfig?.calendario && (
                  <button
                    onClick={() => setIsAgendarOpen(true)}
                    className="flex items-center px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all uppercase active:scale-95 shadow-lg shadow-indigo-500/20"
                  >
                    <CalendarDaysIcon className="h-4 w-4 mr-2" />
                    Agendar Visita
                  </button>
                )}
                <button className="flex items-center px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all uppercase">
                  <CheckBadgeIcon className="h-4 w-4 mr-2" />Assumir Atendimento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Agendar Visita — mesmo componente/config já usados em /crm/kanban */}
      {isAgendarOpen && selectedLead && tenantConfig && (
        <AgendarVisitaModal
          isOpen={isAgendarOpen}
          onClose={() => setIsAgendarOpen(false)}
          onSuccess={() => { setIsAgendarOpen(false); setAgendamentosVersion(v => v + 1) }}
          lead={selectedLead}
          tenantConfig={tenantConfig}
        />
      )}
    </div>
  )
}
