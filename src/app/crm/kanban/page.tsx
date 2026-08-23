'use client'

import React, { useState, useEffect, useMemo } from 'react'
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
  TrashIcon
} from '@heroicons/react/24/outline'
import { adminFetch } from '@/lib/auth/adminFetch'
import DateInputPtBR from '@/components/ui/DateInputPtBR'
import EnrichedLeadData from '@/components/crm/EnrichedLeadData'
import NovoLeadModal from '@/components/crm/NovoLeadModal'
import AgendarVisitaModal from '@/components/crm/AgendarVisitaModal'
import AgendamentosLead from '@/components/crm/AgendamentosLead'
import AtividadesLead from '@/components/crm/AtividadesLead'
import NextBestActionCard from '@/components/crm/NextBestActionCard'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'

interface Lead {
  lead_uuid: string; nome: string; email: string; telefone?: string;
  tag_sonho: string; resumo_ia?: string; coluna_nome: string;
  score_prontidao: number;
  /** Encaixe no perfil ideal de cliente (docs/PLANO_AGENTES_ACELERACAO_CRM.md §3.1) —
   *  dimensão separada de score_prontidao (intenção). null = ainda não avaliado. */
  score_fit?: number | null;
  imovel_id?: number | null;
  enriquecimento_cache?: any; created_at?: string; match?: string;
  client_id?: string | null; atividades_count?: number;
  /** valor_venda = REAL, só existe depois do fechamento. valor_venda_estimado = palpite de
   *  quem está atendendo, nunca confundido com o real — sempre rotulados de forma distinta na
   *  UI (docs/CHECKPOINT.md, 2026-08-13). */
  valor_venda?: number | null;
  valor_venda_estimado?: number | null;
  corretor_atribuido_id?: string | null;
  corretor_nome?: string | null;
  corretor_tem_foto?: boolean;
  deleted_at?: string | null;
}
interface Coluna { id: number; nome: string; titulo_exibicao: string; cor: string; icone: string; is_ganho?: boolean; is_perda?: boolean; requer_valor_estimado?: boolean; }

const formatPhone = (phone?: string) => {
  if (!phone) return 'S/ Telefone'
  const c = phone.replace(/\D/g, '')
  if (c.length === 11) return `(${c.slice(0,2)}) ${c.slice(2,7)}-${c.slice(7)}`
  return phone
}

