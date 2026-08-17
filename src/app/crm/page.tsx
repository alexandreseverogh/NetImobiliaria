'use client'

import React, { useState, useEffect } from 'react'
import DateInputPtBR from '@/components/ui/DateInputPtBR'
import {
  UserGroupIcon,
  TrophyIcon,
  XCircleIcon,
  BanknotesIcon,
  FunnelIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon as TrendingUpIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline'
import { useTheme } from '@/hooks/useTheme'
import KanbanFunnelWidget from '@/components/crm/KanbanFunnelWidget'
import PerformanceVendedoresPanel, { VendedorPerformance, MotivoPerda } from '@/components/crm/PerformanceVendedoresPanel'

/**
 * Dashboard do CRM — decisão fechada com o usuário (docs/CHECKPOINT.md, 2026-08-13): o CRM não
 * mede mais custo/ROI/CAC/CPL de marketing (nenhuma fonte disponível representa o custo
 * comercial TOTAL de um negócio — rotular uma fração como "ROI" empresta credibilidade que o
 * número não tem). Mede só o que sabe de verdade: leads, funil, velocidade, conversão, quem
 * está performando — e valor ESTIMADO de negócio (nunca confundido com custo nem com o valor
 * REAL de fechamento).
 */

interface Kpi {
  name: string
  stat: string
  sub?: string
  changeType: 'increase' | 'decrease' | 'neutral'
  icon: any
}

interface Lead {
  lead_uuid: string;
  nome: string;
  email: string;
  telefone: string;
  tag_sonho: string;
  score_prontidao: number;
}

const currency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

const formatPhone = (phone: string) => {
  if (!phone) return 'S/ TEL'
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 11) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`
  if (cleaned.length === 10) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`
  return phone
}

