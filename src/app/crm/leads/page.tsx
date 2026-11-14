'use client'

import React, { useState, useEffect } from 'react'
import {
  UsersIcon, UserIcon, MagnifyingGlassIcon, EnvelopeIcon, PhoneIcon,
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
import TemaMultiSelect from '@/components/crm/TemaMultiSelect'
import LeadFichaModal, { formatPhone } from '@/components/crm/LeadFichaModal'
import { useLeadFicha } from '@/components/crm/useLeadFicha'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'

interface LeadStaging {
  lead_uuid: string; nome: string; email: string; telefone: string;
  status: string; tag_sonho: string; resumo_ia: string;
  /** Texto literal digitado/enviado pelo lead na captação — nunca reescrito pela IA (resumo_ia
   *  é a versão dela). null pra leads anteriores a esta coluna, ou sem nenhuma mensagem livre. */
  mensagem_original?: string | null;
  /** Tema do ciclo de vendas (null = sem tema). */
  tema_id?: number | null;
  tema_nome?: string | null;
  score_prontidao: number | null;
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
  contato_avatar_url?: string | null;
  client_id?: string | null;
  valor_venda?: number | null;
  valor_venda_estimado?: number | null;
  /** Como o Match Engine (F4) resolveu este registro — 'email'/'telefone' = mesclado com um
   *  lead já existente; 'novo' = nenhuma correspondência encontrada; 'manual' = cadastrado
   *  direto pelo "+ Novo Lead". null/undefined = lead anterior à existência desta coluna. */
  match_method?: string | null;
}

interface Coluna { id: number; nome: string; titulo_exibicao: string; is_ganho?: boolean; is_perda?: boolean }

/** Rótulo + explicação de cada valor real de `match_method` (docs/CHECKPOINT.md, 2026-07-21 —
 *  "F4: Match Engine real"). Único lugar de tradução — se um método novo for adicionado no
 *  backend, cai no fallback abaixo em vez de quebrar. */
const MATCH_METHOD_INFO: Record<string, { label: string; desc: string }> = {
  email: {
    label: 'E-mail',
    desc: 'O sistema identificou este lead pelo e-mail. Já existia um cadastro com o mesmo e-mail, então as informações novas foram somadas a ele, em vez de criar um card repetido.',
  },
  telefone: {
    label: 'Telefone',
    desc: 'O sistema identificou este lead pelo telefone. Já existia um cadastro com o mesmo número (parênteses, traços e o +55 são ignorados na comparação), então as informações novas foram somadas a ele, em vez de criar um card repetido.',
  },
  manual: {
    label: 'Cadastro Manual',
    desc: 'Este lead foi cadastrado manualmente pelo botão "+ Novo Lead". Nesse caso o sistema não procura duplicatas: cada cadastro manual gera um card novo.',
  },
  novo: {
    label: 'Lead Novo',
    desc: 'Nenhum cadastro existente tinha o mesmo e-mail ou telefone. Por isso o sistema criou um card novo para esta pessoa.',
  },
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
  // Filtro de período (De/Até) — mesmo seletor 7/30/90/Personalizado/Histórico já usado em
  // /crm (docs/CHECKPOINT.md, 2026-08-16), pedido pra funcionar igual aqui.
  const [timeframe, setTimeframe] = useState('30')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  // Filtro de Etapa — real, ligado às colunas reais do Kanban do tenant (substitui o antigo
  // dropdown "Todos os Status/Novos/Duplicados", que nunca teve value/onChange nenhum).
  const [colunas, setColunas] = useState<Coluna[]>([])
  const [filterColunaId, setFilterColunaId] = useState<number | ''>('')
  // Filtro por Tema do ciclo de vendas — 'todos' = sem filtro (default).
  const [temas, setTemas] = useState<{ id: number; nome: string }[]>([])
  // Temas DESMARCADOS no filtro (vazio = todos marcados = sem filtro).
  const [temaExcluidos, setTemaExcluidos] = useState<string[]>([])
  // Ficha do lead — mesmo hook/componente usados pelo Kanban (fonte única, sem cópia).
  const ficha = useLeadFicha<LeadStaging>({
    colunas,
    onPatchLead: (uuid, patch) => setLeads(prev => prev.map(l => l.lead_uuid === uuid ? { ...l, ...patch } : l)),
    onReload: () => { fetchLeads() },
  })

  useEffect(() => {
    fetch('/api/crm/temas', { credentials: 'include' })
      .then(r => r.json())
      .then(d => { if (d.success) setTemas(d.temas || []) })
      .catch(() => setTemas([]))
  }, [])
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
  // Ícone de impressão digital na coluna Ação — antes um botão morto (sem onClick, sem
  // tooltip, herdado do scaffold original desta tela). Agora abre/fecha um painel inline
  // explicando como o Match Engine (F4) resolveu aquele registro (match_method).
  const [openMatchInfo, setOpenMatchInfo] = useState<Set<string>>(new Set())
  const toggleMatchInfo = (leadUuid: string) => {
    setOpenMatchInfo(prev => {
      const next = new Set(prev)
      if (next.has(leadUuid)) next.delete(leadUuid)
      else next.add(leadUuid)
      return next
    })
  }

  useEffect(() => { fetchLeads() }, [timeframe])
  useEffect(() => { fetchColunas() }, [tenantId])

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

  const filteredLeads = leads.filter(l => {
    const searchDigits = search.replace(/\D/g, '')
    const matchesSearch = !search ||
      l.nome?.toLowerCase().includes(search.toLowerCase()) ||
      l.email?.toLowerCase().includes(search.toLowerCase()) ||
      l.tag_sonho?.toLowerCase().includes(search.toLowerCase()) ||
      l.mensagem_original?.toLowerCase().includes(search.toLowerCase()) ||
      (searchDigits.length > 0 && l.telefone?.replace(/\D/g, '').includes(searchDigits))
    const matchesEtapa = filterColunaId === '' || l.coluna_id === filterColunaId
    const matchesTema = temaExcluidos.length === 0 || !temaExcluidos.includes(String(l.tema_id ?? ''))
    return matchesSearch && matchesEtapa && matchesTema
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
          {/* "Importar CSV/Planilha" removido — era 100% decorativo (sem onClick, sem
              backend), fica registrado como pendência futura em docs/CHECKPOINT.md até ter
              uma implementação real por trás. */}
        </div>
      </div>

      {/* Total de leads conforme os filtros aplicados abaixo */}
      <div className={`text-base font-bold ${t.isDark ? 'text-amber-300/90' : 'text-amber-700'}`}>
        Total de leads: <span className="font-black text-lg">{filteredLeads.length}</span>
      </div>

      {/* Filters */}
      <div className={`relative z-30 flex flex-col md:flex-row gap-4 ${t.cardBg} p-4 rounded-2xl`}>
        <div className="relative flex-1">
          <MagnifyingGlassIcon className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${t.textMuted}`} />
          <input type="text" placeholder="Filtrar por nome, telefone, email, tag de sonho ou mensagem original..."
            value={search} onChange={e => setSearch(e.target.value)}
            className={`w-full rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-blue-500/50 transition-all font-medium ${t.inputBg}`} />
        </div>
        {/* Filtro de Etapa real — antes era um <select> decorativo ("Todos os Status/Novos/
            Duplicados"), sem value/onChange, sem correspondência nenhuma com o schema real.
            Opções vêm das colunas reais do Kanban do tenant, na mesma ordem do board. */}
        <TemaMultiSelect temas={temas} excluded={temaExcluidos} onChange={setTemaExcluidos} isDark={t.isDark} />
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
        {(search || filterColunaId !== '' || temaExcluidos.length > 0 || timeframe !== '30') && (
          <button
            type="button"
            onClick={() => {
              setSearch('')
              setFilterColunaId('')
              setTemaExcluidos([])
              setTimeframe('30')
              setStartDate('')
              setEndDate('')
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide ${t.isDark ? 'text-amber-300 hover:bg-white/5' : 'text-amber-700 hover:bg-slate-100'}`}
          >
            Limpar filtros
          </button>
        )}
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
                // Intenção/Aderência/Responsável/Origem-Data (4-7) usam padding mais estreito
                // (px-3) — conteúdo curto (%, avatar, data), o px-6 padrão deixava espaço em
                // branco desperdiçado entre essas colunas numa tela larga.
                <th key={h} className={`${i >= 4 && i <= 7 ? 'px-3' : 'px-6'} py-4 text-left text-xs font-bold uppercase tracking-widest ${i === 1 ? 'text-emerald-500' : t.textMuted} ${i >= 3 && i <= 6 ? 'text-center' : ''} ${i === 8 ? 'text-right' : ''}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className={`divide-y ${t.borderSub}`}>
            {loading ? (
              <tr><td colSpan={9} className="py-20 text-center text-blue-500 animate-pulse font-bold italic">Sincronizando Leads...</td></tr>
            ) : filteredLeads.length > 0 ? filteredLeads.map(lead => (
              <React.Fragment key={lead.lead_uuid}>
              <tr className={`group transition-all ${t.hoverBg}`}>
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    {/* Ícone tradicional de "usuário" (rosto) — laranja claro, deliberadamente
                        diferente do azul (já o acento dominante no resto da tela: filtros,
                        badge de telefone, "Abrir Ficha") porque o cliente é a informação mais
                        importante da linha e precisa se destacar visualmente das demais. */}
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 border overflow-hidden ${t.isDark ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' : 'bg-orange-50 border-orange-200 text-orange-500'}`}>
                      {lead.contato_avatar_url ? (
                        <img src={lead.contato_avatar_url} alt={lead.nome || 'Contato'} className="h-full w-full object-cover" />
                      ) : (
                        <UserIcon className="h-5 w-5" />
                      )}
                    </div>
                    <div className="ml-4">
                      <div className={`text-sm font-bold leading-tight ${t.textPrimary}`}>{lead.nome || 'Não Identificado'}</div>
                      <div className={`flex items-center text-[10px] mt-1 space-x-2 ${t.textMuted}`}>
                        <span className="flex items-center whitespace-nowrap shrink-0 font-bold text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                          <PhoneIcon className="h-3 w-3 mr-1 shrink-0" />{formatPhone(lead.telefone)}
                        </span>
                        <span className="flex items-center"><EnvelopeIcon className="h-3 w-3 mr-1" />{lead.email || 'S/ Email'}</span>
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {/* Valor Fechado (REAL) — só aparece depois que o lead passou pela etapa de
                      Ganho e o valor foi informado (kanban/page.tsx, modal "Negócio Fechado").
                      Mesma cor/formato já usado no card do Kanban (bg-emerald-500/10), pra que
                      o resumo desta lista dê a mesma informação sem precisar abrir a ficha. */}
                  {lead.valor_venda != null && (
                    <span className="inline-flex items-center mb-1.5 px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      <span className="font-bold opacity-70 mr-1">Valor Fechado:</span>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lead.valor_venda)}
                    </span>
                  )}
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
                      Original do Lead"). `max-w-sm` (mesmo valor já usado pelo `EnrichedLeadData`
                      logo acima, nesta mesma coluna) — a coluna já é alargada até esse tamanho
                      por causa dele; usar o mesmo teto aqui aproveita o espaço que já existe em
                      vez de truncar cedo demais deixando espaço em branco à direita. */}
                  {lead.mensagem_original && (() => {
                    const isExpanded = expandedMessages.has(lead.lead_uuid)
                    return (
                      <button
                        type="button"
                        onClick={() => toggleMessageExpand(lead.lead_uuid)}
                        title={isExpanded ? 'Recolher mensagem' : lead.mensagem_original}
                        className={`mt-1.5 flex items-start gap-1 text-[10px] italic text-left transition-colors max-w-sm ${t.textMuted} ${t.isDark ? 'hover:text-white' : 'hover:text-gray-700'}`}
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
                <td className="px-3 py-4 text-center">
                  <span className={`text-xs font-bold ${lead.score_prontidao == null ? t.textMuted : lead.score_prontidao > 80 ? 'text-green-500' : lead.score_prontidao > 50 ? 'text-blue-500' : t.textMuted}`}>
                    {lead.score_prontidao != null ? `${lead.score_prontidao}%` : 'Não avaliado'}
                  </span>
                </td>
                <td className="px-3 py-4 text-center">
                  <span className={`text-xs font-bold ${lead.score_fit == null ? t.textMuted : lead.score_fit > 80 ? 'text-green-500' : lead.score_fit > 50 ? 'text-blue-500' : t.textMuted}`}>
                    {lead.score_fit != null ? `${lead.score_fit}%` : '—'}
                  </span>
                </td>
                <td className="px-3 py-4">
                  <div className="flex justify-center">
                    <OwnerAvatar lead={lead} isDark={t.isDark} />
                  </div>
                </td>
                <td className="px-3 py-4">
                  <div className={`text-[11px] whitespace-nowrap ${t.textSecondary}`}>{new Date(lead.created_at).toLocaleDateString('pt-BR')} às {new Date(lead.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                  <div className="text-[9px] whitespace-nowrap text-blue-500/50 uppercase font-black tracking-wide">{lead.imovel_id ? 'API LANDPAGING' : 'CAMPANHA GENÉRICA'}</div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end space-x-2">
                    {/* Antes um botão morto (sem onClick/tooltip, resíduo do scaffold
                        original desta tela) — agora abre um painel explicando como o Match
                        Engine (F4) resolveu este registro (match_method). */}
                    <button
                      type="button"
                      onClick={() => toggleMatchInfo(lead.lead_uuid)}
                      title="Como este lead foi identificado (Match Engine)"
                      className={`p-2 rounded-lg transition-all ${openMatchInfo.has(lead.lead_uuid) ? 'bg-blue-600 text-white' : `${t.textMuted} ${t.hoverBg} ${t.cardBg}`}`}
                    >
                      <FingerPrintIcon className="h-4 w-4" />
                    </button>
                    <button onClick={() => ficha.openLead(lead)}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black rounded-lg uppercase tracking-widest transition-all">
                      Abrir Ficha
                    </button>
                  </div>
                </td>
              </tr>
              {openMatchInfo.has(lead.lead_uuid) && (() => {
                const info = (lead.match_method && MATCH_METHOD_INFO[lead.match_method]) || null
                return (
                  <tr className={t.isDark ? 'bg-blue-500/5' : 'bg-blue-50/60'}>
                    <td colSpan={9} className="px-6 py-3">
                      <div className="flex items-start gap-2">
                        <FingerPrintIcon className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                        <div>
                          <p className={`text-[10px] font-bold uppercase tracking-widest ${t.isDark ? 'text-blue-400' : 'text-blue-700'}`}>
                            Match Engine — {info ? info.label : 'Não registrado'}
                          </p>
                          <p className={`text-xs mt-0.5 ${t.textSecondary}`}>
                            {info ? info.desc : 'Este lead foi criado antes de o Match Engine passar a registrar como cada registro foi identificado — sem esse dado para exibir aqui.'}
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )
              })()}
              </React.Fragment>
            )) : (
              <tr><td colSpan={9} className={`py-20 text-center italic ${t.textMuted}`}>Nenhum lead encontrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <LeadFichaModal<LeadStaging> ficha={ficha} />
    </div>
  )
}