export default function KanbanPage() {
  const t = useTheme()
  const [colunas, setColunas] = useState<Coluna[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [movingLead, setMovingLead] = useState(false)
  const [isNovoLeadOpen, setIsNovoLeadOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [isAgendarOpen, setIsAgendarOpen] = useState(false)
  const [agendamentosVersion, setAgendamentosVersion] = useState(0)
  const [isCalendarioViewOpen, setIsCalendarioViewOpen] = useState(false)
  const [tenantConfig, setTenantConfig] = useState<any>(null)
  // F3 — "Registrar como Atividade" no card "Sugestão da IA" pré-preenche o form de
  // Nova Atividade (AtividadesLead.tsx); nonce garante reabrir o form mesmo se o
  // atendente clicar 2x seguidas na mesma sugestão.
  const [activityPrefill, setActivityPrefill] = useState<{ text: string; nonce: number } | undefined>(undefined)
  const handleUseSuggestionAsActivity = (text: string) => setActivityPrefill({ text, nonce: Date.now() })
  // Achado real (roteiro de testes, 2026-08-09): mover um lead pra uma etapa de Ganho nunca
  // teve como registrar quanto valeu o negócio — nenhuma UI escrevia valor_venda depois da
  // criação do lead. Intercepta o move quando a coluna destino é is_ganho e pede o valor antes
  // de confirmar; qualquer outra coluna (inclusive is_perda) move direto, sem prompt.
  const [pendingGanhoMove, setPendingGanhoMove] = useState<{ lead: Lead; targetCol: Coluna; revert?: string } | null>(null)
  const [valorVendaInput, setValorVendaInput] = useState('')
  // Valor Estimado (2026-08-13) — mesmo mecanismo do Ganho, generalizado: qualquer coluna
  // marcada requer_valor_estimado intercepta o move se o lead ainda não tem estimativa. Nunca
  // pergunta de novo se já existe uma (o atendente edita na ficha se quiser atualizar).
  const [pendingEstimativaMove, setPendingEstimativaMove] = useState<{ lead: Lead; targetCol: Coluna } | null>(null)
  const [valorEstimadoInput, setValorEstimadoInput] = useState('')
  // Exclusão de lead (docs/CHECKPOINT.md, 2026-08-14) — filtro "Mostrar leads excluídos" e
  // estado de exclusão/restauração em andamento (desabilita os botões enquanto processa).
  const [showDeleted, setShowDeleted] = useState(false)
  const [deletingLead, setDeletingLead] = useState(false)
  // Filtros de dono do lead + período de criação (pedido do usuário, 2026-08-16) — client-side,
  // mesmo padrão do searchTerm: filtram o board sobre os leads já carregados, sem round-trip
  // novo. '__none__' é o sentinela pra "sem dono atribuído".
  const [filterOwnerId, setFilterOwnerId] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')

  const getInitials = (name: string) => {
    if (!name) return 'LD'
    const parts = name.trim().split(' ')
    return parts.length > 1 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : name.substring(0, 2).toUpperCase()
  }

  const { user } = useAuth()
  const tenantId = user?.currentTenant?.id
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null

  useEffect(() => {
    fetchData()
    fetchTenantConfig()

    // Se detectar sucesso no Google Auth, limpa URL e refaz fetch
    if (searchParams?.get('google_auth') === 'success') {
      console.log('🔄 [CRM] Google Auth detectado com sucesso. Atualizando configurações...')
      fetchTenantConfig()
      const newUrl = window.location.pathname
      window.history.replaceState({}, '', newUrl)
    }
  }, [searchParams?.get('google_auth'), showDeleted])

  const fetchTenantConfig = async () => {
    try {
      const token = localStorage.getItem('admin-auth-token')
      const res = await fetch(`/api/crm/config/tenant?tenantId=${tenantId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      const data = await res.json()
      console.log('📡 [CRM] Configuração do Tenant recebida:', { data, tenantId })
      if (data.success) setTenantConfig(data.config)
    } catch (err) {
      console.error('❌ [CRM] Erro ao carregar config do tenant:', err)
    }
  }

  const fetchData = async () => {
    try {
      const leadsUrl = `/api/crm/leads${showDeleted ? '?includeDeleted=1' : ''}`
      const [colsRes, leadsRes] = await Promise.all([adminFetch('/api/crm/kanban/colunas'), adminFetch(leadsUrl)])
      const [colsData, leadsData] = await Promise.all([colsRes.json(), leadsRes.json()])
      if (colsData.success) setColunas(colsData.colunas)
      if (leadsData.success) setLeads(leadsData.leads)
    } finally { setLoading(false) }
  }

  const getNextColumn = (currentColName: string) => {
    const idx = colunas.findIndex(c => c.nome === currentColName)
    return idx >= 0 && idx < colunas.length - 1 ? colunas[idx + 1] : null
  }
  const getPrevColumn = (currentColName: string) => {
    const idx = colunas.findIndex(c => c.nome === currentColName)
    return idx > 0 ? colunas[idx - 1] : null
  }

  // Move de verdade — sempre passa por aqui, seja pelo botão de avançar/voltar ou pelo
  // drag-and-drop. valorVenda só é enviado quando a coluna é is_ganho e o atendente já
  // confirmou o modal (requestMove/confirmGanhoMove abaixo).
  const executeMove = async (lead: Lead, targetCol: Coluna, valorVenda?: number, valorEstimado?: number) => {
    setMovingLead(true)
    const oldColumnName = lead.coluna_nome
    setLeads(prev => prev.map(l => l.lead_uuid === lead.lead_uuid ? { ...l, coluna_nome: targetCol.nome, ...(valorVenda !== undefined ? { valor_venda: valorVenda } : {}), ...(valorEstimado !== undefined ? { valor_venda_estimado: valorEstimado } : {}) } : l))
    setSelectedLead(prev => prev && prev.lead_uuid === lead.lead_uuid ? { ...prev, coluna_nome: targetCol.nome, ...(valorVenda !== undefined ? { valor_venda: valorVenda } : {}), ...(valorEstimado !== undefined ? { valor_venda_estimado: valorEstimado } : {}) } : prev)
    try {
      const res = await adminFetch('/api/crm/kanban/move', {
        method: 'POST',
        body: JSON.stringify({
          lead_uuid: lead.lead_uuid,
          coluna_id: targetCol.id,
          ...(valorVenda !== undefined ? { valor_venda: valorVenda } : {}),
          ...(valorEstimado !== undefined ? { valor_venda_estimado: valorEstimado } : {}),
        })
      })
      const data = await res.json()
      if (!data.success) {
        setLeads(prev => prev.map(l => l.lead_uuid === lead.lead_uuid ? { ...l, coluna_nome: oldColumnName } : l))
        setSelectedLead(prev => prev && prev.lead_uuid === lead.lead_uuid ? { ...prev, coluna_nome: oldColumnName } : prev)
      }
    } catch {
      setLeads(prev => prev.map(l => l.lead_uuid === lead.lead_uuid ? { ...l, coluna_nome: oldColumnName } : l))
      setSelectedLead(prev => prev && prev.lead_uuid === lead.lead_uuid ? { ...prev, coluna_nome: oldColumnName } : prev)
    } finally { setMovingLead(false) }
  }

  // Ponto único de decisão: coluna de Ganho pede o valor REAL da venda; coluna marcada
  // requer_valor_estimado (e o lead ainda sem estimativa) pede o valor ESTIMADO; qualquer
  // outra move direto, sem prompt.
  const requestMove = (lead: Lead, targetCol: Coluna) => {
    if (targetCol.is_ganho) {
      setValorVendaInput('')
      setPendingGanhoMove({ lead, targetCol })
      return
    }
    if (targetCol.requer_valor_estimado && (lead.valor_venda_estimado === null || lead.valor_venda_estimado === undefined)) {
      setValorEstimadoInput('')
      setPendingEstimativaMove({ lead, targetCol })
      return
    }
    executeMove(lead, targetCol)
  }

  const confirmGanhoMove = () => {
    if (!pendingGanhoMove) return
    const digits = valorVendaInput.replace(/\D/g, '')
    const valor = digits ? parseInt(digits, 10) / 100 : 0
    executeMove(pendingGanhoMove.lead, pendingGanhoMove.targetCol, valor)
    setPendingGanhoMove(null)
  }

  const confirmEstimativaMove = () => {
    if (!pendingEstimativaMove) return
    const digits = valorEstimadoInput.replace(/\D/g, '')
    const valor = digits ? parseInt(digits, 10) / 100 : 0
    executeMove(pendingEstimativaMove.lead, pendingEstimativaMove.targetCol, undefined, valor)
    setPendingEstimativaMove(null)
  }

  const moveLead = (lead: Lead, direction: 'forward' | 'backward' = 'forward') => {
    const targetCol = direction === 'forward' ? getNextColumn(lead.coluna_nome) : getPrevColumn(lead.coluna_nome)
    if (!targetCol) return
    requestMove(lead, targetCol)
  }

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

  const hasActiveFilters = !!(searchTerm || filterOwnerId || filterDateFrom || filterDateTo)
  const clearFilters = () => {
    setSearchTerm('')
    setFilterOwnerId('')
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
    if (filterDateFrom || filterDateTo) {
      const leadDate = localDateIso(l.created_at)
      if (!leadDate) return false
      if (filterDateFrom && leadDate < filterDateFrom) return false
      if (filterDateTo && leadDate > filterDateTo) return false
    }
    return true
  })

  // Exclusão de lead (docs/CHECKPOINT.md, 2026-08-14) — regra decidida pelo usuário: sem
  // atividade registrada, o servidor exclui de vez; com atividade, exclui de forma reversível
  // (lixeira) e devolve mode:'soft'|'hard' pra sabermos qual mensagem mostrar.
  const handleDeleteLead = async (lead: Lead) => {
    if (!confirm(
      'Excluir este lead?\n\n' +
      'Leads SEM nenhuma atividade registrada são removidos permanentemente.\n' +
      'Leads COM atividades vão pra lixeira e podem ser restaurados depois.'
    )) return
    setDeletingLead(true)
    try {
      const res = await adminFetch(`/api/crm/leads/${lead.lead_uuid}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        alert(data.message)
        setSelectedLead(null)
        fetchData()
      } else {
        alert(data.error || 'Erro ao excluir lead.')
      }
    } finally {
      setDeletingLead(false)
    }
  }

  const handleRestoreLead = async (lead: Lead) => {
    setDeletingLead(true)
    try {
      const res = await adminFetch(`/api/crm/leads/${lead.lead_uuid}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'restore' }),
      })
      const data = await res.json()
      if (data.success) {
        setSelectedLead(null)
        fetchData()
      } else {
        alert(data.error || 'Erro ao restaurar lead.')
      }
    } finally {
      setDeletingLead(false)
    }
  }

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
    requestMove(lead, targetCol)
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Toolbar Premium */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 ${t.isDark ? t.cardBg : 'bg-white/80 backdrop-blur-xl border border-slate-200/60 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)]'} p-4 rounded-[2rem]`}>
        <div className="relative flex-1 max-w-xl">
          <MagnifyingGlassIcon className={`absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 ${t.isDark ? t.textMuted : 'text-slate-400'}`} />
          <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar lead por Nome, E-mail, Tag ou Bairro..."
            className={`w-full rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium ${t.isDark ? t.inputBg : 'bg-slate-50 hover:bg-slate-100/50 focus:bg-white text-slate-700 border border-transparent focus:border-blue-200'}`} />
        </div>
        <div className="flex items-center space-x-3">
          {tenantConfig?.calendario && (
            <button onClick={() => setIsCalendarioViewOpen(true)}
              className={`flex items-center px-5 py-2.5 ${t.isDark ? t.cardBg : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-blue-50/50'} ${t.isDark ? t.textPrimary : 'text-slate-700'} hover:text-blue-600 text-sm font-bold rounded-2xl transition-all border shadow-sm active:scale-95`}>
              <CalendarDaysIcon className="h-4 w-4 mr-2 text-blue-500" />Calendário
            </button>
          )}
          <a href="/crm/config/kanban" className={`p-3 ${t.isDark ? t.textMuted : 'text-slate-400'} hover:text-blue-500 ${t.isDark ? t.cardBg : 'bg-white border-slate-200'} rounded-2xl transition-all border shadow-sm`} title="Configurar Funil">
            <ListBulletIcon className="h-5 w-5" />
          </a>
          <a href="/crm/config/atividades" className={`p-3 ${t.isDark ? t.textMuted : 'text-slate-400'} hover:text-blue-500 ${t.isDark ? t.cardBg : 'bg-white border-slate-200'} rounded-2xl transition-all border shadow-sm`} title="Configurar Tipos de Atividade">
            <PencilSquareIcon className="h-5 w-5" />
          </a>
          {/* Filtro "Mostrar leads excluídos" (docs/CHECKPOINT.md, 2026-08-14) — leads
              soft-deletados (com atividade registrada) só aparecem no board com isso ativo. */}
          <button
            onClick={() => setShowDeleted(v => !v)}
            title={showDeleted ? 'Ocultar leads excluídos' : 'Mostrar leads excluídos'}
            className={`p-3 rounded-2xl transition-all border shadow-sm ${
              showDeleted
                ? 'bg-red-500 text-white border-red-500'
                : `${t.isDark ? t.textMuted + ' ' + t.cardBg : 'text-slate-400 bg-white border-slate-200'} hover:text-red-500`
            }`}
          >
            <TrashIcon className="h-5 w-5" />
          </button>
          <button onClick={() => setIsNovoLeadOpen(true)}
            className="flex items-center px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-bold rounded-2xl transition-all shadow-[0_8px_20px_-6px_rgba(37,99,235,0.4)] active:scale-95 border border-white/10">
            <PlusIcon className="h-5 w-5 mr-2" />Novo Lead
          </button>
        </div>
      </div>

      {/* Filtros de Dono do Lead + Período de Criação (pedido do usuário, 2026-08-16) */}
      <div className={`flex flex-wrap items-center gap-3 ${t.isDark ? t.cardBg : 'bg-white/80 backdrop-blur-xl border border-slate-200/60 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)]'} p-4 rounded-[2rem]`}>
        <div className="flex items-center gap-2">
          <UserCircleIcon className={`h-5 w-5 ${t.isDark ? t.textMuted : 'text-slate-400'}`} />
          <select
            value={filterOwnerId}
            onChange={e => setFilterOwnerId(e.target.value)}
            className={`rounded-2xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium ${t.isDark ? t.inputBg : 'bg-slate-50 hover:bg-slate-100/50 focus:bg-white text-slate-700 border border-transparent focus:border-blue-200'}`}
          >
            <option value="">Todos os donos</option>
            {ownerOptions.owners.map(o => (
              <option key={o.id} value={o.id}>{o.nome}</option>
            ))}
            {ownerOptions.hasUnassigned && <option value="__none__">Sem dono atribuído</option>}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <CalendarDaysIcon className={`h-5 w-5 ${t.isDark ? t.textMuted : 'text-slate-400'}`} />
          <span className={`text-xs font-bold uppercase tracking-wide ${t.isDark ? t.textMuted : 'text-slate-400'}`}>De</span>
          <div className="w-32">
            <DateInputPtBR
              value={filterDateFrom}
              onChange={setFilterDateFrom}
              className={`w-full rounded-2xl py-2.5 pl-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium ${t.isDark ? t.inputBg : 'bg-slate-50 hover:bg-slate-100/50 focus:bg-white text-slate-700 border border-transparent focus:border-blue-200'}`}
            />
          </div>
          <span className={`text-xs font-bold uppercase tracking-wide ${t.isDark ? t.textMuted : 'text-slate-400'}`}>Até</span>
          <div className="w-32">
            <DateInputPtBR
              value={filterDateTo}
              onChange={setFilterDateTo}
              className={`w-full rounded-2xl py-2.5 pl-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium ${t.isDark ? t.inputBg : 'bg-slate-50 hover:bg-slate-100/50 focus:bg-white text-slate-700 border border-transparent focus:border-blue-200'}`}
            />
          </div>
        </div>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className={`flex items-center gap-1 px-3 py-2 text-xs font-bold rounded-xl transition-all ${t.isDark ? 'text-red-400 hover:bg-red-500/10' : 'text-red-500 hover:bg-red-50'}`}
          >
            <XMarkIcon className="h-4 w-4" />Limpar filtros
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-20 text-blue-500 font-bold italic animate-pulse">Sincronizando Inteligência...</div>
      ) : (
        <div className="flex space-x-6 overflow-x-auto pb-8 pt-4 custom-scrollbar">
          {colunas.map(col => (
            <div key={col.id} className="flex-shrink-0 w-[340px] flex flex-col space-y-4">
              {/* Header da Coluna */}
              <div className={`px-5 py-3.5 rounded-2xl border flex items-center justify-between transition-colors`}
                style={{ backgroundColor: `${col.cor}${t.isDark ? '15' : '10'}`, borderColor: `${col.cor}${t.isDark ? '30' : '40'}`, color: t.isDark ? col.cor : '#1e293b' }}>
                <div className="flex items-center space-x-3">
                  <div className="h-2 w-2 rounded-full shadow-sm" style={{ backgroundColor: col.cor, boxShadow: `0 0 0 2px ${col.cor}40` }} />
                  <span className={`text-[11px] font-black uppercase tracking-[0.08em] ${t.isDark ? '' : 'text-slate-700'}`}>{col.titulo_exibicao}</span>
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
                </div>
                <EllipsisHorizontalIcon className="h-5 w-5 cursor-pointer opacity-50 hover:opacity-100 transition-opacity" style={{ color: t.isDark ? col.cor : '#64748b' }} />
              </div>

              {/* Área de Cards (Lanes) */}
              <div className={`flex-1 space-y-4 min-h-[500px] p-2.5 rounded-3xl border-2 border-dashed transition-all`}
                   onDragOver={handleDragOver}
                   onDrop={(e) => handleDrop(e, col)}
                   style={{ backgroundColor: t.isDark ? 'rgba(255,255,255,0.02)' : `${col.cor}06`, borderColor: t.isDark ? 'rgba(255,255,255,0.05)' : `${col.cor}25` }}>
                {filterLeads(col).map(lead => (
                  <div key={lead.lead_uuid} onClick={() => setSelectedLead(lead)}
                    draggable={!lead.deleted_at}
                    onDragStart={(e) => handleDragStart(e, lead)}
                    className={`group relative p-4 rounded-2xl transition-all duration-300 cursor-pointer border hover:-translate-y-0.5 ${
                      t.isDark
                        ? `${t.cardBgSolid} hover:border-blue-500/50 shadow-md`
                        : 'bg-white hover:shadow-lg'
                    } ${lead.deleted_at ? 'opacity-50 grayscale-[30%]' : ''}`}
                    style={{
                      borderColor: t.isDark ? 'transparent' : `${col.cor}30`,
                      boxShadow: t.isDark ? undefined : `0 4px 16px -4px ${col.cor}20`,
                    }}>
                    {lead.deleted_at && (
                      <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest bg-red-500 text-white z-10">
                        <TrashIcon className="h-3 w-3" />Excluído
                      </div>
                    )}

                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center space-x-3.5">
                        <div
                          className="flex flex-col items-center gap-1 shrink-0"
                          title={lead.corretor_nome ? `Responsável: ${lead.corretor_nome}` : 'Sem responsável atribuído'}
                        >
                          <div
                            className={`h-9 w-9 rounded-lg overflow-hidden flex items-center justify-center shrink-0 ${t.isDark ? 'bg-white/5' : 'bg-slate-50 border border-slate-100'} group-hover:bg-blue-50 transition-colors`}
                          >
                            {lead.corretor_atribuido_id && lead.corretor_tem_foto ? (
                              <img
                                src={`/api/admin/usuarios/${lead.corretor_atribuido_id}/foto`}
                                alt={lead.corretor_nome || 'Responsável'}
                                className="h-9 w-9 object-cover"
                              />
                            ) : lead.corretor_nome ? (
                              <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center text-[10px] font-black text-white">
                                {getInitials(lead.corretor_nome)}
                              </div>
                            ) : (
                              <UserCircleIcon className={`h-6 w-6 ${t.isDark ? t.textMuted : 'text-slate-400'} group-hover:text-blue-500 transition-colors`} />
                            )}
                          </div>
                          {/* Nome do dono do lead — antes só existia no hover (title), agora
                              sempre visível como legenda curta abaixo do avatar. */}
                          {lead.corretor_nome && (
                            <span className={`text-[9px] font-bold leading-none text-center max-w-[52px] truncate ${t.isDark ? t.textMuted : 'text-slate-400'}`}>
                              {lead.corretor_nome.split(' ')[0]}
                            </span>
                          )}
                        </div>
                        <div>
                          <div className={`text-sm font-black leading-tight tracking-tight ${t.isDark ? t.textPrimary : 'text-slate-800'}`}>{lead.nome || 'Lead s/ Nome'}</div>
                          <div className={`text-[11px] font-bold mt-0.5 ${t.isDark ? t.textMuted : 'text-slate-500'}`}>{lead.telefone || lead.email || 'Sem contato'}</div>
                        </div>
                      </div>
                      <div className={`text-[11px] font-black px-2 py-0.5 rounded-md border ${
                        t.isDark ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' : 'text-blue-700 bg-blue-50 border-blue-200 shadow-sm'
                      }`}>
                        {lead.score_prontidao || 0}% Match
                        {lead.score_fit != null && ` · ${lead.score_fit}% Fit`}
                      </div>
                    </div>

                    {(lead.valor_venda_estimado != null || lead.valor_venda != null) && (
                      <div className="flex items-center gap-1.5 -mt-1 mb-2">
                        {lead.valor_venda != null && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lead.valor_venda)}
                          </span>
                        )}
                        {lead.valor_venda == null && lead.valor_venda_estimado != null && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-500/10 text-amber-500 border border-amber-500/20">
                            ~{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lead.valor_venda_estimado)} est.
                          </span>
                        )}
                      </div>
                    )}

                    <div className="mb-4 mt-3">
                      {lead.enriquecimento_cache ? (
                        <div className={`px-3 py-2.5 rounded-xl ${t.isDark ? 'bg-black/20 border border-white/5' : 'bg-gradient-to-br from-blue-50/50 to-indigo-50/30 border border-blue-100/50'}`}>
                          <EnrichedLeadData cache={lead.enriquecimento_cache} />
                        </div>
                      ) : lead.imovel_id ? (
                        <div className={`flex items-center text-[11px] font-bold border-b pb-2 ${t.isDark ? t.textSecondary + ' ' + t.borderSub : 'text-slate-600 border-slate-100'}`}>
                          <CheckBadgeIcon className="h-4 w-4 mr-2 text-indigo-500" />
                          <span>Ref: #{lead.imovel_id}</span>
                        </div>
                      ) : (
                        <div className={`flex items-center text-[11px] font-bold border-b pb-2 ${t.isDark ? t.borderSub : 'border-slate-100'} text-emerald-600`}>
                          <MapPinIcon className="h-4 w-4 mr-2" />
                          <span>Interesse Regional</span>
                        </div>
                      )}
                    </div>

                    <div className={`flex items-center justify-between pt-3 border-t ${t.isDark ? t.borderSub : 'border-slate-100/80'}`}>
                      <div className="flex items-center space-x-2">
                        <div className="h-7 w-7 rounded-lg bg-blue-600 flex items-center justify-center text-[10px] font-black text-white shadow-sm">
                          {getInitials(lead.nome)}
                        </div>
                        {lead.created_at && (
                          <span className={`text-[10px] font-bold uppercase tracking-widest ${t.isDark ? t.textMuted : 'text-slate-400'}`}>
                            {new Date(lead.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                          </span>
                        )}
                        {!!lead.atividades_count && (
                          <span className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md ${t.isDark ? 'bg-white/5 text-white/50' : 'bg-slate-100 text-slate-500'}`} title={`${lead.atividades_count} atividade(s) registrada(s)`}>
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
                              setSelectedLead(lead);
                              setIsAgendarOpen(true);
                            }}
                            className={`p-1.5 rounded-lg border transition-all z-10 ${
                              t.isDark 
                                ? 'border-blue-500/50 bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white' 
                                : 'border-blue-200 bg-white shadow-sm text-blue-600 hover:bg-blue-50 hover:border-blue-300'
                            }`}
                            title="Agendar Visita"
                          >
                            <CalendarDaysIcon className="h-4 w-4" />
                          </button>
                        )}
                        <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-md border tracking-widest shadow-sm ${
                          t.isDark 
                            ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' 
                            : 'text-indigo-700 bg-indigo-50 border-indigo-200/60'
                        }`}>
                          {lead.tag_sonho || 'TBD'}
                        </span>
                      </div>
                    </div>

                    <div className="absolute -top-2.5 -right-2">
                      <div className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full shadow-sm flex items-center border ${
                        t.isDark 
                          ? 'bg-blue-600 text-white border-blue-500' 
                          : 'bg-white text-blue-600 border-blue-200 ring-4 ring-white'
                      }`}>
                        <SparklesIcon className={`h-2.5 w-2.5 mr-1 ${t.isDark ? 'text-blue-200' : 'text-blue-500'}`} />
                        {lead.tag_sonho || 'NOVO'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Ficha */}
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
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
              {/* Pipeline/Progresso Compacta */}
              <div className="flex items-center space-x-2 overflow-x-auto pb-4 no-scrollbar border-b border-dashed border-white/5">
                {colunas.map((col, idx) => {
                  const isActive = selectedLead.coluna_nome === col.nome
                  const isPast = colunas.findIndex(c => c.nome === selectedLead.coluna_nome) > idx
                  return (
                    <div key={col.id} className="flex items-center flex-shrink-0">
                      <div className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${
                        isActive ? 'text-white border-blue-500/40 bg-blue-600/40' :
                        isPast ? 'text-emerald-500 border-emerald-500/20 bg-emerald-500/10' :
                        `${t.textMuted} ${t.borderSub} ${t.isDark ? 'bg-white/[0.02]' : 'bg-gray-100'}`
                      }`}>{col.titulo_exibicao}</div>
                      {idx < colunas.length - 1 && <div className={`w-3 h-px mx-1 ${isPast ? 'bg-emerald-500/40' : t.isDark ? 'bg-white/10' : 'bg-gray-200'}`} />}
                    </div>
                  )
                })}
              </div>

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
                    <SparklesIcon className="h-3 w-3" /><span>Análise Concierge IA</span>
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

                    <div className="grid grid-cols-2 gap-3 mt-4">
                      {/* Intenção (score_prontidao) e Fit (score_fit) — 2 dimensões SEPARADAS,
                          nunca combinadas num 3º número sintético (docs/
                          PLANO_AGENTES_ACELERACAO_CRM.md §3.1). O tile "IPVE" antigo aqui era
                          um valor fabricado (score_prontidao + 15, sem nenhum dado real por
                          trás) — substituído pelo Fit real. */}
                      {[['Intenção', `${selectedLead.score_prontidao}%`], ['Fit', selectedLead.score_fit != null ? `${selectedLead.score_fit}%` : '—']].map(([label, val]) => (
                        <div key={label} className={`p-3 ${t.cardInner} rounded-xl border ${t.borderSub}`}>
                          <p className={`text-[9px] font-bold uppercase tracking-widest mb-1 ${t.textMuted}`}>{label}</p>
                          <span className={`text-lg font-bold ${t.textPrimary}`}>{val}</span>
                        </div>
                      ))}
                    </div>

                    {/* Valor Fechado (REAL, só existe no negócio ganho) e Valor Potencial
                        (ESTIMADO, palpite editável durante o pipeline) — nunca no mesmo tile,
                        nunca a mesma cor (docs/CHECKPOINT.md, 2026-08-13). */}
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

              {/* Histórico de Visitas Compacto */}
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
              {/* Exclusão/restauração (docs/CHECKPOINT.md, 2026-08-14) — só na Ficha, nunca no
                  card do Kanban, pra evitar exclusão acidental por clique rápido demais. */}
              {selectedLead.deleted_at ? (
                <button onClick={() => handleRestoreLead(selectedLead)} disabled={deletingLead}
                  className="flex items-center px-5 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all uppercase active:scale-95">
                  <ArrowUturnLeftIcon className="h-4 w-4 mr-2" />
                  {deletingLead ? 'Restaurando...' : 'Restaurar Lead'}
                </button>
              ) : (
                <button onClick={() => handleDeleteLead(selectedLead)} disabled={deletingLead}
                  className="flex items-center px-5 py-3 text-red-500 hover:bg-red-500/10 disabled:opacity-50 text-xs font-bold rounded-xl transition-all uppercase active:scale-95 border border-red-500/20">
                  <TrashIcon className="h-4 w-4 mr-2" />
                  {deletingLead ? 'Excluindo...' : 'Excluir Lead'}
                </button>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <button onClick={() => setSelectedLead(null)} className={`px-6 py-3 text-xs font-bold uppercase tracking-widest ${t.textMuted} hover:text-blue-500 transition-all`}>Fechar</button>
                {!selectedLead.deleted_at && tenantConfig?.calendario && (
                  <button
                    onClick={() => setIsAgendarOpen(true)}
                    className="flex items-center px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all uppercase active:scale-95 shadow-lg shadow-indigo-500/20"
                  >
                    <CalendarDaysIcon className="h-4 w-4 mr-2" />
                    Agendar Visita
                  </button>
                )}
                {!selectedLead.deleted_at && getPrevColumn(selectedLead.coluna_nome) && (
                  <button onClick={() => moveLead(selectedLead, 'backward')} disabled={movingLead}
                    className={`flex items-center px-6 py-3 ${t.cardBg} disabled:opacity-50 ${t.textSecondary} text-xs font-bold rounded-xl transition-all uppercase active:scale-95`}>
                    <ArrowUturnLeftIcon className="h-4 w-4 mr-2" />
                    {movingLead ? 'Movendo...' : 'Recuar Etapa'}
                  </button>
                )}
                {selectedLead.deleted_at ? null : getNextColumn(selectedLead.coluna_nome) ? (
                  <button onClick={() => moveLead(selectedLead, 'forward')} disabled={movingLead}
                    className="flex items-center px-8 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-500 text-white text-xs font-bold rounded-xl transition-all uppercase active:scale-95">
                    <CheckBadgeIcon className="h-4 w-4 mr-2" />
                    {movingLead ? 'Movendo...' : `Avançar → ${getNextColumn(selectedLead.coluna_nome)?.titulo_exibicao}`}
                  </button>
                ) : (
                  <div className="flex items-center px-6 py-3 text-xs font-bold text-emerald-500 uppercase">
                    <CheckBadgeIcon className="h-4 w-4 mr-2" />Pipeline Concluída
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <NovoLeadModal isOpen={isNovoLeadOpen} onClose={() => setIsNovoLeadOpen(false)} onSuccess={fetchData} />

      {/* Modal "Valor da Venda" — sempre que um lead entra numa etapa de Ganho */}
      {pendingGanhoMove && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className={`${t.modalBg} w-full max-w-sm rounded-[2rem] p-7 shadow-2xl border border-white/10 animate-in zoom-in-95`}>
            <div className="flex items-center space-x-3 mb-6">
              <div className="h-11 w-11 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-lg flex-shrink-0">
                <CheckBadgeIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className={`text-base font-black italic tracking-tight ${t.textPrimary}`}>Negócio Fechado 🎉</h3>
                <p className={`text-[10px] font-bold ${t.textMuted}`}>{pendingGanhoMove.lead.nome}</p>
              </div>
            </div>
            <label className={`block text-[9px] font-black uppercase tracking-widest ${t.textMuted} mb-2`}>
              Valor da Venda (opcional)
            </label>
            <div className="relative">
              <span className={`absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold ${t.textMuted}`}>R$</span>
              <input
                type="text"
                inputMode="numeric"
                autoFocus
                value={valorVendaInput}
                onChange={e => {
                  const digits = e.target.value.replace(/\D/g, '')
                  const num = digits ? parseInt(digits, 10) / 100 : 0
                  setValorVendaInput(num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
                }}
                onKeyDown={e => { if (e.key === 'Enter') confirmGanhoMove() }}
                placeholder="0,00"
                className={`w-full rounded-2xl py-3 pl-11 pr-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${t.isDark ? t.inputBg : 'bg-slate-50 text-slate-700 border border-slate-200'}`}
              />
            </div>
            <p className={`text-[10px] ${t.textMuted} mt-2 italic`}>
              Alimenta o CPA/ROAS real de Campanhas — deixe em branco pra registrar sem valor.
            </p>
            <div className="mt-7 flex gap-3">
              <button
                onClick={() => setPendingGanhoMove(null)}
                className={`flex-1 py-3 ${t.isDark ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'} text-[10px] font-black uppercase tracking-widest rounded-xl transition-all`}
              >
                Cancelar
              </button>
              <button
                onClick={confirmGanhoMove}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg active:scale-95"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal "Estimativa de Valor" — etapa marcada requer_valor_estimado, lead ainda sem
          estimativa. Nunca confundido com o "Negócio Fechado" acima (cor âmbar vs. verde,
          "estimado" explícito no texto) — ver docs/CHECKPOINT.md, 2026-08-13. */}
      {pendingEstimativaMove && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className={`${t.modalBg} w-full max-w-sm rounded-[2rem] p-7 shadow-2xl border border-white/10 animate-in zoom-in-95`}>
            <div className="flex items-center space-x-3 mb-6">
              <div className="h-11 w-11 rounded-2xl bg-amber-500 flex items-center justify-center shadow-lg flex-shrink-0">
                <span className="text-xl">💰</span>
              </div>
              <div>
                <h3 className={`text-base font-black italic tracking-tight ${t.textPrimary}`}>Estimativa de Valor</h3>
                <p className={`text-[10px] font-bold ${t.textMuted}`}>{pendingEstimativaMove.lead.nome}</p>
              </div>
            </div>
            <label className={`block text-[9px] font-black uppercase tracking-widest ${t.textMuted} mb-2`}>
              Valor Potencial Estimado
            </label>
            <div className="relative">
              <span className={`absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold ${t.textMuted}`}>R$</span>
              <input
                type="text"
                inputMode="numeric"
                autoFocus
                value={valorEstimadoInput}
                onChange={e => {
                  const digits = e.target.value.replace(/\D/g, '')
                  const num = digits ? parseInt(digits, 10) / 100 : 0
                  setValorEstimadoInput(num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
                }}
                onKeyDown={e => { if (e.key === 'Enter') confirmEstimativaMove() }}
                placeholder="0,00"
                className={`w-full rounded-2xl py-3 pl-11 pr-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/30 ${t.isDark ? t.inputBg : 'bg-slate-50 text-slate-700 border border-slate-200'}`}
              />
            </div>
            <p className={`text-[10px] ${t.textMuted} mt-2 italic`}>
              Um palpite, não um fato — alimenta o Pipeline em Aberto do dashboard. Nunca é
              confundido com o valor real, que só é pedido no fechamento.
            </p>
            <div className="mt-7 flex gap-3">
              <button
                onClick={() => setPendingEstimativaMove(null)}
                className={`flex-1 py-3 ${t.isDark ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'} text-[10px] font-black uppercase tracking-widest rounded-xl transition-all`}
              >
                Cancelar
              </button>
              <button
                onClick={confirmEstimativaMove}
                className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg active:scale-95"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Agendar Visita */}
      {isAgendarOpen && selectedLead && tenantConfig && (
        <AgendarVisitaModal
          isOpen={isAgendarOpen}
          onClose={() => setIsAgendarOpen(false)}
          onSuccess={() => { setIsAgendarOpen(false); setAgendamentosVersion(v => v + 1) }}
          lead={selectedLead}
          tenantConfig={tenantConfig}
        />
      )}

      {/* Modal Visão Geral do Calendário */}
      {isCalendarioViewOpen && (
        <CalendarioGeralView 
          isOpen={isCalendarioViewOpen} 
          onClose={() => setIsCalendarioViewOpen(false)}
          onNovoAgendamento={() => { setIsCalendarioViewOpen(false); setIsAgendarOpen(true); }}
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
                                 <div className="overflow-hidden"><h4 className={`text-sm font-black uppercase tracking-tight ${t.textPrimary} truncate`}>{ag.lead_name}</h4><p className={`text-[10px] ${t.textMuted} mt-1 font-medium truncate italic`}>{ag.imovel_nome || 'Consultar imóvel'}</p></div>
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
                        <span className={`text-xs font-medium ${t.textSecondary}`}>{selectedAgendamento.imovel_nome || 'Endereço sob consulta'}</span>
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

