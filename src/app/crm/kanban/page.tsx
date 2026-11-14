'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  ListBulletIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  EllipsisHorizontalIcon,
  UserCircleIcon,
  MapPinIcon,
  ChatBubbleLeftRightIcon,
  CheckBadgeIcon,
  XMarkIcon,
  SparklesIcon,
  ChatBubbleBottomCenterTextIcon,
  UsersIcon,
  ArrowUturnLeftIcon,
  CalendarDaysIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  CalendarIcon,
  PencilSquareIcon,
  TrashIcon,
  ClockIcon,
  BuildingOfficeIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { adminFetch } from '@/lib/auth/adminFetch'
import DateInputPtBR from '@/components/ui/DateInputPtBR'
import EnrichedLeadData from '@/components/crm/EnrichedLeadData'
import NovoLeadModal from '@/components/crm/NovoLeadModal'
import ClientSelector, { useClientSelector, type ClientFilterValue } from '@/components/crm/ClientSelector'
import AgendarVisitaModal from '@/components/crm/AgendarVisitaModal'
import AtividadesLead from '@/components/crm/AtividadesLead'
import LeadTimeline from '@/components/crm/LeadTimeline'
import NextBestActionCard from '@/components/crm/NextBestActionCard'
import TemaMultiSelect from '@/components/crm/TemaMultiSelect'
import LeadFichaModal from '@/components/crm/LeadFichaModal'
import { useLeadFicha } from '@/components/crm/useLeadFicha'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'

interface Lead {
  lead_uuid: string; nome: string; email: string; telefone?: string;
  tag_sonho: string; resumo_ia?: string; coluna_nome: string;
  /** Texto literal digitado/enviado pelo lead na captação — nunca reescrito pela IA (resumo_ia
   *  é a versão dela). null pra leads anteriores a esta coluna, ou sem nenhuma mensagem livre. */
  mensagem_original?: string | null;
  score_prontidao: number | null;
  /** Encaixe no perfil ideal de cliente (docs/PLANO_AGENTES_ACELERACAO_CRM.md §3.1) —
   *  dimensão separada de score_prontidao (intenção). null = ainda não avaliado. */
  score_fit?: number | null;
  imovel_id?: number | null;
  enriquecimento_cache?: any; created_at?: string; match?: string;
  /** Respostas cruas do Perfil de Interesse (NovoLeadModal), chaveadas pelo `name` de cada
   *  campo do form_schema_json do segmento/tenant — nunca lido por nome fixo aqui (ver
   *  ativoFormSchema/referenceValueField abaixo), pra continuar 100% agnóstico de segmento. */
  raw_json?: Record<string, any> | null;
  client_id?: string | null; atividades_count?: number;
  /** valor_venda = REAL, só existe depois do fechamento. valor_venda_estimado = palpite de
   *  quem está atendendo, nunca confundido com o real — sempre rotulados de forma distinta na
   *  UI (docs/CHECKPOINT.md, 2026-08-13). */
  valor_venda?: number | null;
  valor_venda_estimado?: number | null;
  corretor_atribuido_id?: string | null;
  corretor_nome?: string | null;
  /** Dono do lead: primeiro usuário que atuou nele (NULL = ainda não atendido). */
  dono_user_id?: string | null;
  dono_nome?: string | null;
  dono_tem_foto?: boolean;
  /** Tema do ciclo de vendas (null = lead sem tema). */
  tema_id?: number | null;
  tema_nome?: string | null;
  campanha_nome?: string | null;
  contato_avatar_url?: string | null;
  corretor_tem_foto?: boolean;
  deleted_at?: string | null;
}
/**
 * Máscara do telefone no card: (99) 99999-9999. Os leads vindos do WhatsApp chegam com o DDI 55
 * na frente (ex.: 5581998765432) — o DDI é suprimido só na exibição, o valor salvo não muda.
 * Valor que não se encaixa no padrão brasileiro volta cru, sem perder informação.
 */
function formatTelefoneCard(raw?: string | null): string {
  if (!raw) return ''
  let d = raw.replace(/\D/g, '')
  if (d.startsWith('55') && (d.length === 12 || d.length === 13)) d = d.slice(2)
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return raw
}

interface Coluna { id: number; nome: string; titulo_exibicao: string; cor: string; icone: string; is_ganho?: boolean; is_perda?: boolean; requer_valor_estimado?: boolean; }

const formatPhone = (phone?: string) => {
  if (!phone) return 'S/ Telefone'
  const c = phone.replace(/\D/g, '')
  if (c.length === 11) return `(${c.slice(0,2)}) ${c.slice(2,7)}-${c.slice(7)}`
  return phone
}

// Mistura `col.cor` (hex arbitrário, curado pelo tenant em /crm/config/kanban) numa base opaca
// (navy-light/branco) — dá identidade de coluna ao card sem virar uma cor de DECISÃO nova (é a
// mesma cor já usada no dot/borda do cabeçalho da coluna, só entra também no corpo do card).
// Cálculo puro em RGB (sem depender de color-mix(), suporte recente demais pra garantir em
// qualquer navegador), sempre devolve uma cor sólida — cards continuam nítidos mesmo empilhados
// sobre o painel semitransparente da coluna.
//
// Passo 1 (pastelAmount) clareia `col.cor` em direção ao BRANCO — sempre, nos dois modos, nunca
// em direção à base final — antes de misturar. Sem isso, uma cor saturada/escura configurada
// pelo tenant (ex.: vermelho puro numa coluna de "Perdido") entraria no card praticamente no
// valor original, e testado contra o texto mais apagado do card (telefone/e-mail, 11px) isso
// reprovava WCAG AA (~4.4:1, abaixo do mínimo de 4.5:1) já em misturas bem discretas. Garantir
// que o próprio matiz injetado já nasce de alta luminância dá margem de contraste real mesmo no
// pior caso, independente de qual cor o tenant escolher — inclusive em modo escuro, onde a base
// final (navy) é escura mas a cor pré-clareada continua clara antes de entrar na mistura.
const tintColor = (hex: string, base: [number, number, number], pastelAmount: number, mixAmount: number): string => {
  const clean = (hex || '').replace('#', '')
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return `rgb(${base[0]}, ${base[1]}, ${base[2]})`
  const r0 = parseInt(clean.slice(0, 2), 16)
  const g0 = parseInt(clean.slice(2, 4), 16)
  const b0 = parseInt(clean.slice(4, 6), 16)
  const pr = r0 + (255 - r0) * pastelAmount
  const pg = g0 + (255 - g0) * pastelAmount
  const pb = b0 + (255 - b0) * pastelAmount
  const [br, bg, bb] = base
  return `rgb(${Math.round(br + (pr - br) * mixAmount)}, ${Math.round(bg + (pg - bg) * mixAmount)}, ${Math.round(bb + (pb - bb) * mixAmount)})`
}

