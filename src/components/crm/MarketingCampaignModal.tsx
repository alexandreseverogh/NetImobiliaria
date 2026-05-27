'use client'

import React, { useState, useEffect } from 'react'
import { XMarkIcon, CurrencyDollarIcon, TagIcon, ChatBubbleBottomCenterTextIcon, CalendarIcon, MegaphoneIcon, ClockIcon, BuildingOfficeIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'

interface FormState {
  utm_campaign: string
  plataforma: string
  publico_alvo: string
  periodo_faixa_horaria: string // simple string input for now
  data_inicio: string
  data_fim: string
  valor_investido_brl: string
  imovel_id: number | null
}

interface CampaignModalProps {
  campaignToEdit?: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function MarketingCampaignModal({ campaignToEdit, onClose, onSuccess }: CampaignModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<FormState>({
    utm_campaign: '',
    plataforma: 'Meta Ads',
    publico_alvo: '',
    periodo_faixa_horaria: '',
    data_inicio: new Date().toISOString().split('T')[0],
    data_fim: '',
    valor_investido_brl: '',
    imovel_id: null
  })

  // Property Search State (Identical to NovoLeadModal)
  const [imovelSearch, setImovelSearch] = useState('')
  const [imovelResults, setImovelResults] = useState<any[]>([])
  const [selectedImovel, setSelectedImovel] = useState<any>(null)

  // Property Search Hook
  useEffect(() => {
    if (imovelSearch.length >= 2) {
      const delay = setTimeout(() => {
        fetch(`/api/crm/imoveis/search?q=${imovelSearch}`)
          .then(res => res.json())
          .then(data => setImovelResults(data.imoveis || []))
      }, 300)
      return () => clearTimeout(delay)
    } else {
      setImovelResults([])
    }
  }, [imovelSearch])

  // Pre-fill data SE for edição
  React.useEffect(() => {
     if (campaignToEdit) {
         let timeWindow = '';
         try {
            timeWindow = (typeof campaignToEdit.periodo_faixa_horaria === 'string' 
                            ? JSON.parse(campaignToEdit.periodo_faixa_horaria)
                            : campaignToEdit.periodo_faixa_horaria)[0] || '';
         } catch(e) {}
         
         const rawInput = parseFloat(campaignToEdit.valor_investido_brl) || 0;
         const formattedMoney = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(rawInput);

         setFormData({
             utm_campaign: campaignToEdit.utm_campaign || '',
             plataforma: campaignToEdit.plataforma || '',
             publico_alvo: campaignToEdit.publico_alvo || '',
             periodo_faixa_horaria: timeWindow,
             data_inicio: campaignToEdit.data_inicio ? campaignToEdit.data_inicio.split('T')[0] : '',
             data_fim: campaignToEdit.data_fim ? campaignToEdit.data_fim.split('T')[0] : '',
             valor_investido_brl: formattedMoney,
             imovel_id: campaignToEdit.imovel_id || null
         })

         if (campaignToEdit.imovel_id) {
            // Se já tem imóvel, busca o nome/título para exibir o card selecionado
            // Como temos o id, podemos fazer um fetch ou assumir que o backend enviou o nome opcionalmente
            // Para ser robusto, vamos buscar detalhes se necessário, mas por agora vamos deixar o state inicial.
            setSelectedImovel({ id: campaignToEdit.imovel_id, titulo: `Imóvel #${campaignToEdit.imovel_id}` })
         }
     }
  }, [campaignToEdit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleMoneyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (!value) {
      setFormData({ ...formData, valor_investido_brl: "" });
      return;
    }
    const rawValue = (parseInt(value, 10) / 100).toFixed(2);
    // Mascara visual BR
    const formatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(rawValue));
    setFormData({ ...formData, valor_investido_brl: formatted });
  }

  const togglePlataforma = (plat: string) => {
    let current = formData.plataforma ? formData.plataforma.split(', ') : []
    if (current.includes(plat)) {
        current = current.filter(c => c !== plat)
    } else {
        current.push(plat)
    }
    setFormData({ ...formData, plataforma: current.join(', ') })
  }

  const selectImovel = (imv: any) => {
    setSelectedImovel(imv)
    setFormData({ ...formData, imovel_id: imv.id })
    setImovelSearch('')
    setImovelResults([])
  }

  const handleSubmit = async () => {
    if (!formData.utm_campaign || !formData.valor_investido_brl || !formData.data_inicio) {
        alert("Preencha Campaign UTM, Data de Início e Investimento OBRIGATORIAMENTE.")
        return;
    }

    setLoading(true)
    // Converte o valor R$ visual para o Float universal de banco de dados
    const rawDbValue = formData.valor_investido_brl.replace(/[^\d,-]/g, '').replace(',', '.')

    try {
      const isEditing = !!campaignToEdit;
      const res = await fetch('/api/crm/marketing/orcamento', {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
           ...formData, 
           id: isEditing ? campaignToEdit.id : undefined,
           valor_investido_brl: rawDbValue,
           imovel_id: selectedImovel ? selectedImovel.id : null
        })
      })

      const data = await res.json()
      if (data.success) {
        onSuccess()
        onClose()
      } else {
        alert('Erro: ' + data.error)
      }
    } catch (e: any) {
      alert('Crítico: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Dynamic Glass Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      
      {/* Modal Surface */}
      <div className="relative w-full max-w-2xl bg-gray-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Neon Header */}
        <div className="px-8 py-6 border-b border-white/5 bg-white/[0.02]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-blue-600/20 rounded-xl flex items-center justify-center border border-blue-500/30">
                <CurrencyDollarIcon className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white uppercase italic tracking-tight">
                    {campaignToEdit ? 'Atualizar Verba' : 'Investimento de Mídia'}
                </h3>
                <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest">
                    {campaignToEdit ? `Gerenciando UTM: ${campaignToEdit.utm_campaign}` : 'Alocação de Verba Orçamentária'}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
              <XMarkIcon className="h-6 w-6 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-8 flex-1 overflow-y-auto space-y-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          <div className="grid grid-cols-2 gap-6">
             {/* Property Search (Identical to Lead Modal) */}
             <div className="col-span-2 space-y-2 relative">
                <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest ml-1 flex items-center">
                    <BuildingOfficeIcon className="h-3 w-3 mr-1" /> Associar ao Empreendimento / Imóvel
                </label>
                <div className="relative">
                   <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                   <input 
                      type="text"
                      value={imovelSearch}
                      onChange={(e) => setImovelSearch(e.target.value)}
                      placeholder="Busque por título, bairro ou ID..."
                      className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:ring-2 focus:ring-emerald-500/50 transition-all outline-none"
                   />
                </div>
                {/* Dropdown Results */}
                {imovelResults.length > 0 && (
                   <div className="absolute top-20 left-0 w-full bg-[#1e293b] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-20 max-h-48 overflow-y-auto">
                      {imovelResults.map((imv, i) => (
                         <div 
                            key={i} 
                            onClick={() => selectImovel(imv)}
                            className="p-3 hover:bg-emerald-500/10 cursor-pointer border-b border-white/5 last:border-0"
                         >
                            <div className="text-sm font-bold text-white">[{imv.id}] {imv.titulo}</div>
                            <div className="text-xs text-gray-400">{imv.bairro} - {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(imv.preco)}</div>
                         </div>
                      ))}
                   </div>
                )}

                {/* Selected Property Card */}
                {selectedImovel && (
                   <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/20 flex items-center justify-between animate-in zoom-in-95 duration-300">
                      <div className="flex items-center">
                         <div className="h-10 w-10 bg-emerald-500/20 rounded-xl flex items-center justify-center mr-3">
                            <BuildingOfficeIcon className="h-5 w-5 text-emerald-400" />
                         </div>
                         <div>
                            <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Selecionado</div>
                            <div className="text-sm font-bold text-white">{selectedImovel.titulo}</div>
                         </div>
                      </div>
                      <button 
                         onClick={() => {
                            setSelectedImovel(null);
                            setFormData({ ...formData, imovel_id: null });
                         }} 
                         className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-500 hover:text-red-400"
                      >
                         <XMarkIcon className="h-5 w-5" />
                      </button>
                   </div>
                )}
             </div>

             <div className="col-span-2 border-t border-white/5 pt-4"></div>

             <div className="col-span-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 mb-2 block flex items-center">
                    <MegaphoneIcon className="h-3 w-3 mr-1" /> Campaign UTM (Exact Match)
                </label>
                <input required type="text" name="utm_campaign" value={formData.utm_campaign} onChange={handleChange} className="w-full bg-black/20 border border-white/10 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-3 text-white text-sm transition-all" placeholder="Ex: Lancamento_Bairro_Q1_2026" />
             </div>

             <div className="col-span-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 mb-2 block flex items-center">
                    <TagIcon className="h-3 w-3 mr-1" /> Veículos / Canais Envolvidos (Cross-Channel)
                </label>
                <div className="flex flex-wrap gap-2">
                  {['Meta Ads (FB/IG)', 'Google Search', 'YouTube Ads', 'TikTok Ads', 'Taboola', 'Offline'].map(plat => {
                    const isSelected = (formData.plataforma || '').includes(plat);
                    return (
                        <button 
                          key={plat} 
                          type="button" 
                          onClick={() => togglePlataforma(plat)} 
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${isSelected ? 'bg-blue-600 text-white border-blue-500' : 'bg-white/5 text-gray-400 border-white/10 hover:border-white/20'}`}
                        >
                          {plat}
                        </button>
                    )
                  })}
                </div>
             </div>

             <div className="col-span-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 mb-2 block flex items-center">
                    <CurrencyDollarIcon className="h-3 w-3 mr-1 text-emerald-500" /> Valor Total Investido (Campanha Inteira)
                </label>
                <input required type="text" name="valor_investido_brl" value={formData.valor_investido_brl} onChange={handleMoneyChange} className="w-full bg-emerald-900/10 border border-emerald-500/30 text-emerald-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-4 py-3 text-sm transition-all font-mono font-bold tracking-wider" placeholder="R$ 0,00" />
             </div>

             <div className="col-span-2 border-t border-white/5 pt-6 mt-2">
                <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-4">Segmentação e Audiência Direcionada</h4>
             </div>

             <div className="col-span-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 mb-2 block flex items-center">
                    <ChatBubbleBottomCenterTextIcon className="h-3 w-3 mr-1" /> Público-Alvo (Inteligência Semântica)
                </label>
                <input type="text" name="publico_alvo" value={formData.publico_alvo} onChange={handleChange} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white text-sm" placeholder="Ex: Advogados, Médicos Alto Padrão Praia, Casais Jovens..." />
             </div>

             <div className="col-span-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 mb-2 block flex items-center">
                    <ClockIcon className="h-3 w-3 mr-1" /> Período da Faixa de Horário Específica (Adset)
                </label>
                <input type="text" name="periodo_faixa_horaria" value={formData.periodo_faixa_horaria} onChange={handleChange} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white text-sm" placeholder="Ex: Seg a Sab, 18h às 23h30" />
             </div>

             <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 mb-2 block flex items-center">
                    <CalendarIcon className="h-3 w-3 mr-1" /> Data Início (Obrigatório)
                </label>
                <input required type="date" name="data_inicio" value={formData.data_inicio} onChange={handleChange} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white text-sm" />
             </div>

             <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 mb-2 block flex items-center">
                    <CalendarIcon className="h-3 w-3 mr-1" /> Data Fim (Opcional - Always On)
                </label>
                <input type="date" name="data_fim" value={formData.data_fim} onChange={handleChange} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white text-sm" />
             </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-white/5 bg-gray-900 flex justify-end space-x-4">
          <button onClick={onClose} className="px-6 py-3 text-sm font-bold text-gray-400 hover:text-white transition-colors">
            Cancelar
          </button>
          <button disabled={loading} onClick={handleSubmit} className="px-8 py-3 bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/20 text-white text-sm font-bold rounded-xl transition-all uppercase tracking-widest">
            {loading ? 'Sincronizando BI...' : (campaignToEdit ? 'Atualizar Investimento' : 'Consolidar Investimento')}
          </button>
        </div>
      </div>
    </div>
  )
}


