'use client'

import React, { useState, useEffect } from 'react'
import {
  UsersIcon, MagnifyingGlassIcon, EnvelopeIcon, PhoneIcon,
  FingerPrintIcon, ArrowPathIcon, XMarkIcon, SparklesIcon,
  CheckBadgeIcon, ChatBubbleBottomCenterTextIcon, MapPinIcon
} from '@heroicons/react/24/outline'
import EnrichedLeadData from '@/components/crm/EnrichedLeadData'
import { useTheme } from '@/hooks/useTheme'

interface LeadStaging {
  lead_uuid: string; nome: string; email: string; telefone: string;
  status: string; tag_sonho: string; resumo_ia: string;
  score_prontidao: number; imovel_id: number | null;
  enriquecimento_cache?: any; created_at: string; coluna_nome: string;
}

const formatPhone = (phone: string) => {
  if (!phone) return 'S/ Telefone'
  const c = phone.replace(/\D/g, '')
  if (c.length === 11) return `(${c.slice(0,2)}) ${c.slice(2,7)}-${c.slice(7)}`
  if (c.length === 10) return `(${c.slice(0,2)}) ${c.slice(2,6)}-${c.slice(6)}`
  return phone
}

export default function LeadsStagingPage() {
  const t = useTheme()
  const [leads, setLeads] = useState<LeadStaging[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedLead, setSelectedLead] = useState<LeadStaging | null>(null)

  useEffect(() => { fetchLeads() }, [])

  const fetchLeads = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/crm/leads')
      const data = await res.json()
      if (data.success) setLeads(data.leads)
    } finally { setLoading(false) }
  }

  const filteredLeads = leads.filter(l =>
    l.nome?.toLowerCase().includes(search.toLowerCase()) ||
    l.email?.toLowerCase().includes(search.toLowerCase()) ||
    l.tag_sonho?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className={`text-2xl font-bold tracking-tight italic flex items-center ${t.textPrimary}`}>
            CENTRO DE <span className="text-blue-500 ml-2">STAGING (CAPTAÇÃO)</span>
          </h2>
          <p className={`mt-1 text-sm ${t.textSecondary}`}>Gerenciamento de leads qualificados pela Inteligência Concierge.</p>
        </div>
        <div className="flex space-x-2">
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
          <input type="text" placeholder="Filtrar por nome, email ou tag de sonho..."
            value={search} onChange={e => setSearch(e.target.value)}
            className={`w-full rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-blue-500/50 transition-all font-medium ${t.inputBg}`} />
        </div>
        <select className={`rounded-xl px-4 py-2 text-sm focus:outline-none ${t.inputBg}`}>
          <option>Todos os Status</option>
          <option>Novos</option>
          <option>Duplicados</option>
        </select>
      </div>

      {/* Table */}
      <div className={`${t.cardBg} rounded-3xl overflow-hidden shadow-sm`}>
        <table className="min-w-full">
          <thead className={`${t.isDark ? 'bg-black/20' : 'bg-gray-50'}`}>
            <tr>
              {['Identidade', 'Dados Enriquecidos', 'Tag do Sonho', 'Score IPVE', 'Origem / Data', 'Ação'].map((h, i) => (
                <th key={h} className={`px-6 py-4 text-left text-xs font-bold uppercase tracking-widest ${i === 1 ? 'text-emerald-500' : t.textMuted} ${i >= 3 && i <= 4 ? 'text-center' : ''} ${i === 5 ? 'text-right' : ''}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className={`divide-y ${t.borderSub}`}>
            {loading ? (
              <tr><td colSpan={6} className="py-20 text-center text-blue-500 animate-pulse font-bold italic">Sincronizando Leads...</td></tr>
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
                  <span className={`text-xs font-bold ${lead.score_prontidao > 80 ? 'text-green-500' : lead.score_prontidao > 50 ? 'text-blue-500' : t.textMuted}`}>
                    {lead.score_prontidao}%
                  </span>
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
              <tr><td colSpan={6} className={`py-20 text-center italic ${t.textMuted}`}>Nenhum lead encontrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
          <div className={`${t.modalBg} w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300`}>
            <div className={`relative p-6 border-b ${t.borderSub} bg-gradient-to-br from-blue-600/10 to-indigo-600/5`}>
              <button onClick={() => setSelectedLead(null)}
                className={`absolute right-6 top-6 p-2 ${t.textMuted} ${t.hoverBg} rounded-full transition-all`}>
                <XMarkIcon className="h-6 w-6" />
              </button>
              <div className="flex items-center space-x-4">
                <div className="h-16 w-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-xl">
                  <UsersIcon className="h-10 w-10" />
                </div>
                <div>
                  <h3 className={`text-xl font-bold italic ${t.textPrimary}`}>{selectedLead.nome}</h3>
                  <div className={`flex items-center text-sm space-x-3 mt-1 ${t.textSecondary}`}>
                    <span>{formatPhone(selectedLead.telefone)}</span><span>•</span><span>{selectedLead.email}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 space-y-6 overflow-y-auto max-h-[65vh]">
              {selectedLead.enriquecimento_cache && (
                <div className={`p-6 ${t.cardBg} rounded-3xl border border-emerald-500/20 relative`}>
                  <div className="absolute -top-3 left-6 flex items-center space-x-2 bg-emerald-600 text-[10px] font-bold text-white px-3 py-1 rounded-full uppercase">
                    <CheckBadgeIcon className="h-3 w-3" /><span>Dados Enriquecidos</span>
                  </div>
                  <div className="mt-4"><EnrichedLeadData cache={selectedLead.enriquecimento_cache} /></div>
                </div>
              )}

              <div className={`p-6 ${t.cardBg} rounded-3xl border border-blue-500/20 relative`}>
                <div className="absolute -top-3 left-6 flex items-center space-x-2 bg-blue-600 text-[10px] font-bold text-white px-3 py-1 rounded-full uppercase">
                  <SparklesIcon className="h-3 w-3" /><span>Análise da Concierge IA</span>
                </div>
                <div className="mt-4 space-y-4">
                  <div className={`flex items-center justify-between border-b pb-4 ${t.borderSub}`}>
                    <div className="flex items-center space-x-2">
                      <ChatBubbleBottomCenterTextIcon className="h-5 w-5 text-blue-500" />
                      <span className={`text-sm font-bold uppercase tracking-tighter ${t.textPrimary}`}>Perfil Emocional</span>
                    </div>
                    <span className="bg-blue-500/10 text-blue-500 px-3 py-1 rounded-full text-xs font-black uppercase border border-blue-500/20">{selectedLead.tag_sonho}</span>
                  </div>
                  <div className={`text-sm leading-relaxed italic ${t.textSecondary}`}>"{selectedLead.resumo_ia || 'A IA ainda não processou este lead.'}"</div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    {[['Prontidão para Compra', `${selectedLead.score_prontidao}%`, 'Top Match'], ['Aderência IPVE', `${Math.min((selectedLead.score_prontidao || 70) + 15, 99)}%`, 'Score Real']].map(([label, val, badge]) => (
                      <div key={label} className={`p-4 ${t.cardInner} rounded-2xl`}>
                        <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${t.textMuted}`}>{label}</p>
                        <div className="flex items-end space-x-2">
                          <span className={`text-2xl font-bold ${t.textPrimary}`}>{val}</span>
                          <span className="text-[10px] text-blue-500 font-bold uppercase mb-1">{badge}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[['Status Pipeline', selectedLead.coluna_nome?.replace('_', ' ') || 'Novo'], ['Data de Ingestão', new Date(selectedLead.created_at).toLocaleDateString()]].map(([label, val]) => (
                  <div key={label} className={`flex items-center justify-between p-4 ${t.cardBg} rounded-2xl`}>
                    <span className={`text-xs font-bold uppercase ${t.textSecondary}`}>{label}</span>
                    <span className={`text-xs font-bold ${t.textPrimary}`}>{val}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={`p-6 border-t ${t.borderSub} ${t.isDark ? 'bg-black/20' : 'bg-gray-50'} flex justify-end space-x-4`}>
              <button onClick={() => setSelectedLead(null)} className={`px-6 py-3 text-xs font-bold uppercase tracking-widest ${t.textMuted} hover:text-blue-500 transition-all`}>Fechar</button>
              <button className="flex items-center px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all uppercase">
                <CheckBadgeIcon className="h-4 w-4 mr-2" />Assumir Atendimento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