export default function KanbanPage() {
  const t = useTheme()
  // Painel de Missão (DESIGN.md) — mesmo vocabulário já usado em admin/campanhas/dashboard,
  // reaproveitado aqui para consistência entre as duas superfícies do produto. `t.isDark`
  // (useTheme genérico) continua sendo a fonte de verdade do modo; só a PALETA muda — de
  // cinza/azul genérico para navy+âmbar. Escopado ao Kanban de propósito (não editamos
  // useTheme.ts): outras telas que ainda usam o hook genérico não são afetadas por esta ronda.
  const isDark   = t.isDark
  const dsCard   = isDark
    ? 'bg-navy-light border border-[rgba(255,255,255,0.06)] transition-shadow hover:shadow-[0_4px_20px_rgba(0,0,0,0.25)]'
    : 'bg-white border border-slate-200/80 transition-shadow hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)]'
  const dsPanel  = isDark
    ? 'bg-navy-light/60 border border-[rgba(255,255,255,0.06)]'
    : 'bg-white/80 backdrop-blur-xl border border-slate-200/60 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)]'
  const dsText   = isDark ? 'text-slate-200' : 'text-slate-900'
  // slate-600/slate-300 (não slate-500/slate-400) — um degrau a mais de contraste em cada modo.
  // Necessário pra sobrar margem real de WCAG (≥4.5:1) mesmo no pior caso de tingimento de card
  // (coluna com cor saturada tipo vermelho, ver tintColor abaixo) — com o par antigo, esse texto
  // já vivia bem perto do limiar (~4.76:1) mesmo SEM nenhum tingimento.
  const dsMuted  = isDark ? 'text-slate-300' : 'text-slate-600'
  const dsFaint  = isDark ? 'text-slate-500' : 'text-slate-400'
  const dsDivider= isDark ? 'border-[rgba(255,255,255,0.05)]' : 'border-slate-100'
  const dsInput  = isDark
    ? 'bg-white/5 border border-[rgba(255,255,255,0.08)] text-slate-200 placeholder:text-slate-500'
    : 'bg-slate-50 hover:bg-slate-100/50 focus:bg-white text-slate-700 border border-transparent'
  // Anel de foco (#2563eb) — fixo, não substituível pelo acento (DESIGN.md).
  const dsFocus  = 'focus:outline-none focus:ring-2 focus:ring-blue-600/40'
  // Botão de ação primária — único uso de âmbar sólido no board (Regra do Acento Único).
  const dsPrimaryBtn = 'bg-gold-premium text-navy-dark hover:bg-gold transition-colors'
  const [colunas, setColunas] = useState<Coluna[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  // Ficha do lead — estado e ações compartilhados com a página de Leads (useLeadFicha).
  const ficha = useLeadFicha<Lead>({
    colunas,
    onPatchLead: (uuid, patch) => setLeads(prev => prev.map(l => l.lead_uuid === uuid ? { ...l, ...patch } : l)),
    onReload: () => { fetchData() },
  })
  const { tenantConfig } = ficha
  // Escopo Minha Empresa / Cliente (pedido do usuário, 2026-08-31) — null = ainda não escolhido,
  // gate obrigatório antes de mostrar qualquer lead (diferente do padrão de Campanhas, que já
  // defaulta pra 'own' e mostra resultado na hora — aqui a escolha é deliberadamente mandatória
  // e nunca persiste entre sessões/reloads, sempre pergunta de novo).
  const [scopeClientId, setScopeClientId] = useState<ClientFilterValue | null>(null)
  const { clients: scopeClients, loading: scopeClientsLoading } = useClientSelector()
  const scopeClientName = scopeClientId && scopeClientId !== 'own' && scopeClientId !== 'segment'
    ? scopeClients.find(c => c.id === scopeClientId)?.name ?? null
    : null
  // Guard contra race condition: trocar de escopo rápido (ou criar um lead logo depois de
  // trocar) pode disparar 2+ chamadas de fetchData quase simultâneas, sem garantia de qual
  // resposta HTTP chega primeiro. Só a resposta da chamada MAIS RECENTE pode atualizar o state.
  const fetchRequestIdRef = useRef(0)
  const [isNovoLeadOpen, setIsNovoLeadOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [isCalendarioViewOpen, setIsCalendarioViewOpen] = useState(false)
  // Exclusão de lead (docs/CHECKPOINT.md, 2026-08-14) — filtro "Mostrar leads excluídos" e
  // estado de exclusão/restauração em andamento (desabilita os botões enquanto processa).
  const [showDeleted, setShowDeleted] = useState(false)
  // Filtros de dono do lead + período de criação (pedido do usuário, 2026-08-16) — client-side,
  // mesmo padrão do searchTerm: filtram o board sobre os leads já carregados, sem round-trip
  // novo. '__none__' é o sentinela pra "sem dono atribuído".
  const [filterOwnerId, setFilterOwnerId] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  // Filtro por Tema do ciclo de vendas — lista suspensa com checkboxes, default "Todos".
  // Guarda os temas DESMARCADOS; vazio = todos marcados = sem filtro.
  const [temas, setTemas] = useState<{ id: number; nome: string }[]>([])
  const [temaExcluidos, setTemaExcluidos] = useState<string[]>([])

  useEffect(() => {
    adminFetch('/api/crm/temas')
      .then(r => r.json())
      .then(d => { if (d.success) setTemas(d.temas) })
      .catch(() => setTemas([]))
  }, [])

  const getInitials = (name: string) => {
    if (!name) return 'LD'
    const parts = name.trim().split(' ')
    return parts.length > 1 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : name.substring(0, 2).toUpperCase()
  }

  /** Dias corridos desde a captação — mesmo cálculo em dia civil (não frações de 24h) já
   *  usado no resto da ficha, pra bater com o que "24 DE AGO." ao lado já comunica. */
  const daysSinceCreation = (iso?: string) => {
    if (!iso) return null
    const created = new Date(iso)
    const today = new Date()
    const createdDay = Date.UTC(created.getFullYear(), created.getMonth(), created.getDate())
    const todayDay = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
    return Math.round((todayDay - createdDay) / 86400000)
  }
  const daysSinceCreationLabel = (days: number) => days <= 0 ? 'Hoje' : days === 1 ? '1 dia' : `${days} dias`

  const { user } = useAuth()
  const tenantId = user?.currentTenant?.id
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null

  useEffect(() => {
    // Se detectar sucesso no Google Auth, limpa URL e refaz fetch da config do tenant
    if (searchParams?.get('google_auth') === 'success') {
      console.log('🔄 [CRM] Google Auth detectado com sucesso. Atualizando configurações...')
      ficha.refreshTenantConfig()
      const newUrl = window.location.pathname
      window.history.replaceState({}, '', newUrl)
    }
  }, [searchParams?.get('google_auth')])

  // Leads/colunas só carregam depois que o usuário escolhe o escopo (Minha Empresa / cliente) —
  // gate obrigatório, pedido do usuário (2026-08-31). Refaz sempre que o escopo ou o filtro de
  // "mostrar excluídos" mudam.
  useEffect(() => {
    if (scopeClientId === null) return
    fetchData()
  }, [scopeClientId, showDeleted])

  // Gate condicionado a `tenants.crm_clientes` (curado pelo Master, 2026-08-31) — a maioria dos
  // tenants não gerencia cliente nenhum no CRM, então perguntar "Minha Empresa ou Cliente?" toda
  // vez é atrito puro sem opção real de escolha. Só entra em ação quando a config do tenant já
  // carregou (tenantConfig !== null) — antes disso não dá pra saber se o gate se aplica.
  useEffect(() => {
    if (tenantConfig && !tenantConfig.crm_clientes && scopeClientId === null) {
      setScopeClientId('own')
    }
  }, [tenantConfig, scopeClientId])

  const fetchData = async () => {
    const requestId = ++fetchRequestIdRef.current
    setLoading(true)
    try {
      const leadsParams = new URLSearchParams()
      if (showDeleted) leadsParams.set('includeDeleted', '1')
      // scopeClientId só é null enquanto o gate ainda não foi passado (fetchData nunca é chamado
      // nesse estado — ver useEffect acima); 'segment' não é uma opção oferecida nesta tela.
      if (scopeClientId && scopeClientId !== 'segment') leadsParams.set('clientId', scopeClientId)
      const leadsUrl = `/api/crm/leads${leadsParams.toString() ? `?${leadsParams.toString()}` : ''}`
      const [colsRes, leadsRes] = await Promise.all([adminFetch('/api/crm/kanban/colunas'), adminFetch(leadsUrl)])
      const [colsData, leadsData] = await Promise.all([colsRes.json(), leadsRes.json()])
      // Uma chamada mais nova já pode ter respondido e atualizado o state antes desta — nunca
      // sobrescrever com um resultado desatualizado (ver fetchRequestIdRef acima).
      if (requestId !== fetchRequestIdRef.current) return
      if (colsData.success) setColunas(colsData.colunas)
      if (leadsData.success) setLeads(leadsData.leads)
    } finally {
      if (requestId === fetchRequestIdRef.current) setLoading(false)
    }
  }

  // O campo de valor que o PRÓPRIO lead declarou no Perfil de Interesse (ex.: "Faixa de
  // Valor" em Venda de Carros, "Valor" em Imobiliário) — sempre o 1º campo type:"currency"
  // do schema resolvido pro tenant/segmento, nunca um nome fixo. Mostrado como referência,
  // desabilitado, no modal de "Negócio Fechado" — o atendente vê o que o lead pediu antes de
  // informar o valor real fechado.
  // Dono do lead — lista derivada dos leads já carregados (mesma fonte de verdade do avatar/
  // legenda do card), não uma chamada nova a /api/admin/usuarios: só faz sentido oferecer no
  // filtro quem de fato tem lead atribuído neste board.
  const ownerOptions = useMemo(() => {
    const map = new Map<string, string>()
    let hasUnassigned = false
    leads.forEach(l => {
      if (l.corretor_atribuido_id && l.corretor_nome) map.set(l.corretor_atribuido_id, l.corretor_nome)
      else if (!l.corretor_atribuido_id) hasUnassigned = true
    })
    return {
      owners: Array.from(map.entries()).map(([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
      hasUnassigned,
    }
  }, [leads])

  const hasActiveFilters = !!(searchTerm || filterOwnerId || filterDateFrom || filterDateTo || temaExcluidos.length > 0)
  const clearFilters = () => {
    setSearchTerm('')
    setFilterOwnerId('')
    setTemaExcluidos([])
    setFilterDateFrom('')
    setFilterDateTo('')
  }

  // Data de criação em horário LOCAL (mesmo critério já usado pra exibir a data no card —
  // new Date(...).toLocaleDateString — nunca a fatia crua do ISO em UTC, que desalinharia o
  // filtro perto da meia-noite pro fuso do Brasil).
  const localDateIso = (iso?: string) => {
    if (!iso) return ''
    const d = new Date(iso)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  const filterLeads = (col: Coluna) => leads.filter(l => {
    if (l.coluna_nome !== col.nome) return false
    if (searchTerm) {
      const s = searchTerm.toLowerCase()
      const matches = l.nome?.toLowerCase().includes(s) || l.email?.toLowerCase().includes(s) ||
        l.tag_sonho?.toLowerCase().includes(s) ||
        (l.enriquecimento_cache ? JSON.stringify(l.enriquecimento_cache).toLowerCase().includes(s) : false)
      if (!matches) return false
    }
    if (filterOwnerId) {
      if (filterOwnerId === '__none__') {
        if (l.corretor_atribuido_id) return false
      } else if (l.corretor_atribuido_id !== filterOwnerId) {
        return false
      }
    }
    if (temaExcluidos.length > 0 && temaExcluidos.includes(String(l.tema_id ?? ''))) return false
    if (filterDateFrom || filterDateTo) {
      const leadDate = localDateIso(l.created_at)
      if (!leadDate) return false
      if (filterDateFrom && leadDate < filterDateFrom) return false
      if (filterDateTo && leadDate > filterDateTo) return false
    }
    return true
  })

  // Valor "efetivo" de 1 lead — mesma prioridade real > estimado já usada no badge do card
  // (nunca soma os dois juntos, senão um negócio já fechado contaria 2x).
  // O driver pg devolve coluna NUMERIC como STRING (não número) — somar direto fazia
  // concatenação de texto em vez de soma matemática ("0" + "1000.00" = "01000.00", e com
  // 2+ leads com valor isso corrompe pra um número inválido, renderizado como "R$ NaN").
  // Number(...) força a conversão antes de qualquer soma; Number.isFinite cobre o caso raro
  // de a string vir genuinamente malformada (nunca propaga NaN pra frente).
  const leadEffectiveValue = (l: Lead) => {
    const raw = l.valor_venda ?? l.valor_venda_estimado
    if (raw == null) return 0
    const n = Number(raw)
    return Number.isFinite(n) ? n : 0
  }

  // Soma do valor de uma coluna inteira (mesmo conjunto já filtrado por busca/dono/data que
  // a contagem do header já usa — filterLeads).
  const columnValueSum = (col: Coluna) => filterLeads(col).reduce((sum, l) => sum + leadEffectiveValue(l), 0)

  // KPIs de "Total do ano/mês até hoje" — ignoram busca, dono e período de propósito (resumo
  // fixo de negócio), mas OBEDECEM ao filtro de temas (pedido do usuário). Leads excluídos
  // ficam de fora, como no resto da tela.
  const yearMonthTotals = useMemo(() => {
    const now = new Date()
    const startOfYear = `${now.getFullYear()}-01-01`
    const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    let leadsYTD = 0, leadsMTD = 0, valueYTD = 0, valueMTD = 0
    for (const l of leads) {
      if (l.deleted_at) continue
      if (temaExcluidos.length > 0 && temaExcluidos.includes(String(l.tema_id ?? ''))) continue
      const d = localDateIso(l.created_at)
      if (!d) continue
      const value = leadEffectiveValue(l)
      if (d >= startOfYear) { leadsYTD++; valueYTD += value }
      if (d >= startOfMonth) { leadsMTD++; valueMTD += value }
    }
    return { leadsYTD, leadsMTD, valueYTD, valueMTD }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leads, temaExcluidos])


  const handleDragStart = (e: React.DragEvent, lead: Lead) => {
    e.dataTransfer.setData('lead_uuid', lead.lead_uuid)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent, targetCol: Coluna) => {
    e.preventDefault()
    const lead_uuid = e.dataTransfer.getData('lead_uuid')
    if (!lead_uuid) return
    const lead = leads.find(l => l.lead_uuid === lead_uuid)
    if (!lead || lead.coluna_nome === targetCol.nome) return
    // Adia a mutação de estado pro próximo tick — o `requestMove`/`executeMove` reestrutura o
    // DOM do card (ele sai do .map() de uma coluna e entra no de outra, um subtree diferente,
    // então o React desmonta o nó original e monta um novo, mesmo com a mesma key). Fazer isso
    // ainda dentro da pilha de chamadas do evento nativo `drop` impede o Chromium de terminar
    // de encerrar a sessão de drag corretamente (o `dragend` nunca chega a disparar limpo no
    // elemento original, que já não existe mais). Depois de 2 arrastos reais seguidos assim, o
    // motor de drag do navegador trava silenciosamente — nenhum `dragstart` novo dispara até
    // recarregar a página, mesmo clique/scroll continuando normais. Achado real: simulação via
    // `DragEvent`+`DataTransfer` sintético (sem uma sessão nativa de verdade) nunca reproduzia
    // o travamento — só um arrasto físico de mouse é afetado, por isso passou despercebido em
    // testes automatizados anteriores.
    setTimeout(() => ficha.requestMove(lead, targetCol), 0)
  }

  // Enquanto a config do tenant ainda não carregou, não dá pra saber se o gate de escopo se
  // aplica (depende de tenants.crm_clientes) — evita o flash da tela "Para quem são estes
  // leads?" pra tenants sem clientes geridos no CRM (a maioria, default false).
  if (tenantConfig === null) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className={`h-8 w-8 rounded-full border-2 border-t-transparent animate-spin ${isDark ? 'border-gold-premium/40' : 'border-slate-300'}`} />
      </div>
    )
  }

  // Gate obrigatório (pedido do usuário, 2026-08-31), agora condicionado a `tenants.crm_clientes`
  // (curado pelo Master, 2026-08-31): só pergunta "Minha Empresa ou Cliente?" pra tenants que de
  // fato gerenciam cliente no CRM — pros demais, o useEffect logo acima já resolveu
  // `scopeClientId='own'` sozinho, sem interromper o atendente com uma escolha sem opção real.
  if (tenantConfig.crm_clientes && scopeClientId === null) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center animate-in fade-in duration-500">
        <div className={`max-w-lg w-full mx-4 p-8 rounded-[2rem] border text-center ${dsPanel}`}>
          <div className="h-14 w-14 rounded-2xl bg-gold-premium flex items-center justify-center text-navy-dark mx-auto mb-5">
            <BuildingOfficeIcon className="h-7 w-7" />
          </div>
          <h2 className={`text-lg font-black tracking-tight mb-2 ${dsText}`}>
            Para quem são estes leads?
          </h2>
          <p className={`text-sm mb-6 ${dsMuted}`}>
            Escolha o escopo antes de ver o quadro — os leads de "Minha Empresa" e de cada
            cliente ficam sempre separados.
          </p>
          <div className="flex justify-center">
            <ClientSelector
              // "segment" nunca é oferecido como opção aqui (allowSegment={false}, mais
              // abaixo) — reaproveitado só como sentinela de "nada escolhido ainda", já que
              // `isClientSelected` do componente trata "segment" como não-cliente (mesma regra
              // que já usa pra não destacar a pill "Para um Cliente" à toa). Achado real: um
              // sentinela solto tipo "__unset__" cai no ramo "é um cliente" por eliminação
              // (não é nem 'segment' nem 'own') e pinta a pill de dourado antes de qualquer
              // escolha real do usuário.
              value="segment"
              onChange={(v) => setScopeClientId(v)}
              clients={scopeClients}
              loading={scopeClientsLoading}
              variant="toggle"
              allowSegment={false}
            />
          </div>
        </div>
      </div>
    )
  }

  // Alerta de "kanban não configurado" (pedido do usuário, 2026-09-29) — todo tenant NOVO já
  // nasce com um template padrão de 7 colunas (seed em admin/master/tenants/route.ts), mas isso
  // não cobre 100% dos casos: um tenant de bancada/teste criado por outro caminho, ou um tenant
  // real que teve suas colunas apagadas, fica com `colunas.length === 0` — sem nenhuma coluna, o
  // board não tem nem onde soltar um card, então mostrar o quadro vazio silenciosamente (como
  // acontecia antes) é pior do que dizer claramente o que falta. Só decide depois que o fetch
  // real já voltou (`!loading`) — nunca no instante inicial, antes da 1ª resposta da API.
  if (!loading && colunas.length === 0) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center animate-in fade-in duration-500">
        <div className={`max-w-lg w-full mx-4 p-8 rounded-[2rem] border text-center ${dsPanel}`}>
          <div className="h-14 w-14 rounded-2xl bg-amber-500 flex items-center justify-center text-white mx-auto mb-5">
            <ExclamationTriangleIcon className="h-7 w-7" />
          </div>
          <h2 className={`text-lg font-black tracking-tight mb-2 ${dsText}`}>
            Kanban ainda não configurado
          </h2>
          <p className={`text-sm mb-6 ${dsMuted}`}>
            Esta empresa ainda não tem nenhuma etapa (coluna) cadastrada no funil de leads —
            configure ao menos uma para começar a usar o Kanban.
          </p>
          <a
            href="/crm/config/kanban"
            className={`inline-flex items-center px-6 py-3 text-sm font-bold rounded-2xl active:scale-95 ${dsPrimaryBtn}`}
          >
            <ListBulletIcon className="h-5 w-5 mr-2" />
            Configurar etapas do Kanban
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Toolbar Premium — precisa de "relative z-20" explícito: o próprio backdrop-blur-xl
          desta div cria um contexto de empilhamento CSS separado do da linha de filtros logo
          abaixo (que também tem backdrop-blur-xl); sem um z-index aqui no nível do PAI comum,
          o dropdown do ClientSelector (z-50, mas preso dentro deste contexto) fica coberto pela
          linha seguinte, que vem depois no HTML. Bug real, achado testando com o usuário
          (2026-08-31) — só aparecia com o dropdown aberto pelo toolbar, nunca pelo gate. */}
      <div className={`relative z-20 flex flex-col md:flex-row md:items-center justify-between gap-4 ${dsPanel} p-4 rounded-[2rem]`}>
        <div className="relative flex-1 max-w-xl">
          <MagnifyingGlassIcon className={`absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 ${dsFaint}`} />
          <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar lead por Nome, E-mail, Tag ou Bairro..."
            className={`w-full rounded-2xl py-3 pl-12 pr-4 text-sm ${dsFocus} transition-all font-medium ${dsInput}`} />
        </div>
        {/* Escopo Minha Empresa / Cliente — só aparece pra tenants com `crm_clientes` ativo
            (curado pelo Master, 2026-08-31); pros demais o seletor nunca teria opção real de
            escolha, então nem o gate nem este switcher são mostrados. */}
        {tenantConfig?.crm_clientes && scopeClientId !== null && (
          <ClientSelector
            value={scopeClientId}
            onChange={(v) => setScopeClientId(v)}
            clients={scopeClients}
            loading={scopeClientsLoading}
            variant="toggle"
            allowSegment={false}
          />
        )}
        <div className="flex items-center space-x-3">
          {tenantConfig?.calendario && (
            <button onClick={() => setIsCalendarioViewOpen(true)}
              className={`flex items-center px-5 py-2.5 ${dsPanel} ${dsText} hover:text-gold-premium text-sm font-bold rounded-2xl transition-colors active:scale-95`}>
              <CalendarDaysIcon className="h-4 w-4 mr-2" />Calendário
            </button>
          )}
          <a href="/crm/config/kanban" className={`p-3 ${dsMuted} hover:text-gold-premium ${dsPanel} rounded-2xl transition-colors`} title="Configurar Funil">
            <ListBulletIcon className="h-5 w-5" />
          </a>
          <a href="/crm/config/atividades" className={`p-3 ${dsMuted} hover:text-gold-premium ${dsPanel} rounded-2xl transition-colors`} title="Configurar Tipos de Atividade">
            <PencilSquareIcon className="h-5 w-5" />
          </a>
          {/* Filtro "Mostrar leads excluídos" (docs/CHECKPOINT.md, 2026-08-14) — leads
              soft-deletados (com atividade registrada) só aparecem no board com isso ativo.
              Vermelho é estado semântico real (modo destrutivo ativo), não decorativo. */}
          <button
            onClick={() => setShowDeleted(v => !v)}
            title={showDeleted ? 'Ocultar leads excluídos' : 'Mostrar leads excluídos'}
            className={`p-3 rounded-2xl transition-colors border ${
              showDeleted
                ? 'bg-red-500 text-white border-red-500'
                : `${dsMuted} ${dsPanel} hover:text-red-500`
            }`}
          >
            <TrashIcon className="h-5 w-5" />
          </button>
          <button onClick={() => setIsNovoLeadOpen(true)}
            className={`flex items-center px-6 py-2.5 text-sm font-bold rounded-2xl active:scale-95 ${dsPrimaryBtn}`}>
            <PlusIcon className="h-5 w-5 mr-2" />Novo Lead
          </button>
        </div>
      </div>

      {/* Filtros de Dono do Lead + Período de Criação (pedido do usuário, 2026-08-16) */}
      <div className={`relative z-30 flex flex-wrap items-center gap-3 ${dsPanel} p-4 rounded-[2rem]`}>
        <div className="flex items-center gap-2">
          <UserCircleIcon className={`h-5 w-5 ${dsFaint}`} />
          <TemaMultiSelect temas={temas} excluded={temaExcluidos} onChange={setTemaExcluidos} isDark={isDark} />
          <select
            value={filterOwnerId}
            onChange={e => setFilterOwnerId(e.target.value)}
            className={`rounded-2xl py-2.5 px-4 text-sm ${dsFocus} transition-all font-medium ${dsInput}`}
          >
            <option value="">Todos os donos</option>
            {ownerOptions.owners.map(o => (
              <option key={o.id} value={o.id}>{o.nome}</option>
            ))}
            {ownerOptions.hasUnassigned && <option value="__none__">Sem dono atribuído</option>}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <CalendarDaysIcon className={`h-5 w-5 ${dsFaint}`} />
          <span className={`text-xs font-bold uppercase tracking-wide ${dsFaint}`}>De</span>
          {/* w-36 (era w-32) — em 128px o texto "dd/mm/aaaa" colidia com o espaço já
              reservado pro ícone (paddingRight:28 fixo no próprio DateInputPtBR),
              truncando o último "a". Alargar o campo, não mexer no padding do ícone. */}
          <div className="w-36">
            <DateInputPtBR
              value={filterDateFrom}
              onChange={setFilterDateFrom}
              className={`w-full rounded-2xl py-2.5 pl-4 text-sm ${dsFocus} transition-all font-medium ${dsInput}`}
            />
          </div>
          <span className={`text-xs font-bold uppercase tracking-wide ${dsFaint}`}>Até</span>
          <div className="w-36">
            <DateInputPtBR
              value={filterDateTo}
              onChange={setFilterDateTo}
              className={`w-full rounded-2xl py-2.5 pl-4 text-sm ${dsFocus} transition-all font-medium ${dsInput}`}
            />
          </div>
        </div>

        {/* 4 KPIs fixos (ano/mês corrente até hoje) — item 2, pedido 2026-10-12. Resumo de
            negócio, não um filtro manipulável: deliberadamente ignora busca/dono/período
            selecionados acima (ver comentário de yearMonthTotals). */}
        <div className={`flex flex-wrap items-center gap-4 pl-4 ml-1 border-l ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
          {/* items-end — o valor fica alinhado à direita do próprio label (pedido do
              usuário, 2026-10-12), não solto à esquerda embaixo dele. */}
          <div className="flex flex-col items-end min-w-[72px]">
            <span className={`text-[9px] font-black uppercase tracking-wide ${dsFaint}`}>Leads no Ano</span>
            <span className={`text-sm font-black ${dsText}`}>{yearMonthTotals.leadsYTD}</span>
          </div>
          <div className="flex flex-col items-end min-w-[72px]">
            <span className={`text-[9px] font-black uppercase tracking-wide ${dsFaint}`}>Leads no Mês</span>
            <span className={`text-sm font-black ${dsText}`}>{yearMonthTotals.leadsMTD}</span>
          </div>
          <div className="flex flex-col items-end min-w-[90px]">
            <span className={`text-[9px] font-black uppercase tracking-wide ${dsFaint}`}>Valor no Ano</span>
            <span className="text-sm font-black text-gold-premium">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(yearMonthTotals.valueYTD)}
            </span>
          </div>
          <div className="flex flex-col items-end min-w-[90px]">
            <span className={`text-[9px] font-black uppercase tracking-wide ${dsFaint}`}>Valor no Mês</span>
            <span className="text-sm font-black text-gold-premium">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(yearMonthTotals.valueMTD)}
            </span>
          </div>
        </div>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className={`flex items-center gap-1 px-3 py-2 text-xs font-bold rounded-xl transition-colors ${isDark ? 'text-red-400 hover:bg-red-500/10' : 'text-red-500 hover:bg-red-50'}`}
          >
            <XMarkIcon className="h-4 w-4" />Limpar filtros
          </button>
        )}
      </div>

      {loading ? (
        <div className={`flex items-center justify-center p-20 text-sm font-bold uppercase tracking-widest animate-pulse ${dsFaint}`}>Sincronizando Inteligência...</div>
      ) : (
        <div className="flex space-x-6 overflow-x-auto pb-8 pt-4 custom-scrollbar">
          {colunas.map(col => {
            // Identidade de coluna, "leve", também no corpo/rodapé do card (pedido do usuário —
            // o board inteiro em tons neutros ficava "insosso"): mesma cor já configurada no
            // header, só que numa mistura bem baixa. Rodapé recebe uma mistura mais forte que o
            // corpo — cria o efeito de "faixa destacada" sem virar uma faixa lateral (banida).
            // Calibrado 2x: a 1ª rodada (pastel .70, mistura .14-.28) passava no cálculo de
            // contraste mas era visualmente imperceptível — cores resultantes ficavam a 5-12
            // unidades de RGB do branco puro, indistinguível a olho nu (feedback real do
            // usuário: "ainda sem graça"). Recalibrado pra cor genuinamente visível ("linda e
            // discreta", não "quase branco"): pastel mais baixo (deixa a cor de origem mais
            // saturada antes de clarear) + mistura bem mais forte. Pior caso ainda medido contra
            // as 7 cores de coluna reais deste tenant: ~4.8:1 no rodapé escuro, ~5.1:1 no rodapé
            // claro — acima do mínimo de 4.5:1, com folga real.
            const navyBase: [number, number, number] = [17, 34, 64]
            const whiteBase: [number, number, number] = [255, 255, 255]
            const pastelAmount = 0.55
            const cardTint = tintColor(col.cor, isDark ? navyBase : whiteBase, pastelAmount, isDark ? 0.24 : 0.45)
            const footerTint = tintColor(col.cor, isDark ? navyBase : whiteBase, pastelAmount, isDark ? 0.28 : 0.65)
            return (
            <div key={col.id} className="flex-shrink-0 w-[340px] flex flex-col space-y-4">
              {/* Header da Coluna — a cor cadastrada pelo tenant (/crm/config/kanban) continua
                  real e visível (dot + badge de contagem), mas deixou de tingir o painel inteiro:
                  Regra do Acento Único (DESIGN.md) reserva cor de fundo pra decisão real, não pra
                  identidade de coluna configurável. Uma borda superior fina na cor do tenant
                  substitui o preenchimento como indicador de "de qual coluna é isto". */}
              <div className={`px-5 py-3.5 rounded-2xl border-x border-b flex items-center justify-between border-t-[3px] ${dsPanel}`}
                style={{ borderTopColor: col.cor }}>
                <div className="flex items-center space-x-3">
                  <div className="h-2 w-2 rounded-full shadow-sm" style={{ backgroundColor: col.cor, boxShadow: `0 0 0 2px ${col.cor}40` }} />
                  <span className={`text-[11px] font-black uppercase tracking-[0.08em] ${dsText}`}>{col.titulo_exibicao}</span>
                  {/* Badge Ganho/Perda (mesmo padrão visual de /crm/config/kanban) — item 1.2 do
                      roteiro de testes pede isso no board em si, não só na tela de config. */}
                  {col.is_ganho && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                      Ganho
                    </span>
                  )}
                  {col.is_perda && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide bg-red-500/15 text-red-500 border border-red-500/30">
                      Perda
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black text-white shadow-sm" style={{ backgroundColor: col.cor }}>
                    {filterLeads(col).length}
                  </span>
                  {/* Total de valor da coluna (item 1, pedido 2026-10-12) — mesma prioridade
                      real>estimado do badge individual do card; some quando é zero (coluna
                      sem nenhum lead com valor informado) pra não poluir o header à toa. */}
                  {columnValueSum(col) > 0 && (
                    <span className={`text-[10px] font-bold ${dsFaint}`}>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(columnValueSum(col))}
                    </span>
                  )}
                </div>
                <EllipsisHorizontalIcon className={`h-5 w-5 cursor-pointer opacity-50 hover:opacity-100 transition-opacity ${dsFaint}`} />
              </div>

              {/* Área de Cards (Lanes) */}
              <div className={`flex-1 space-y-4 min-h-[500px] p-2.5 rounded-3xl border-2 border-dashed transition-colors ${
                isDark ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50/60 border-slate-200/60'
              }`}
                   onDragOver={handleDragOver}
                   onDrop={(e) => handleDrop(e, col)}>
                {filterLeads(col).map(lead => (
                  <div key={lead.lead_uuid} onClick={() => ficha.openLead(lead)}
                    draggable={!lead.deleted_at}
                    onDragStart={(e) => handleDragStart(e, lead)}
                    style={{ backgroundColor: cardTint }}
                    className={`group relative p-4 rounded-2xl transition-all duration-300 cursor-pointer hover:-translate-y-0.5 ${dsCard} hover:border-gold-premium/40 ${lead.deleted_at ? 'opacity-50 grayscale-[30%]' : ''}`}>
                    {lead.deleted_at && (
                      <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest bg-red-500 text-white z-10">
                        <TrashIcon className="h-3 w-3" />Excluído
                      </div>
                    )}

                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center space-x-3.5">
                        {/* Potencial cliente (contato) — informação principal do card, no topo. */}
                        <div
                          className={`h-11 w-11 rounded-xl overflow-hidden flex items-center justify-center shrink-0 text-[11px] font-black ${isDark ? 'bg-white/5 text-slate-300' : 'bg-slate-100 text-slate-600'}`}
                        >
                          {lead.contato_avatar_url ? (
                            <img src={lead.contato_avatar_url} alt={lead.nome || 'Contato'} className="h-11 w-11 object-cover" />
                          ) : getInitials(lead.nome)}
                        </div>
                        <div>
                          <div className={`text-sm font-black leading-tight tracking-tight ${dsText}`}>{lead.nome || 'Lead s/ Nome'}</div>
                          <div className={`text-[11px] font-bold mt-0.5 ${dsMuted}`}>{formatTelefoneCard(lead.telefone) || lead.email || 'Sem contato'}</div>
                        </div>
                      </div>
                      {/* Score vira acento âmbar só quando ≥70% (lead "quente") — hierarquia com
                          significado real, não cor decorativa: ajuda a escanear prioridade num
                          board com muitos cards, sem depender de ler o número de cada um. */}
                      <div className={`text-[11px] font-black px-2 py-0.5 rounded-md border text-right leading-tight ${
                        (lead.score_prontidao || 0) >= 70
                          // Fundo sólido + texto navy (mesmo par do botão primário, ~7.6:1 de
                          // contraste) — texto dourado sobre fundo claro translúcido reprovava
                          // WCAG AA em light mode (~2.5:1); em dark mode o par claro/escuro já
                          // tinha contraste alto, mas o mesmo tratamento sólido mantém os dois
                          // modos consistentes entre si.
                          ? 'text-navy-dark bg-gold-premium border-gold'
                          : dsMuted + ' ' + dsDivider + ' bg-transparent'
                      }`}>
                        <div>{lead.score_prontidao != null ? `${lead.score_prontidao}% Match` : 'Não avaliado'}</div>
                        {lead.score_fit != null && <div>{lead.score_fit}% Aderência</div>}
                      </div>
                    </div>

                    {(lead.valor_venda_estimado != null || lead.valor_venda != null) && (
                      <div className="flex items-center gap-1.5 -mt-1 mb-2">
                        {/* text-*-500 mede ~2.6:1 sobre o fundo translúcido em light mode
                            (reprova WCAG AA pra texto pequeno) — *-700 mede ~5.1:1, passa; em
                            dark mode o *-500 original já tinha ~5.9:1 sobre navy, mantido. */}
                        {lead.valor_venda != null && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black border border-emerald-500/20 ${isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-700'}`}>
                            <span className="font-bold opacity-70 mr-1">Valor Fechado:</span>
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lead.valor_venda)}
                          </span>
                        )}
                        {lead.valor_venda == null && lead.valor_venda_estimado != null && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black border border-amber-500/20 ${isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-700'}`}>
                            ~{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lead.valor_venda_estimado)} est.
                          </span>
                        )}
                      </div>
                    )}

                    <div className="mb-4 mt-3">
                      {lead.enriquecimento_cache ? (
                        <div className={`px-3 py-2.5 rounded-xl ${isDark ? 'bg-black/20 border border-white/5' : 'bg-slate-50 border border-slate-100'}`}>
                          <EnrichedLeadData cache={lead.enriquecimento_cache} />
                        </div>
                      ) : lead.imovel_id ? (
                        <div className={`flex items-center text-[11px] font-bold border-b pb-2 ${dsMuted} ${dsDivider}`}>
                          <CheckBadgeIcon className={`h-4 w-4 mr-2 ${dsFaint}`} />
                          <span>Ref: #{lead.imovel_id}</span>
                        </div>
                      ) : (
                        <div className={`flex items-center text-[11px] font-bold border-b pb-2 ${dsMuted} ${dsDivider}`}>
                          <MapPinIcon className={`h-4 w-4 mr-2 ${dsFaint}`} />
                          <span>Interesse Regional</span>
                        </div>
                      )}
                      {lead.campanha_nome && (
                        <div className={`flex items-center text-[11px] font-bold mt-2 ${dsMuted}`} title={`Origem: ${lead.campanha_nome}`}>
                          <span className="truncate">📣 {lead.campanha_nome}</span>
                        </div>
                      )}
                    </div>

                    {/* Rodapé com faixa própria, discreta, na cor da coluna — mistura mais forte
                        que o corpo do card (mesma cor, não uma nova), bleeded até a borda do card
                        (-mx-4 -mb-4 cancelam o p-4 do container pai) com o canto arredondado
                        replicando o rounded-2xl do card. Nunca uma faixa LATERAL (padrão banido) —
                        é uma faixa horizontal no rodapé, papel visual diferente. */}
                    <div
                      className="flex items-center justify-between -mx-4 -mb-4 mt-3 px-4 py-2.5 rounded-b-2xl border-t"
                      style={{ backgroundColor: footerTint, borderTopColor: `${col.cor}30` }}
                    >
                      <div className="flex items-center space-x-2">
                        {/* Dono do lead (quem atua nele). Leads de campanha nascem sem dono. */}
                        {lead.dono_user_id && lead.dono_nome ? (
                          <div className="flex items-center gap-1.5 min-w-0" title={`Dono: ${lead.dono_nome}`}>
                            <div className={`h-7 w-7 rounded-lg overflow-hidden flex items-center justify-center shrink-0 text-[10px] font-black ${lead.dono_tem_foto ? '' : 'bg-blue-600 text-white'}`}>
                              {lead.dono_tem_foto ? (
                                <img src={`/api/admin/usuarios/${lead.dono_user_id}/foto`} alt={lead.dono_nome} className="h-7 w-7 object-cover" />
                              ) : getInitials(lead.dono_nome)}
                            </div>
                            <span className={`text-[10px] font-bold truncate max-w-[70px] ${dsMuted}`}>{lead.dono_nome.split(' ')[0]}</span>
                          </div>
                        ) : (
                          <span className={`text-[10px] font-bold italic ${dsMuted}`}>Ainda não atendido</span>
                        )}
                        {lead.created_at && (
                          // dsMuted (mesma razão da legenda do responsável, acima) — texto direto
                          // sobre a faixa de rodapé, que agora tem tingimento mais forte que o
                          // corpo do card.
                          <span className={`text-[10px] font-bold tracking-widest ${dsMuted}`}>
                            {new Date(lead.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        )}
                        {!!lead.atividades_count && (
                          <span className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md ${isDark ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'}`} title={`${lead.atividades_count} atividade(s) registrada(s)`}>
                            <ListBulletIcon className="h-3 w-3" />
                            {lead.atividades_count}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2.5">
                        {!!tenantConfig?.calendario && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              ficha.openLead(lead);
                              ficha.setIsAgendarOpen(true);
                            }}
                            className={`p-1.5 rounded-lg border transition-colors z-10 ${dsMuted} ${dsDivider} hover:text-gold-premium hover:border-gold-premium/40`}
                            title="Agendar Visita"
                          >
                            <CalendarDaysIcon className="h-4 w-4" />
                          </button>
                        )}
                        {/* Antes repetia o mesmo tag_sonho já exibido no badge do topo do
                            card (redundância apontada pelo usuário) — substituído pelo tempo
                            desde a captação, informação nova, não duplicada em lugar nenhum
                            do card. */}
                        {lead.created_at && (
                          <span
                            className={`flex items-center gap-1 text-[9px] font-black uppercase px-2 py-1 rounded-md border tracking-widest ${
                              isDark ? 'text-slate-300 bg-white/5 border-white/10' : 'text-slate-500 bg-slate-50 border-slate-200'
                            }`}
                            title="Tempo desde a captação do lead"
                          >
                            <ClockIcon className="h-3 w-3" />
                            {daysSinceCreationLabel(daysSinceCreation(lead.created_at)!)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Âmbar da marca (gold-premium/navy-dark), não amber genérico do Tailwind
                        — reaproveita a mesma cor já usada em todo o resto da ficha pra sinalizar
                        "conteúdo gerado pela IA" (Sugestão da IA, Valor Potencial estimado), em
                        vez de somar mais um elemento colorido aos que o card já tem. Um único
                        acento pra qualquer tag_sonho — nunca uma cor por categoria, que com 7-8
                        tags possíveis por segmento viraria visualmente confuso. */}
                    <div className="absolute -top-2.5 -right-2">
                      {/* Fundo sólido nos dois modos — texto dourado sobre branco (o par usado
                          antes aqui) mede ~2.5:1, reprova WCAG AA; navy-dark sobre gold-premium
                          mede ~7.6:1, mesmo par do botão primário. */}
                      <div className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full shadow-sm flex items-center border bg-gold-premium text-navy-dark border-gold ${isDark ? '' : 'ring-4 ring-white'}`}>
                        <SparklesIcon className="h-2.5 w-2.5 mr-1 text-navy-dark/70" />
                        {lead.tag_sonho || 'NOVO'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            )
          })}
        </div>
      )}

      {/* Modal Ficha */}
      <LeadFichaModal<Lead> ficha={ficha} />

      <NovoLeadModal
        isOpen={isNovoLeadOpen}
        onClose={() => setIsNovoLeadOpen(false)}
        onSuccess={fetchData}
        clientId={scopeClientId && scopeClientId !== 'own' && scopeClientId !== 'segment' ? scopeClientId : null}
        clientName={scopeClientName}
      />

      {/* Modal Visão Geral do Calendário */}
      {isCalendarioViewOpen && (
        <CalendarioGeralView 
          isOpen={isCalendarioViewOpen} 
          onClose={() => setIsCalendarioViewOpen(false)}
          onNovoAgendamento={() => { setIsCalendarioViewOpen(false); ficha.setIsAgendarOpen(true); }}
          tenantId={tenantId}
        />
      )}
    </div>
  )
}

// ── Componente Interno para Visão Geral do Calendário ────────────────

function CalendarioGeralView({ isOpen, onClose, onNovoAgendamento, tenantId }: { isOpen: boolean, onClose: () => void, onNovoAgendamento: () => void, tenantId?: string }) {
  const t = useTheme()
  const [agendamentos, setAgendamentos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'agenda' | 'mensal'>('agenda')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedAgendamento, setSelectedAgendamento] = useState<any>(null)

  useEffect(() => {
    if (isOpen && tenantId) fetchAgendamentos()
  }, [isOpen, tenantId])

  const fetchAgendamentos = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('admin-auth-token')
      const res = await fetch(`/api/crm/agendamentos/usuario?tenantId=${tenantId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      const data = await res.json()
      if (data.success) setAgendamentos(data.agendamentos)
    } catch (e) {
      console.error('Erro ao buscar agenda:', e)
    } finally { setLoading(false) }
  }

  const isValidDate = (d: any) => d instanceof Date && !isNaN(d.getTime())

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr)
    return isValidDate(d) ? d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'
  }
  
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return isValidDate(d) ? d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', weekday: 'long' }) : 'Data Indefinida'
  }

  // Agrupar por data para a visão de agenda
  const groups = agendamentos.reduce((acc: any, cur: any) => {
    const d = new Date(cur.data_hora_inicio)
    const day = isValidDate(d) ? d.toLocaleDateString('pt-BR') : 'Sem Data'
    if (!acc[day]) acc[day] = []
    acc[day].push(cur)
    return acc
  }, {})

  // Lógica para Visão Mensal
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const days = []
    for (let i = 0; i < (firstDay === 0 ? 0 : firstDay); i++) days.push(null)
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i))
    return days
  }

  const daysArr = getDaysInMonth(currentDate)
  const monthName = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const cardColors = [
    { bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', text: 'text-indigo-400', accent: 'bg-indigo-500' },
    { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', accent: 'bg-emerald-500' },
    { bg: 'bg-rose-500/10', border: 'border-rose-500/20', text: 'text-rose-400', accent: 'bg-rose-500' },
    { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', accent: 'bg-amber-500' },
    { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400', accent: 'bg-blue-500' },
  ]

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className={`${t.modalBg} w-full max-w-6xl h-[90vh] rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border ${t.borderSub} flex flex-col`}>
        <div className="p-8 border-b border-white/5 flex flex-wrap items-center justify-between bg-gradient-to-r from-blue-900/10 to-indigo-900/10 gap-4">
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <CalendarDaysIcon className="h-7 w-7 text-white" />
            </div>
            <div>
              <h2 className={`text-xl font-bold italic tracking-tight ${t.textPrimary}`}>Agenda de Visitas</h2>
              <p className={`text-[10px] uppercase tracking-[0.4em] font-black ${t.textMuted} opacity-60`}>Sincronização Profissional</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 bg-black/20 p-1.5 rounded-2xl border border-white/5">
             <button onClick={() => setViewMode('agenda')} className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${viewMode === 'agenda' ? 'bg-blue-600 text-white shadow-lg' : `${t.textMuted} hover:text-white`}`}>Agenda</button>
             <button onClick={() => setViewMode('mensal')} className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${viewMode === 'mensal' ? 'bg-blue-600 text-white shadow-lg' : `${t.textMuted} hover:text-white`}`}>Mensal</button>
          </div>
          <button onClick={onClose} className={`p-2.5 ${t.textMuted} hover:text-white hover:bg-white/10 rounded-full transition-all`}><XMarkIcon className="h-7 w-7" /></button>
        </div>

        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
              <div className="h-12 w-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
              <p className={`font-bold italic ${t.textSecondary} animate-pulse`}>Carregando Agenda...</p>
            </div>
          ) : viewMode === 'agenda' ? (
             agendamentos.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-full space-y-6 opacity-40"><CalendarDaysIcon className="h-24 w-24 text-blue-500" /><p className={`text-xl font-black italic ${t.textPrimary}`}>Sem agendamentos futuros</p></div>
             ) : (
               <div className="space-y-12">
                 {Object.keys(groups).map(day => (
                   <div key={day} className="space-y-6">
                     <span className={`text-[11px] font-black uppercase tracking-[0.5em] ${t.textPrimary} bg-white/5 px-4 py-1.5 rounded-full border border-white/5`}>{formatDate(groups[day][0].data_hora_inicio)}</span>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                       {groups[day].map((ag: any, idx: number) => {
                         const color = cardColors[idx % cardColors.length]
                         return (
                           <div key={ag.id} className={`p-6 rounded-[2rem] border transition-all hover:scale-[1.02] group ${t.cardBg} ${color.border} relative overflow-hidden shadow-lg`}>
                             <div className={`absolute top-0 left-0 h-full w-1.5 ${color.accent} opacity-40`} />
                             <div className="flex justify-between items-start">
                               <div className="flex items-center space-x-4">
                                 <div className={`h-12 w-12 rounded-2xl ${color.bg} flex flex-col items-center justify-center border ${color.border}`}><span className={`text-xs font-black ${color.text}`}>{formatTime(ag.data_hora_inicio).split(':')[0]}</span><span className={`text-[10px] font-bold ${color.text} opacity-50`}>{formatTime(ag.data_hora_inicio).split(':')[1]}</span></div>
                                 <div className="overflow-hidden"><h4 className={`text-sm font-black uppercase tracking-tight ${t.textPrimary} truncate`}>{ag.lead_name}</h4><p className={`text-[10px] ${t.textMuted} mt-1 font-medium truncate italic`}>{ag.imovel_nome || 'Consultar detalhes'}</p></div>
                               </div>
                               <MagnifyingGlassIcon className={`h-4 w-4 ${color.text} opacity-40`} />
                             </div>
                             {ag.observacoes && <div className="mt-4 p-3 bg-black/20 rounded-2xl text-[10px] italic text-white/50">"{ag.observacoes}"</div>}
                           </div>
                         )
                       })}
                     </div>
                   </div>
                 ))}
               </div>
             )
          ) : (
             <div className="h-full flex flex-col">
                <div className="flex items-center justify-between mb-8">
                   <h3 className={`text-2xl font-black italic uppercase tracking-tighter ${t.textPrimary}`}>{monthName}</h3>
                   <div className="flex space-x-2">
                       <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth()-1)))} className={`p-2 ${t.cardBg} rounded-xl border ${t.borderSub}`}><ArrowLeftIcon className="h-4 w-4 text-white" /></button>
                       <button onClick={() => setCurrentDate(new Date())} className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest ${t.cardBg} rounded-xl border ${t.borderSub} text-white`}>Hoje</button>
                       <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth()+1)))} className={`p-2 ${t.cardBg} rounded-xl border ${t.borderSub}`}><ArrowRightIcon className="h-4 w-4 text-white" /></button>
                   </div>
                </div>
                <div className="grid grid-cols-7 gap-2 flex-1">
                   {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (<div key={d} className={`text-center py-2 text-[9px] font-black uppercase tracking-widest ${t.textMuted} opacity-40`}>{d}</div>))}
                   {daysArr.map((day, i) => {
                      if (!day) return <div key={`empty-${i}`} className="rounded-3xl bg-white/[0.02] border border-transparent" />
                      const dateStr = day.toLocaleDateString('pt-BR')
                      const dayEvents = agendamentos.filter(ag => {
                        const d = new Date(ag.data_hora_inicio)
                        return isValidDate(d) && d.toLocaleDateString('pt-BR') === dateStr
                      })
                      const isToday = dateStr === new Date().toLocaleDateString('pt-BR')
                      return (
                         <div key={i} className={`min-h-[110px] p-2 rounded-2xl border transition-all ${isToday ? 'border-blue-500 bg-blue-500/5' : `${t.cardBg} ${t.borderSub}`} hover:border-blue-500/30 flex flex-col group`}>
                            <span className={`text-[10px] font-black ${isToday ? 'text-blue-500' : t.textMuted} mb-1.5 ml-1`}>{day.getDate()}</span>
                            <div className="space-y-1 flex-1 overflow-y-auto no-scrollbar">
                               {dayEvents.map((ev, idx) => {
                                  const c = cardColors[idx % 5]
                                  return (
                                    <button 
                                      key={ev.id} 
                                      onClick={() => setSelectedAgendamento(ev)}
                                      className={`w-full text-left px-2 py-1.5 rounded-xl ${c.bg} border ${c.border} hover:scale-[1.02] transition-all flex flex-col items-start gap-0.5 group/ev overflow-hidden`}
                                    >
                                       <div className="flex items-center justify-between w-full">
                                          <span className={`text-[7px] font-black ${c.text} opacity-70`}>{formatTime(ev.data_hora_inicio)}</span>
                                          <div className={`h-1 w-1 rounded-full ${c.accent} animate-pulse`} />
                                       </div>
                                       <p className={`text-[9px] font-black ${t.textPrimary} truncate w-full leading-none mb-0.5`}>{ev.lead_nome}</p>
                                       <p className={`text-[7px] font-bold ${c.text} opacity-60 truncate w-full italic`}>{ev.imovel_nome || 'Objeto de interesse'}</p>
                                    </button>
                                  )
                               })}
                            </div>
                         </div>
                      )
                   })}
                </div>
             </div>
          )}
        </div>

        {/* Modal Interno de Detalhes do Compromisso */}
        {selectedAgendamento && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className={`${t.modalBg} w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl border border-white/10 animate-in zoom-in-95`}>
               <div className="flex justify-between items-start mb-8">
                  <div className="flex items-center space-x-3">
                     <div className="h-12 w-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg">
                        <UserCircleIcon className="h-7 w-7 text-white" />
                     </div>
                     <div>
                        <h3 className={`text-lg font-black italic tracking-tight ${t.textPrimary}`}>{selectedAgendamento.lead_nome}</h3>
                        <p className={`text-[10px] font-black uppercase tracking-widest text-emerald-400`}>Agendamento Confirmado</p>
                     </div>
                  </div>
                  <button onClick={() => setSelectedAgendamento(null)} className={`p-2 ${t.textMuted} hover:text-white rounded-full transition-all`}><XMarkIcon className="h-6 w-6" /></button>
               </div>

               <div className="space-y-6">
                  <div className={`p-5 rounded-3xl bg-white/5 border border-white/5`}>
                     <p className={`text-[9px] font-black uppercase tracking-widest ${t.textMuted} mb-3`}>Cronograma & Local</p>
                     <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                           <CalendarIcon className="h-5 w-5 text-blue-500" />
                           <span className={`text-sm font-bold ${t.textPrimary}`}>
                              {(() => {
                                 const d = new Date(selectedAgendamento.data_hora_inicio)
                                 return isValidDate(d) ? d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }) : 'Data Indefinida'
                              })()}
                           </span>
                        </div>
                        <div className={`px-3 py-1 rounded-lg bg-blue-600/20 border border-blue-500/20 text-xs font-black text-blue-400`}>
                           {formatTime(selectedAgendamento.data_hora_inicio)}
                        </div>
                     </div>
                     <div className="flex items-center space-x-3 py-3 border-t border-white/5">
                        <MapPinIcon className="h-5 w-5 text-rose-500" />
                        <span className={`text-xs font-medium ${t.textSecondary}`}>{selectedAgendamento.imovel_nome || 'Detalhes sob consulta'}</span>
                     </div>
                  </div>

                  {selectedAgendamento.observacoes && (
                     <div className={`p-5 rounded-3xl bg-amber-500/5 border border-amber-500/10`}>
                        <p className={`text-[9px] font-black uppercase tracking-widest text-amber-400/60 mb-2`}>Observações do Consultor</p>
                        <p className={`text-xs italic leading-relaxed text-amber-200/80`}>"{selectedAgendamento.observacoes}"</p>
                     </div>
                  )}
               </div>

               <div className="mt-10 flex gap-3">
                  <button className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border border-white/5 flex items-center justify-center">
                     <ChatBubbleLeftRightIcon className="h-4 w-4 mr-2" /> Contato
                  </button>
                  <button onClick={() => setSelectedAgendamento(null)} className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg active:scale-95">
                     Entendido
                  </button>
               </div>
            </div>
          </div>
        )}

        <div className={`p-8 border-t ${t.borderSub} bg-black/30 flex justify-between items-center`}>
          <div className="flex items-center space-x-6">
             <div className="flex items-center space-x-2 text-[10px] font-bold text-emerald-400/60 uppercase tracking-tight"><div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /><span>Live Sync: Ativo</span></div>
             <p className="text-[10px] font-black text-white/20 italic uppercase tracking-widest">Google Calendar Engine 2.0</p>
          </div>
          <div className="flex space-x-4">
            <button onClick={onClose} className={`px-8 py-3 text-xs font-bold uppercase tracking-widest ${t.textMuted} hover:text-white transition-all`}>Fechar</button>
            <button onClick={onNovoAgendamento} className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black rounded-2xl transition-all shadow-xl shadow-blue-500/20 uppercase active:scale-95 flex items-center"><PlusIcon className="h-4 w-4 mr-2" />Novo Agendamento</button>
          </div>
        </div>
      </div>
    </div>
  )
}

