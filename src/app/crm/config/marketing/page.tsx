'use client'

import React, { useState, useEffect } from 'react'
import { MegaphoneIcon, CalendarDateRangeIcon, PlusIcon, PencilSquareIcon, ChartBarIcon, ServerStackIcon, ClockIcon } from '@heroicons/react/24/outline'
import DateInputPtBR from '@/components/ui/DateInputPtBR'
import MarketingCampaignModal from '@/components/crm/MarketingCampaignModal'
import { useTheme } from '@/hooks/useTheme'

interface Campaign {
  id: string; utm_campaign: string; plataforma: string; publico_alvo: string;
  valor_investido_brl: string; data_inicio: string; data_fim: string | null;
  periodo_faixa_horaria: any; imovel_nome?: string;
}

export default function CentralDeMediaPage() {
  const t = useTheme()
  const [campanhas, setCampanhas] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [timeframe, setTimeframe] = useState<'month' | 'quarter' | 'custom' | 'all'>('month')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null)

  useEffect(() => {
    if (timeframe === 'custom') {
      if (!startDate || !endDate) return
      if (new Date(endDate) < new Date(startDate)) return
    }
    fetchCampanhas()
  }, [timeframe, startDate, endDate])

  const fetchCampanhas = async () => {
    setLoading(true)
    try {
      let url = `/api/crm/marketing/orcamento?timeframe=${timeframe}`
      if (timeframe === 'custom') url += `&startDate=${startDate}&endDate=${endDate}`
      const res = await fetch(url)
      const data = await res.json()
      if (data.success) setCampanhas(data.campanhas)
    } finally { setLoading(false) }
  }

  const parseFaixa = (faixa: any) => {
    try {
      if (!faixa) return 'Always On'
      const parsed = typeof faixa === 'string' ? JSON.parse(faixa) : faixa
      return parsed[0] || 'Livre'
    } catch { return 'S/ Restrição' }
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto animate-in fade-in duration-500">
      {/* Header */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between border-b pb-4 ${t.borderSub}`}>
        <div>
          <h1 className={`text-2xl font-black tracking-tight uppercase italic flex items-center ${t.textPrimary}`}>
            <ServerStackIcon className="h-6 w-6 mr-3 text-purple-500" />
            Central de <span className="text-purple-500 ml-2">Mídia & Verbas</span>
          </h1>
          <p className={`text-sm font-medium mt-1 ${t.textSecondary}`}>Gestão de orçamentos mapeados para cruzamento com ROI da IA.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-4 md:mt-0">
          {timeframe === 'custom' && (
            <div className={`flex items-center space-x-2 ${t.isDark ? 'bg-purple-900/10 border-purple-500/30' : 'bg-purple-50 border-purple-200'} border p-1 rounded-xl`}>
              <DateInputPtBR value={startDate} onChange={setStartDate}
                className={`bg-transparent border-none text-xs font-bold focus:ring-0 ${t.isDark ? 'text-purple-200' : 'text-purple-700'}`} />
              <span className="text-purple-500 text-xs font-black">Até</span>
              <DateInputPtBR value={endDate}
                onChange={iso => {
                  if (startDate && iso && new Date(iso) < new Date(startDate)) { alert('Data Final não pode ser menor que a Inicial.'); return }
                  setEndDate(iso)
                }}
                className={`bg-transparent border-none text-xs font-bold focus:ring-0 ${t.isDark ? 'text-purple-200' : 'text-purple-700'}`} />
            </div>
          )}
          <div className="relative">
            <CalendarDateRangeIcon className="h-4 w-4 text-purple-400 absolute left-3 top-2.5" />
            <select value={timeframe} onChange={e => setTimeframe(e.target.value as any)}
              className={`pl-9 pr-4 py-2 ${t.isDark ? 'bg-purple-900/10 border-purple-500/30 text-purple-200' : 'bg-purple-50 border-purple-200 text-purple-700'} border text-sm font-bold uppercase tracking-widest rounded-xl focus:outline-none cursor-pointer appearance-none`}>
              <option value="month">Últimos 30 Dias</option>
              <option value="quarter">Este Trimestre</option>
              <option value="custom">Período Específico</option>
              <option value="all">Histórico Completo</option>
            </select>
          </div>
          <button onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm uppercase tracking-widest rounded-xl flex items-center shadow-lg transition-all">
            <PlusIcon className="h-5 w-5 mr-1" />Campaign
          </button>
        </div>
      </div>

      {/* Tabela */}
      <div className={`${t.cardBgSolid} rounded-3xl overflow-hidden shadow-sm`}>
        {loading ? (
          <div className="p-20 text-center text-purple-500 italic text-sm animate-pulse">Sincronizando Ad Accounts...</div>
        ) : campanhas.length === 0 ? (
          <div className={`p-20 text-center italic text-sm ${t.textMuted}`}>Nenhuma campanha orçada no período ({timeframe}).</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className={`border-b ${t.borderSub} ${t.isDark ? 'bg-white/[0.02]' : 'bg-gray-50'}`}>
                <tr className={`text-[10px] uppercase tracking-widest ${t.textMuted}`}>
                  {['Status', 'UTM (Identificador)', 'Público-Alvo', 'Config de Regência', 'Budget (R$)', 'Action'].map((h, i) => (
                    <th key={h} className={`px-6 py-4 font-black ${i >= 3 ? 'text-right' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className={`divide-y ${t.borderSub}`}>
                {campanhas.map(campanha => {
                  const isAtiva = !campanha.data_fim || new Date(campanha.data_fim) >= new Date()
                  return (
                    <tr key={campanha.id} className={`group transition-colors ${t.hoverBg}`}>
                      <td className="px-6 py-4">
                        {isAtiva ? (
                          <div className="flex items-center text-[10px] text-emerald-500 font-bold bg-emerald-500/10 px-2 py-1 rounded inline-block border border-emerald-500/20">
                            <div className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-pulse mr-1.5" />Ativa
                          </div>
                        ) : (
                          <div className={`flex items-center text-[10px] font-bold ${t.cardBg} px-2 py-1 rounded inline-block ${t.textMuted}`}>
                            <div className={`h-1.5 w-1.5 rounded-full mr-1.5 ${t.isDark ? 'bg-gray-500' : 'bg-gray-400'}`} />Encerrada
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <div className={`p-1.5 ${t.cardBg} rounded-lg`}>
                            <MegaphoneIcon className={`h-4 w-4 ${t.textMuted}`} />
                          </div>
                          <div>
                            <div className={`text-sm font-bold ${t.textPrimary}`}>{campanha.utm_campaign}</div>
                            <div className="text-[10px] text-purple-500 font-bold mt-1 uppercase tracking-widest">{campanha.plataforma}{campanha.imovel_nome ? ` • ${campanha.imovel_nome}` : ''}</div>
                            <div className={`text-[9px] font-medium italic mt-0.5 flex items-center ${t.textMuted}`}>
                              <ClockIcon className="h-3 w-3 mr-1 opacity-70" />{parseFaixa(campanha.periodo_faixa_horaria)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`text-xs font-medium ${t.cardBg} px-2.5 py-1 rounded-md inline-block ${t.textPrimary}`}>
                          {campanha.publico_alvo || 'Broad Audience'}
                        </div>
                      </td>
                      <td className={`px-6 py-4 text-right text-xs leading-relaxed font-bold tracking-tight ${t.textSecondary}`}>
                        Início: {new Date(campanha.data_inicio).toLocaleDateString('pt-BR')}<br />
                        Fim: {campanha.data_fim ? new Date(campanha.data_fim).toLocaleDateString('pt-BR') : 'Always On'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="text-sm font-black text-emerald-500 font-mono">
                          {Number(campanha.valor_investido_brl).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2 opacity-50 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setEditingCampaign(campanha); setIsModalOpen(true) }}
                            className={`p-1.5 ${t.hoverBg} rounded-lg ${t.textMuted} hover:text-blue-500 transition-colors`}>
                            <PencilSquareIcon className="h-4 w-4" />
                          </button>
                          <button className="p-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg text-blue-500 transition-colors">
                            <ChartBarIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <MarketingCampaignModal campaignToEdit={editingCampaign} onClose={() => { setIsModalOpen(false); setEditingCampaign(null) }} onSuccess={fetchCampanhas} />
      )}
    </div>
  )
}


