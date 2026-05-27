'use client'

import React, { useState, useEffect } from 'react'
import {
  CurrencyDollarIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  MapIcon,
  FunnelIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  TrophyIcon,
  ClockIcon,
  ArrowTrendingUpIcon as TrendingUpIcon,
  MegaphoneIcon,
  XMarkIcon,
  CalendarDaysIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline'
import { useTheme } from '@/hooks/useTheme'

interface Stat {
  name: string;
  stat: string;
  change: string;
  changeType: 'increase' | 'decrease' | 'neutral';
  icon?: any;
}

interface Lead {
  lead_uuid: string;
  nome: string;
  email: string;
  telefone: string;
  tag_sonho: string;
  score_prontidao: number;
}

const formatPhone = (phone: string) => {
  if (!phone) return 'S/ TEL'
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 11) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`
  if (cleaned.length === 10) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`
  return phone
}

export default function CRMDashboard() {
  const t = useTheme()
  const [stats, setStats] = useState<Stat[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [statusData, setStatusData] = useState<any[]>([])
  const [visao, setVisao] = useState<'campanha' | 'projeto'>('projeto')
  const [projectROI, setProjectROI] = useState<any[]>([])
  const [campaignROI, setCampaignROI] = useState<any[]>([])
  const [cycleHeatmap, setCycleHeatmap] = useState<any[]>([])
  const [selectedDrilldown, setSelectedDrilldown] = useState<any>(null)
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
      const [statsRes, leadsRes, lbRes, analyticsRes, insightsRes] = await Promise.all([
        fetch('/api/crm/stats/dashboard'),
        fetch('/api/crm/leads'),
        fetch('/api/crm/stats/leaderboard?limit=5'),
        fetch(`/api/crm/analytics/roi?timeframe=${timeframe}${timeframe === 'custom' ? `&startDate=${startDate}&endDate=${endDate}` : ''}`),
        fetch('/api/crm/analytics/insights')
      ])
      const statsData = await statsRes.json()
      const leadsData = await leadsRes.json()
      const analyticsData = await analyticsRes.json()
      const insightsData = await insightsRes.json()

      if (insightsData.success) setInsights(insightsData.insight)

      if (analyticsData.success) {
        const { total_investido, total_vendas, total_vgv, cac_global, cpl_global, roi_global, leads_mkt } = analyticsData.kpis
        setStats([
          { name: 'Total Investido (Mídia)', stat: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total_investido), change: 'MTD', changeType: 'neutral', icon: CurrencyDollarIcon },
          { name: 'Receita Convertida (Total)', stat: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total_vgv), change: `${total_vendas} Conversões`, changeType: 'increase', icon: TrophyIcon },
          { name: 'ROI Global (Mídia)', stat: (roi_global || 0).toFixed(1) + 'x', change: 'Multiplicador', changeType: (roi_global || 0) > 1 ? 'increase' : 'neutral', icon: BanknotesIcon },
          { name: 'CAC (Custo de Aquisição)', stat: total_vendas > 0 ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cac_global) : '---', change: total_vendas > 0 ? `Cost Avg (1/${total_vendas})` : 'Aguardando Venda', changeType: total_vendas > 0 ? 'increase' : 'neutral', icon: ShieldCheckIcon },
          { name: 'CPL (Mídia Direta)', stat: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cpl_global), change: `${leads_mkt} Leads MKT`, changeType: 'neutral', icon: UserGroupIcon },
        ])
        setCampaignROI(analyticsData.campaign_roi)
        setProjectROI(analyticsData.project_roi || [])
        setCycleHeatmap(analyticsData.cycle_heatmap)
      }
      if (statsData.success) setStatusData(statsData.leads_por_status || [])
      if (leadsData.success) {
        const sorted = [...leadsData.leads].sort((a, b) => (b.score_prontidao || 0) - (a.score_prontidao || 0))
        setLeads(sorted.slice(0, 5))
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
          <p className={`mt-1 text-sm ${t.textSecondary}`}>Análise de Performance e Qualificação IA (Fases 3 & 4).</p>
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
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className={`bg-transparent border-0 text-[10px] font-bold outline-none focus:ring-0 px-2 ${t.textPrimary}`} />
              <span className={`text-[10px] ${t.textMuted}`}>até</span>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className={`bg-transparent border-0 text-[10px] font-bold outline-none focus:ring-0 px-2 ${t.textPrimary}`} />
              <button onClick={fetchDashboardData} className={`p-1 rounded-lg transition-all ${t.hoverBg}`}>
                <ArrowTrendingUpIcon className="h-4 w-4 text-emerald-400 rotate-90" />
              </button>
            </div>
          )}

          <a href="/crm/config/marketing"
            className="inline-flex items-center px-4 py-2 text-sm font-bold text-blue-100 bg-blue-700 border border-blue-500/30 rounded-xl hover:bg-blue-600 transition-all uppercase tracking-widest shadow-lg">
            <MegaphoneIcon className="mr-2 h-4 w-4 text-blue-200" />
            Central de Mídia
          </a>
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
          {/* ── KPI Cards Premium ──────────────────────────────────────────── */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {stats.map((item) => (
              <a key={item.name} href={item.name === 'Total Leads (Staging)' ? '/crm/leads' : '#'}
                className={`relative group overflow-hidden p-6 rounded-[2rem] transition-all duration-300 block cursor-pointer ${
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
                  <div className={`flex items-center text-[11px] font-black uppercase tracking-widest mt-2 px-2.5 py-1 rounded-lg w-max border ${
                    item.changeType === 'increase' 
                      ? (t.isDark ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-emerald-600 bg-emerald-50 border-emerald-100')
                      : item.changeType === 'decrease' 
                        ? (t.isDark ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' : 'text-rose-600 bg-rose-50 border-rose-100') 
                        : (t.isDark ? `${t.textMuted} bg-white/5 border-white/10` : 'text-slate-500 bg-slate-50 border-slate-200')
                  }`}>
                    {item.changeType === 'increase' ? <ArrowTrendingUpIcon className="mr-1.5 h-3.5 w-3.5" /> : item.changeType === 'decrease' ? <ArrowTrendingDownIcon className="mr-1.5 h-3.5 w-3.5" /> : null}
                    {item.change}
                  </div>
                </div>
              </a>
            ))}
          </div>

          {/* ── Nível 2 + Gargalos ─────────────────────────────────── */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">

            {/* Drill-down Nível 2 Premium */}
            <div className={`lg:col-span-2 rounded-[2.5rem] p-8 relative overflow-hidden transition-all ${
              t.isDark ? `${t.cardDark} shadow-xl border border-white/5` : 'bg-white shadow-[0_8px_30px_-12px_rgba(0,0,0,0.06)] border border-slate-100'
            }`}>
              {t.isDark ? (
                <div className="absolute -top-20 -right-20 w-80 h-80 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none" />
              ) : (
                <div className="absolute -top-20 -right-20 w-80 h-80 bg-blue-50/50 rounded-full blur-[60px] pointer-events-none" />
              )}

              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <h3 className={`text-lg font-black uppercase tracking-widest flex items-center ${t.isDark ? t.textPrimary : 'text-slate-800'}`}>
                  <div className={`p-2 rounded-xl mr-3 ${t.isDark ? 'bg-emerald-500/10' : 'bg-emerald-50 border border-emerald-100 shadow-sm'}`}>
                    <TrendingUpIcon className={`h-5 w-5 ${t.isDark ? 'text-emerald-400' : 'text-emerald-500'}`} />
                  </div>
                  Nível 2: Performance & Conversão {visao === 'projeto' ? 'por Produto/Categoria' : 'por Veículo'}
                </h3>
                <div className={`flex rounded-2xl p-1.5 flex-shrink-0 shadow-inner ${t.isDark ? t.selectorBg : 'bg-slate-100/80 border border-slate-200/60'}`}>
                  <button type="button" onClick={() => setVisao('projeto')}
                    className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${visao === 'projeto' ? 'bg-emerald-500 text-white shadow-[0_4px_12px_-2px_rgba(16,185,129,0.3)]' : (t.isDark ? t.selectorBtn : 'text-slate-500 hover:text-slate-800')}`}>
                    CFO / Produto
                  </button>
                  <button type="button" onClick={() => setVisao('campanha')}
                    className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${visao === 'campanha' ? 'bg-blue-600 text-white shadow-[0_4px_12px_-2px_rgba(37,99,235,0.3)]' : (t.isDark ? t.selectorBtn : 'text-slate-500 hover:text-slate-800')}`}>
                    Performance / Tráfego
                  </button>
                </div>
              </div>

              <div key={visao} className="relative z-10 mt-4 space-y-4 pr-2 pb-2 pt-2 animate-in fade-in slide-in-from-bottom-2 duration-500 max-h-[500px] overflow-y-auto custom-scrollbar">
                {visao === 'projeto' ? (
                  projectROI.length === 0 ? (
                    <div className={`text-sm font-bold uppercase tracking-widest italic text-center py-20 rounded-[2rem] border-2 border-dashed ${t.isDark ? `${t.textMuted} ${t.borderSub}` : 'text-slate-400 border-slate-200 bg-slate-50'}`}>
                      Aguardando cruzamento de faturamento por projeto/produto...
                    </div>
                  ) : (
                    projectROI.map((proj, idx) => (
                      <div key={proj.project_id || idx} onClick={() => setSelectedDrilldown(proj)}
                        className={`group relative rounded-[1.5rem] p-5 transition-all cursor-pointer ${
                          t.isDark 
                            ? `${t.cardInner} hover:border-emerald-500/40 border border-transparent shadow-sm` 
                            : 'bg-white border border-slate-200/60 shadow-sm hover:shadow-[0_8px_24px_-8px_rgba(16,185,129,0.2)] hover:border-emerald-200'
                        }`}>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                          <div className="flex-1">
                            <div className="flex items-center space-x-4">
                              <div className={`h-12 w-12 rounded-2xl flex items-center justify-center transition-colors group-hover:scale-105 duration-300 ${t.isDark ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-emerald-50 border border-emerald-100 shadow-sm'}`}>
                                <MapIcon className={`h-6 w-6 ${t.isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                              </div>
                              <div>
                                <h4 className={`text-sm font-black uppercase tracking-wider ${t.isDark ? t.textPrimary : 'text-slate-800'}`}>{proj.project_name}</h4>
                                <div className="mt-1.5 flex items-center">
                                  <span className={`px-2.5 py-1 rounded-lg border font-black font-mono text-[10px] uppercase tracking-widest ${
                                    t.isDark ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-blue-50 border-blue-100 text-blue-600 shadow-sm'
                                  }`}>
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(proj.budget_total)}
                                  </span>
                                  <span className={`ml-2 text-[9px] font-bold uppercase tracking-widest ${t.isDark ? t.textMuted : 'text-slate-400'}`}>Investido</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-6">
                            <div className="text-right">
                              <div className={`text-sm font-black ${t.isDark ? t.textPrimary : 'text-slate-800'}`}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(proj.vgv_total || 0)}</div>
                              <div className={`text-[10px] font-black uppercase tracking-widest ${t.isDark ? 'text-emerald-500/70' : 'text-emerald-500'}`}>VGV</div>
                            </div>
                            <div className="text-right w-16">
                              <div className={`text-sm font-black ${t.isDark ? t.textPrimary : 'text-slate-800'}`}>{proj.total_leads}</div>
                              <div className={`text-[10px] font-black uppercase tracking-widest ${t.isDark ? t.textMuted : 'text-slate-400'}`}>Leads</div>
                            </div>
                            <div className="text-right w-16">
                              <div className={`text-sm font-black ${t.isDark ? t.textPrimary : 'text-slate-800'}`}>{proj.vitorias}</div>
                              <div className={`text-[10px] font-black uppercase tracking-widest ${t.isDark ? t.textMuted : 'text-slate-400'}`}>Fechados</div>
                            </div>
                            <div className="text-right w-24">
                              <div className={`text-sm font-black ${t.isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                                {proj.vitorias > 0 ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((proj.budget_total || 0) / proj.vitorias) : '---'}
                              </div>
                              <div className={`text-[10px] font-black uppercase tracking-widest ${t.isDark ? t.textMuted : 'text-slate-400'}`}>CAC Proj.</div>
                            </div>
                            <div className={`w-20 pl-5 border-l ${t.isDark ? t.borderSub : 'border-slate-200'} flex flex-col items-end justify-center`}>
                              <div className={`text-xl font-black tracking-tighter ${t.isDark ? 'text-emerald-400' : 'text-emerald-500'}`}>
                                {proj.roi > 0 ? proj.roi.toFixed(1) + 'x' : '---'}
                              </div>
                              <div className={`text-[9px] font-black uppercase tracking-widest ${t.isDark ? t.textMuted : 'text-slate-400'}`}>ROI</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )
                ) : (
                  campaignROI.length === 0 ? (
                    <div className={`italic text-sm text-center mt-10 ${t.textMuted}`}>Buscando inteligência de mercado...</div>
                  ) : (
                    campaignROI.map((camp, idx) => (
                      <div key={camp.mkt_id || idx} onClick={() => setSelectedDrilldown(camp)}
                        className={`relative ${t.cardInner} rounded-2xl p-4 hover:border-blue-500/40 transition-all cursor-pointer shadow-sm`}>
                        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h4 className={`text-sm font-bold uppercase tracking-wider ${t.textPrimary}`}>{camp.utm_campaign}</h4>
                              <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">{camp.plataforma}</span>
                            </div>
                            <div className="flex items-center mt-1 space-x-2">
                              <span className={`text-[10px] font-bold uppercase tracking-widest ${t.textMuted}`}>{camp.produto_nome || 'Campanha Genérica'}</span>
                              <span className={t.textMuted}>•</span>
                              <span className={`text-[10px] font-medium uppercase tracking-widest ${t.textSecondary}`}>
                                Investimento: <span className="text-blue-500 font-bold font-mono">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(camp.budget)}</span>
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-6 text-right">
                            <div className="w-16">
                              <div className={`text-sm font-black ${t.textPrimary}`}>{camp.total_leads}</div>
                              <div className={`text-[9px] uppercase tracking-widest font-bold ${t.textMuted}`}>Leads</div>
                            </div>
                            <div className={`w-20 pl-4 border-l ${t.borderSub}`}>
                              <div className="text-sm font-black text-blue-500">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(camp.cpl || 0)}</div>
                              <div className={`text-[9px] uppercase tracking-widest ${t.textMuted}`}>CPL</div>
                            </div>
                            <div className={`w-24 pl-4 border-l ${t.borderSub}`}>
                              <div className={`text-sm font-black ${(camp.avg_score || 0) > 70 ? 'text-emerald-500' : (camp.avg_score || 0) > 40 ? 'text-amber-500' : t.textMuted}`}>
                                {Math.round(camp.avg_score || 0)}%
                              </div>
                              <div className={`text-[9px] uppercase tracking-widest font-bold ${t.textMuted}`}>Qualidade</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )
                )}
              </div>
            </div>

            {/* Gargalos & Ciclos Premium */}
            <div className={`rounded-[2.5rem] p-8 transition-all ${
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
          </div>

          {/* ── Top Leads + IA ─────────────────────────────────────── */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className={`lg:col-span-2 ${t.cardBg} rounded-2xl p-6`}>
              <div className="flex items-center justify-between mb-6">
                <h3 className={`text-lg font-semibold flex items-center ${t.textPrimary}`}>
                  <UserGroupIcon className="mr-2 h-5 w-5 text-emerald-500" />
                  Top 5: Leads Quentes (Maior Lead Score IA)
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
        </>
      )}

      {/* ── Modal Drill-Down Nível 3 ────────────────────────────── */}
      {selectedDrilldown && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
          <div className={`${t.modalBg} w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]`}>
            <div className={`p-8 border-b ${t.borderSub} bg-gradient-to-r from-blue-600/20 to-purple-600/10 flex items-center justify-between`}>
              <div className="flex items-center space-x-6">
                <div className="h-14 w-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-xl font-black italic shadow-lg">
                  {selectedDrilldown.total_leads}
                </div>
                <div>
                  <h3 className={`text-xl font-black italic tracking-tighter uppercase ${t.textPrimary}`}>Nível 3: Drill-Down de Leads</h3>
                  <p className="text-sm text-blue-500 font-bold tracking-widest uppercase mt-1">
                    Origem: {selectedDrilldown.utm_campaign || selectedDrilldown.project_name} {selectedDrilldown.plataforma ? `(${selectedDrilldown.plataforma})` : ''}
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedDrilldown(null)}
                className={`p-3 rounded-full transition-all ${t.hoverBg} ${t.textSecondary} border ${t.border}`}>
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="p-8 overflow-y-auto flex-1">
              <table className="w-full text-left">
                <thead>
                  <tr className={`text-[11px] uppercase tracking-[0.2em] font-black border-b ${t.textMuted} ${t.borderSub}`}>
                    <th className="pb-5">Identificador / Cliente</th>
                    <th className="pb-5">Data de Captação</th>
                    <th className="pb-5">Etapa Atual</th>
                    <th className="pb-5 text-center">Status SLA</th>
                    <th className="pb-5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${t.borderSub}`}>
                  {selectedDrilldown.leads_detalhe && selectedDrilldown.leads_detalhe.length > 0 ? (
                    selectedDrilldown.leads_detalhe.map((lead: any, i: number) => {
                      const sla = lead.sla_hours || 24
                      const lastMoveDate = lead.last_move ? new Date(lead.last_move) : new Date(lead.created_at)
                      const hoursInStage = Math.max(0, (new Date().getTime() - lastMoveDate.getTime()) / (1000 * 60 * 60))
                      const isLate = hoursInStage > sla
                      const isCritical = hoursInStage > sla * 1.5
                      const slaColor = isCritical ? 'text-red-500 bg-red-500/10 border-red-500/20' : isLate ? 'text-amber-500 bg-amber-500/10 border-amber-500/20' : 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
                      return (
                        <tr key={i} className={`group transition-all ${t.hoverBg}`}>
                          <td className="py-5 pr-4">
                            <div className={`text-sm font-bold mb-1 group-hover:text-blue-500 transition-colors ${t.textPrimary}`}>{lead.nome || 'Lead s/ Nome'}</div>
                            <div className={`text-[11px] font-mono tracking-tight ${t.textMuted}`}>{lead.lead_uuid}</div>
                          </td>
                          <td className={`py-5 text-sm font-semibold ${t.textSecondary}`}>
                            <div className="flex items-center">
                              <CalendarDaysIcon className="h-4 w-4 mr-2 opacity-40" />
                              {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                            </div>
                          </td>
                          <td className="py-5">
                            <span className="inline-flex items-center px-3 py-1 rounded-lg bg-blue-600/10 text-blue-500 text-[10px] font-black uppercase tracking-widest border border-blue-500/20">
                              {lead.status || 'Staging'}
                            </span>
                          </td>
                          <td className="py-5 text-center">
                            <div className={`inline-flex flex-col items-center px-3 py-1.5 rounded-xl border ${slaColor}`}>
                              <span className="text-[11px] font-black font-mono leading-none">{hoursInStage.toFixed(1)}h</span>
                              <span className="text-[8px] uppercase tracking-tighter mt-0.5 opacity-70">Meta: {sla}h</span>
                            </div>
                          </td>
                          <td className="py-5 text-right">
                            <a href={`/crm/leads?id=${lead.lead_uuid}`}
                              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-black uppercase rounded-xl transition-all shadow-sm active:scale-95">
                              Ver Ficha
                              <ArrowTrendingUpIcon className="ml-2 h-4 w-4" />
                            </a>
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr><td colSpan={5} className={`py-20 text-center italic text-base ${t.textMuted}`}>Nenhum lead individual encontrado para este período.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className={`p-6 border-t ${t.borderSub} flex justify-end`}>
              <button onClick={() => setSelectedDrilldown(null)}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase rounded-2xl transition-all shadow-lg active:scale-95">
                Sair da Visão Drill-Down
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