export default function CRMDashboard() {
  const t = useTheme()
  const [kpis, setKpis] = useState<Kpi[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [statusData, setStatusData] = useState<any[]>([])
  const [cycleHeatmap, setCycleHeatmap] = useState<any[]>([])
  const [filaAtencao, setFilaAtencao] = useState<{ total: number; semResponsavel: number } | null>(null)
  const [roleLabelPlural, setRoleLabelPlural] = useState('Atendentes')
  const [vendedores, setVendedores] = useState<VendedorPerformance[]>([])
  const [motivosPerda, setMotivosPerda] = useState<MotivoPerda[]>([])
  const [timeframe, setTimeframe] = useState('30')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [insights, setInsights] = useState<any>({
    text: 'Buscando indicadores de mercado...',
    action: 'Analisando perfis de demanda...',
    percentage: 0,
    trend_tag: '...'
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchDashboardData() }, [timeframe])

  const fetchDashboardData = async () => {
    try {
      const qs = `timeframe=${timeframe}${timeframe === 'custom' ? `&startDate=${startDate}&endDate=${endDate}` : ''}`
      const [statsRes, leadsRes, perfRes, insightsRes, filaRes, vendRes] = await Promise.all([
        fetch('/api/crm/stats/dashboard'),
        fetch('/api/crm/leads'),
        fetch(`/api/crm/analytics/performance?${qs}`),
        fetch('/api/crm/analytics/insights'),
        fetch('/api/crm/pendencia/resgate'),
        fetch(`/api/crm/analytics/performance-vendedores?${qs}`),
      ])
      const statsData = await statsRes.json()
      const leadsData = await leadsRes.json()
      const perfData = await perfRes.json()
      const insightsData = await insightsRes.json()
      const filaData = await filaRes.json()
      const vendData = await vendRes.json()

      if (insightsData.success) setInsights(insightsData.insight)

      if (filaData.success) {
        setFilaAtencao({ total: filaData.total ?? 0, semResponsavel: filaData.semResponsavel ?? 0 })
      }

      if (vendData.success) {
        setRoleLabelPlural(vendData.role_label_plural || 'Atendentes')
        setVendedores(vendData.vendedores || [])
        setMotivosPerda(vendData.motivos_perda || [])
      }

      if (perfData.success) {
        const k = perfData.kpis
        setKpis([
          {
            name: 'Leads Captados', stat: String(k.leads_captados),
            changeType: 'neutral', icon: UserGroupIcon,
          },
          {
            // Soma o badge de preço (ícone dollar-sign) já exibido nos cards do Kanban —
            // "Faixa de Preço" no segmento Venda de Carros, rótulo curado por segmento/tenant
            // no Segment Builder (nunca hardcoded). Auto-declarado pelo cliente na captação,
            // por isso normalmente já vem preenchido (diferente de valor_venda_estimado, que
            // só existe quando o atendente confirma numa etapa do Kanban — CHECKPOINT.md
            // 2026-08-16).
            name: 'Valor Estimado Total', stat: currency(k.valor_estimado_total),
            sub: `${k.leads_captados} lead${k.leads_captados !== 1 ? 's' : ''} no período`,
            changeType: 'neutral', icon: CurrencyDollarIcon,
          },
          {
            name: 'Negócios Fechados', stat: String(k.negocios_fechados),
            sub: currency(k.valor_fechado),
            changeType: k.negocios_fechados > 0 ? 'increase' : 'neutral', icon: TrophyIcon,
          },
          {
            name: 'Negócios Perdidos', stat: String(k.negocios_perdidos),
            sub: k.valor_perdido_estimado > 0 ? `~${currency(k.valor_perdido_estimado)} (est.)` : undefined,
            changeType: k.negocios_perdidos > 0 ? 'decrease' : 'neutral', icon: XCircleIcon,
          },
          {
            name: 'Pipeline Aberto', stat: currency(k.pipeline_estimado),
            sub: `${k.pipeline_leads} leads em aberto (est.)`,
            changeType: 'neutral', icon: BanknotesIcon,
          },
          {
            name: 'Taxa de Conversão', stat: k.taxa_conversao != null ? `${(k.taxa_conversao * 100).toFixed(0)}%` : '—',
            sub: k.ciclo_medio_dias != null ? `Ciclo médio: ${k.ciclo_medio_dias.toFixed(0)}d` : undefined,
            changeType: (k.taxa_conversao || 0) >= 0.3 ? 'increase' : (k.taxa_conversao != null ? 'decrease' : 'neutral'),
            icon: ArrowTrendingUpIcon,
          },
        ])
        setCycleHeatmap(perfData.cycle_heatmap || [])
      }
      if (statsData.success) setStatusData(statsData.leads_por_status || [])
      if (leadsData.success) {
        const sorted = [...leadsData.leads].sort((a, b) => (b.score_prontidao || 0) - (a.score_prontidao || 0))
        setLeads(sorted.slice(0, 10))
      }
    } catch (err) {
      console.error('Erro ao carregar Dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`space-y-8 animate-in fade-in duration-700 ${t.pageBg}`}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className={`flex items-center justify-between pb-4 border-b ${t.borderSub}`}>
        <div>
          <h2 className={`text-2xl font-bold tracking-tight italic uppercase ${t.textPrimary}`}>
            DashBoard <span className="text-blue-500">Inteligente</span>
          </h2>
          <p className={`mt-1 text-sm ${t.textSecondary}`}>Leads, funil de vendas e performance do time — visão operacional do CRM.</p>
        </div>
        <div className="flex space-x-3 items-center">
          {/* Timeframe */}
          <div className={`flex ${t.selectorBg} rounded-xl p-1 mr-4`}>
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
            <div className={`flex items-center space-x-2 ${t.selectorBg} rounded-xl p-1 mr-4`}>
              <DateInputPtBR value={startDate} onChange={setStartDate}
                className={`bg-transparent border-0 text-[10px] font-bold outline-none focus:ring-0 px-2 ${t.textPrimary}`} />
              <span className={`text-[10px] ${t.textMuted}`}>até</span>
              <DateInputPtBR value={endDate} onChange={setEndDate}
                className={`bg-transparent border-0 text-[10px] font-bold outline-none focus:ring-0 px-2 ${t.textPrimary}`} />
              <button onClick={fetchDashboardData} className={`p-1 rounded-lg transition-all ${t.hoverBg}`}>
                <ArrowTrendingUpIcon className="h-4 w-4 text-emerald-400 rotate-90" />
              </button>
            </div>
          )}

          <button onClick={fetchDashboardData}
            className={`inline-flex items-center px-4 py-2 text-sm font-semibold ${t.textSecondary} ${t.cardBg} rounded-xl transition-all`}>
            Atualizar
          </button>
          <a href="/crm/kanban"
            className="inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-500 shadow-lg transition-all">
            <FunnelIcon className="mr-2 h-4 w-4" />
            Ver Kanban
          </a>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-20 text-blue-500 font-bold italic animate-pulse">
          Sincronizando Inteligência...
        </div>
      ) : (
        <>
          {/* ── Linha 1: KPI Cards ───────────────────────────────── */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {kpis.map((item) => (
              <div key={item.name}
                className={`relative group overflow-hidden p-6 rounded-[2rem] transition-all duration-300 ${
                  t.isDark
                    ? `${t.cardBg} ${t.hoverCard}`
                    : 'bg-white border border-slate-100 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.12)] hover:shadow-[0_12px_40px_-12px_rgba(37,99,235,0.2)] hover:border-blue-200 hover:-translate-y-1'
                }`}>
                <div className={`absolute -right-4 -top-4 p-4 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-12 ${t.isDark ? 'opacity-10 group-hover:opacity-20' : 'opacity-[0.03] group-hover:opacity-[0.06]'}`}>
                  <item.icon className="h-24 w-24 text-blue-600" />
                </div>
                <div className="flex items-center space-x-3 mb-5">
                  <div className={`p-2.5 rounded-2xl ${t.isDark ? 'bg-blue-500/10' : 'bg-blue-50/80 shadow-sm border border-blue-100/50'}`}>
                    <item.icon className={`h-6 w-6 ${t.isDark ? 'text-blue-500' : 'text-blue-600'}`} />
                  </div>
                  <p className={`text-xs font-black uppercase tracking-widest truncate ${t.isDark ? t.textLabel : 'text-slate-500'}`}>{item.name}</p>
                </div>
                <div className="mt-2 flex flex-col justify-between">
                  <p className={`text-3xl font-black tracking-tight ${t.isDark ? t.textPrimary : 'text-slate-800'}`}>{item.stat}</p>
                  {item.sub && (
                    <p className={`text-[10px] font-semibold mt-1 ${t.isDark ? t.textMuted : 'text-slate-400'}`}>{item.sub}</p>
                  )}
                  <div className={`flex items-center text-[11px] font-black uppercase tracking-widest mt-2 px-2.5 py-1 rounded-lg w-max border ${
                    item.changeType === 'increase'
                      ? (t.isDark ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-emerald-600 bg-emerald-50 border-emerald-100')
                      : item.changeType === 'decrease'
                        ? (t.isDark ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' : 'text-rose-600 bg-rose-50 border-rose-100')
                        : (t.isDark ? `${t.textMuted} bg-white/5 border-white/10` : 'text-slate-500 bg-slate-50 border-slate-200')
                  }`}>
                    {item.changeType === 'increase' ? <ArrowTrendingUpIcon className="mr-1.5 h-3.5 w-3.5" /> : item.changeType === 'decrease' ? <ArrowTrendingDownIcon className="mr-1.5 h-3.5 w-3.5" /> : null}
                    {item.changeType === 'increase' ? 'Em alta' : item.changeType === 'decrease' ? 'Atenção' : 'Estável'}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Linha 2: Funil real de CRM (Kanban) ─────────────── */}
          <KanbanFunnelWidget stages={statusData} />

          {/* ── Linha 3: Gargalos & Ciclos + Fila de Atenção ────── */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className={`lg:col-span-2 rounded-[2.5rem] p-8 transition-all ${
              t.isDark ? `${t.cardBgSolid} shadow-sm border border-white/5` : 'bg-white shadow-[0_8px_30px_-12px_rgba(0,0,0,0.06)] border border-slate-100'
            }`}>
              <div className="flex items-center justify-between mb-8">
                <h3 className={`text-sm font-black uppercase tracking-widest flex items-center ${t.isDark ? 'text-red-400' : 'text-rose-500'}`}>
                  <div className={`p-2 rounded-xl mr-3 ${t.isDark ? 'bg-red-500/10' : 'bg-rose-50 border border-rose-100 shadow-sm'}`}>
                    <ClockIcon className={`h-5 w-5 ${t.isDark ? 'text-red-400' : 'text-rose-500'}`} />
                  </div>
                  Gargalos & Ciclos (SLA)
                </h3>
              </div>
              <div className="space-y-4">
                {cycleHeatmap.length > 0 ? cycleHeatmap.map((ciclo, idx) => {
                  const sla = ciclo.sla_hours || 24
                  const tempo = parseFloat(ciclo.tempo_medio_horas || '0')
                  const isOverSLA = tempo > sla
                  const isCritical = tempo > sla * 1.5

                  const lightModeColorClass = isCritical ? 'text-rose-600' : isOverSLA ? 'text-amber-600' : 'text-emerald-600'
                  const darkModeColorClass = isCritical ? 'text-red-400' : isOverSLA ? 'text-amber-400' : 'text-emerald-400'
                  const colorClass = t.isDark ? darkModeColorClass : lightModeColorClass

                  const lightBgClass = isCritical
                    ? 'bg-rose-50 border-rose-100 hover:border-rose-300'
                    : isOverSLA
                      ? 'bg-amber-50 border-amber-100 hover:border-amber-300'
                      : 'bg-emerald-50 border-emerald-100 hover:border-emerald-300'
                  const darkBgClass = isCritical
                    ? 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20'
                    : isOverSLA
                    ? 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20'
                    : 'bg-emerald-500/5 border-emerald-500/10 hover:bg-emerald-500/10'

                  const bgClass = t.isDark ? darkBgClass : lightBgClass + ' shadow-sm'

                  return (
                    <div key={idx} className={`p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${bgClass}`}>
                      <div>
                        <div className={`text-xs font-black uppercase tracking-widest ${colorClass}`}>{String(ciclo.coluna_atual).replace('_', ' ')}</div>
                        <div className={`text-[10px] mt-1 font-bold ${t.isDark ? t.textMuted : 'text-slate-500'}`}>{ciclo.amostras} leads processados • <span className={`${t.isDark ? 'opacity-70' : 'opacity-100 text-slate-400'}`}>Meta: {sla}h</span></div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-black font-mono tracking-tighter ${colorClass}`}>{Math.max(0, tempo).toFixed(1)}h</div>
                        <div className={`text-[9px] uppercase tracking-widest font-black mt-0.5 ${isOverSLA ? (t.isDark ? 'text-red-400/80' : 'text-rose-500/80') : (t.isDark ? t.textMuted : 'text-slate-400')}`}>
                          {isOverSLA ? 'Atraso Critico' : 'No Prazo Ideal'}
                        </div>
                      </div>
                    </div>
                  )
                }) : (
                  <div className={`py-12 text-center text-sm font-bold uppercase tracking-widest rounded-3xl border-2 border-dashed ${t.isDark ? `${t.textMuted} ${t.borderSub}` : 'text-slate-400 border-slate-200 bg-slate-50'}`}>Aguardando movimentações de Kanban...</div>
                )}
              </div>
            </div>

            {/* Fila de Atenção — leads sem responsável / aguardando resposta há muito tempo,
                fonte já existente (agente pendencia_atendimento / fila de resgate). */}
            <a href="/crm/resgate" className={`block rounded-[2.5rem] p-8 transition-all ${
              t.isDark ? `${t.cardBgSolid} shadow-sm border border-white/5 hover:border-amber-500/30` : 'bg-white shadow-[0_8px_30px_-12px_rgba(0,0,0,0.06)] border border-slate-100 hover:border-amber-200'
            }`}>
              <h3 className={`text-sm font-black uppercase tracking-widest flex items-center mb-6 ${t.isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                <div className={`p-2 rounded-xl mr-3 ${t.isDark ? 'bg-amber-500/10' : 'bg-amber-50 border border-amber-100 shadow-sm'}`}>
                  <ExclamationTriangleIcon className={`h-5 w-5 ${t.isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                </div>
                Fila de Atenção
              </h3>
              {filaAtencao && filaAtencao.total > 0 ? (
                <>
                  <p className={`text-4xl font-black ${t.isDark ? 'text-amber-400' : 'text-amber-600'}`}>{filaAtencao.total}</p>
                  <p className={`text-xs font-bold mt-1 ${t.isDark ? t.textMuted : 'text-slate-500'}`}>
                    lead{filaAtencao.total !== 1 ? 's' : ''} aguardando atenção
                    {filaAtencao.semResponsavel > 0 && ` · ${filaAtencao.semResponsavel} sem responsável`}
                  </p>
                </>
              ) : (
                <p className={`text-sm font-bold uppercase tracking-widest italic text-center py-8 ${t.isDark ? t.textMuted : 'text-slate-400'}`}>
                  Nenhum lead pendente agora
                </p>
              )}
            </a>
          </div>

          {/* ── Linha 4: Top Leads + Inteligência de Mercado ────── */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className={`lg:col-span-2 ${t.cardBg} rounded-2xl p-6`}>
              <div className="flex items-center justify-between mb-6">
                <h3 className={`text-lg font-semibold flex items-center ${t.textPrimary}`}>
                  <UserGroupIcon className="mr-2 h-5 w-5 text-emerald-500" />
                  Top 10: Leads Quentes (Maior Lead Score IA)
                </h3>
                <a href="/crm/leads" className="text-sm text-blue-500 hover:text-blue-400 transition-colors">Ver Todos os Leads</a>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className={`text-xs uppercase tracking-widest border-b ${t.textMuted} ${t.borderSub}`}>
                      <th className="pb-3 pl-2">Lead</th>
                      <th className="pb-3 text-center">IA: Tag de Sonho</th>
                      <th className="pb-3 text-center">Score</th>
                      <th className="pb-3 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className={`${t.divider} divide-y`}>
                    {leads.map((lead) => (
                      <tr key={lead.lead_uuid} className={`group transition-colors ${t.hoverBg}`}>
                        <td className="py-4 pl-2">
                          <div className={`font-medium ${t.textPrimary}`}>{lead.nome || 'Não Informado'}</div>
                          <div className={`text-[10px] mt-0.5 ${t.textMuted}`}>{formatPhone(lead.telefone)} • {lead.email || 'S/ EMAIL'}</div>
                        </td>
                        <td className="py-4 text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20">
                            {lead.tag_sonho}
                          </span>
                        </td>
                        <td className="py-4 text-center">
                          <div className="text-xs text-blue-500 font-bold">{lead.score_prontidao || 0}%</div>
                        </td>
                        <td className="py-4 text-right">
                          <button className={`text-[10px] font-bold border px-2 py-1 rounded-lg transition-all ${t.textSecondary} ${t.border} ${t.hoverBg}`}>Ficha</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Inteligência de Mercado */}
            <div className="bg-gradient-to-br from-indigo-700 to-blue-700 rounded-2xl p-6 shadow-xl relative overflow-hidden group border border-white/10">
              <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:rotate-12 transition-transform duration-700">
                <TrendingUpIcon className="h-40 w-40 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2 flex items-center">Inteligência de Mercado</h3>
              <p className="text-sm text-blue-100 mb-6 font-medium leading-relaxed">{insights.text}</p>
              <div className="p-4 bg-white/10 rounded-xl border border-white/10 backdrop-blur-sm mb-6">
                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-200">Próxima Ação Sugerida</p>
                <p className="text-sm text-white mt-1 font-semibold">{insights.action}</p>
              </div>
              <button className="w-full py-3 bg-white text-blue-800 font-bold rounded-xl hover:bg-blue-50 transition-all text-xs uppercase tracking-widest">
                Otimizar Conversão
              </button>
            </div>
          </div>

          {/* ── Linha 5: Performance por Vendedor + Motivos de Perda ── */}
          <PerformanceVendedoresPanel roleLabelPlural={roleLabelPlural} vendedores={vendedores} motivosPerda={motivosPerda} />
        </>
      )}
    </div>
  )
}
