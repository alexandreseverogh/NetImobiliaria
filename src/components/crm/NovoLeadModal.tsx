'use client'

import React, { useState, useEffect } from 'react'
import {
  XMarkIcon,
  UserCircleIcon,
  MagnifyingGlassIcon,
  BuildingOfficeIcon,
  ArrowRightIcon,
  CheckBadgeIcon,
  SparklesIcon,
  UserPlusIcon,
  DocumentPlusIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline'

interface NovoLeadModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface FormSchemaField {
  name: string
  label: string
  type: string
  required: boolean
}

export default function NovoLeadModal({ isOpen, onClose, onSuccess }: NovoLeadModalProps) {
  const [step, setStep] = useState<1 | 2>(1)
  const [loading, setLoading] = useState(false)

  // Step 1 State: Client
  const [clientSearch, setClientSearch] = useState('')
  const [clientResults, setClientResults] = useState<any[]>([])
  const [selectedClient, setSelectedClient] = useState<any>(null)
  
  // Custom new client if not listed
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [valorVenda, setValorVenda] = useState('')

  // Step 2 State: Imovel vs Custom
  const [modoSelecao, setModoSelecao] = useState<'exato' | 'perfil'>('exato')
  const [imovelSearch, setImovelSearch] = useState('')
  const [imovelResults, setImovelResults] = useState<any[]>([])
  const [selectedImovel, setSelectedImovel] = useState<any>(null)

  const [formSchema, setFormSchema] = useState<FormSchemaField[]>([])
  const [customData, setCustomData] = useState<any>({})
  const [campaignList, setCampaignList] = useState<any[]>([])
  const [selectedCampaign, setSelectedCampaign] = useState('')

  useEffect(() => {
    if (isOpen) {
       // Reset state
       setStep(1)
       setModoSelecao('exato')
       setClientSearch('')
       setNome('')
       setEmail('')
       setTelefone('')
       setValorVenda('')
       setSelectedClient(null)
       setSelectedImovel(null)
       setImovelSearch('')
       setSelectedCampaign('')
       setCustomData({})
       
       // Load Segment Form Config
       fetch('/api/crm/config/segmentos?domainId=1')
        .then(res => res.json())
        .then(data => {
            if (data.success && data.config?.[0]?.form_schema_json) {
                setFormSchema(data.config[0].form_schema_json)
            }
        })

       // Load Active Campaigns 
       fetch('/api/crm/marketing/orcamento?timeframe=all')
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                setCampaignList(data.campanhas || [])
            }
        })
    }
  }, [isOpen])

  // Client Search Hook
  useEffect(() => {
    if (clientSearch.length >= 3) {
      const delay = setTimeout(() => {
        fetch(`/api/crm/clientes/search?q=${clientSearch}`)
          .then(res => res.json())
          .then(data => setClientResults(data.clientes || []))
      }, 300)
      return () => clearTimeout(delay)
    } else {
      setClientResults([])
    }
  }, [clientSearch])

  // Imovel Search Hook
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

  const selectClient = (c: any) => {
    setSelectedClient(c)
    setNome(c.nome)
    setEmail(c.email || '')
    setTelefone(c.telefone || '')
    setClientSearch('')
    setClientResults([])
  }

  const selectImovel = (imv: any) => {
    setSelectedImovel(imv)
    // Se o vínculo é exato, o valor de venda DEVE vir do preço do imóvel (Semântica)
    const formattedPrice = (Number(imv.preco || 0)).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    setValorVenda(formattedPrice)
    setImovelSearch('')
    setImovelResults([])
  }

  const handleCurrencyChange = (fieldName: string, value: string) => {
    const nums = value.replace(/\D/g, '')
    if (!nums) {
      setCustomData({ ...customData, [fieldName]: '' })
      return
    }
    const floatValue = parseInt(nums, 10) / 100
    const masked = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(floatValue)
    setCustomData({ ...customData, [fieldName]: masked })
  }

  const goStep2 = () => {
    if (!nome) return alert('É necessário informar o nome do Lead.')
    setStep(2)
  }

  const handleSubmit = async () => {
    // Validação de Campos Obrigatórios (Perfil de Interesse)
    if (modoSelecao === 'perfil') {
       for (const field of formSchema) {
          if (field.required && !customData[field.name]) {
             alert(`O campo '${field.label}' é de preenchimento obrigatório.`);
             return;
          }
       }
    }

    setLoading(true)
    try {
      const payload = {
         nome,
         email,
         telefone,
         valor_venda: parseFloat(valorVenda.replace(/\D/g, '')) / 100 || 0,
         imovel_id: modoSelecao === 'exato' && selectedImovel ? selectedImovel.id : null,
         raw_json: modoSelecao === 'perfil' ? customData : {},
         // Forçamos que a engine re-enriqueça manualmente também pra garantir:
         utm_source: 'CRM Manual',
         utm_campaign: selectedCampaign || null
      }

      const res = await fetch('/api/crm/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      if (data.success) {
         onSuccess() // triggers reload on parent component
         onClose()
      } else {
         alert('Erro ao salvar Lead: ' + data.error)
      }
    } catch (e: any) {
      alert('Erro crítico: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300 font-sans">
        <div className="bg-[#0f172a] w-full max-w-2xl rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
            {/* Header */}
            <div className="relative p-6 border-b border-white/5 bg-gradient-to-br from-blue-600/10 to-indigo-600/5">
                <button 
                    onClick={onClose}
                    className="absolute right-6 top-6 p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-all"
                >
                    <XMarkIcon className="h-6 w-6" />
                </button>
                <div className="flex items-center space-x-3">
                    <div className="h-12 w-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-600/20">
                        <UserPlusIcon className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-white italic tracking-tighter">Captação Genérica (Manual)</h3>
                        <p className="text-xs text-gray-400 font-medium">Passo {step} de 2 • {step === 1 ? 'Identidade' : 'Interesse'}</p>
                    </div>
                </div>
            </div>

            {/* Body */}
            <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
               {step === 1 && (
                  <div className="space-y-6 animate-in slide-in-from-right-4">
                     {/* Client Search */}
                     <div className="space-y-2 relative">
                         <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Buscar Cliente Existente</label>
                         <div className="relative">
                           <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                           <input 
                             type="text"
                             value={clientSearch}
                             onChange={(e) => setClientSearch(e.target.value)}
                             placeholder="Digite nome, e-mail ou CPF..."
                             className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                           />
                         </div>
                         {/* Dropdown Results */}
                         {clientResults.length > 0 && (
                            <div className="absolute top-16 left-0 w-full bg-[#1e293b] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-10 max-h-48 overflow-y-auto">
                               {clientResults.map((c, i) => (
                                 <div 
                                    key={i} 
                                    onClick={() => selectClient(c)}
                                    className="p-3 hover:bg-white/5 cursor-pointer border-b border-white/5 last:border-0"
                                 >
                                    <div className="text-sm font-bold text-white">{c.nome}</div>
                                    <div className="text-xs text-gray-400">{c.email || c.cpf || c.telefone}</div>
                                 </div>
                               ))}
                            </div>
                         )}
                     </div>

                     <div className="relative flex items-center py-2">
                        <div className="flex-grow border-t border-white/10"></div>
                        <span className="flex-shrink-0 mx-4 text-gray-500 text-xs italic font-medium">OU NOVO CADASTRO</span>
                        <div className="flex-grow border-t border-white/10"></div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1 md:col-span-2">
                            <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest ml-1">Nome Completo</label>
                            <input value={nome} onChange={e => setNome(e.target.value)} className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-white text-sm" placeholder="Obrigatório" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">WhatsApp</label>
                            <input value={telefone} onChange={e => setTelefone(e.target.value)} className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-white text-sm" placeholder="Opcional" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">E-mail</label>
                            <input value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-white text-sm" placeholder="Opcional" />
                        </div>
                        <div className="space-y-1 md:col-span-2 mt-4 pt-4 border-t border-white/5">
                            <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest ml-1 flex items-center">
                               <SparklesIcon className="h-3 w-3 mr-1" /> Associar à Campanha MKT/Projeto
                            </label>
                            <select 
                               value={selectedCampaign} 
                               onChange={e => setSelectedCampaign(e.target.value)}
                               className="w-full bg-emerald-900/10 border border-emerald-500/20 text-emerald-200 focus:border-emerald-500 rounded-xl px-4 py-3 text-sm outline-none transition-all cursor-pointer"
                            >
                                <option value="" className="bg-[#0f172a]">--- Nenhuma Configurada (Orgânico) ---</option>
                                {campaignList.map((camp, idx) => (
                                    <option key={idx} value={camp.utm_campaign} className="bg-[#0f172a]">
                                       {camp.utm_campaign} ({camp.plataforma})
                                    </option>
                                ))}
                            </select>
                            <p className="text-[10px] text-gray-500 ml-1 mt-1">Cruza o desempenho deste lead para as métricas financeiras do ROI.</p>
                        </div>
                     </div>
                  </div>
               )}

               {step === 2 && (
                  <div className="space-y-6 animate-in slide-in-from-right-4">
                     {/* Choice Tabs */}
                     <div className="flex p-1 bg-black/40 rounded-xl space-x-1">
                        <button 
                           onClick={() => setModoSelecao('exato')}
                           className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${modoSelecao === 'exato' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                        >
                           Vínculo Exato
                        </button>
                        <button 
                           onClick={() => setModoSelecao('perfil')}
                           className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${modoSelecao === 'perfil' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                        >
                           Perfil de Interesse
                        </button>
                     </div>

                     {modoSelecao === 'exato' && (
                        <div className="space-y-4 pt-2">
                           <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center text-sm text-blue-300">
                              <CheckBadgeIcon className="h-5 w-5 mr-3 flex-shrink-0" />
                              Use esta opção se você já sabe exatamente qual imóvel (ou Ref/ID) o cliente quer.
                           </div>

                           <div className="space-y-2 relative">
                               <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Pesquisar Imóvel</label>
                               <div className="relative">
                                 <BuildingOfficeIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                 <input 
                                   type="text"
                                   value={imovelSearch}
                                   onChange={(e) => setImovelSearch(e.target.value)}
                                   placeholder="Título, bairro ou ID..."
                                   className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                                 />
                               </div>
                               {/* Dropdown Results */}
                               {imovelResults.length > 0 && (
                                  <div className="absolute top-16 left-0 w-full bg-[#1e293b] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-10 max-h-48 overflow-y-auto">
                                     {imovelResults.map((imv, i) => (
                                       <div 
                                          key={i} 
                                          onClick={() => selectImovel(imv)}
                                          className="p-3 hover:bg-white/5 cursor-pointer border-b border-white/5 last:border-0"
                                       >
                                          <div className="text-sm font-bold text-white">[{imv.id}] {imv.titulo}</div>
                                          <div className="text-xs text-gray-400">{imv.bairro} - R$ {imv.preco}</div>
                                       </div>
                                     ))}
                                  </div>
                               )}
                           </div>
                           
                           {/* Selected Tag */}
                           {selectedImovel && (
                               <div className="p-4 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between">
                                  <div>
                                     <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Imóvel Vinculado</div>
                                     <div className="text-white text-sm mt-1">{selectedImovel.titulo}</div>
                                  </div>
                                  <button onClick={() => setSelectedImovel(null)} className="text-gray-500 hover:text-red-400"><XMarkIcon className="h-5 w-5"/></button>
                               </div>
                           )}

                           {selectedImovel && (
                                <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl animate-in zoom-in-95 duration-500">
                                   <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest ml-1 flex items-center">
                                      <CurrencyDollarIcon className="h-3 w-3 mr-1" /> VGV Automático (Preço Imóvel)
                                   </label>
                                   <div className="text-xl font-black text-white font-mono mt-1">{valorVenda}</div>
                                   <p className="text-[9px] text-gray-500 uppercase tracking-tighter mt-1 italic">Bloqueado para edição (Vínculo Exato).</p>
                                </div>
                            )}
                        </div>
                     )}

                     {modoSelecao === 'perfil' && (
                        <div className="space-y-4 pt-2">
                           <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl flex items-center text-sm text-purple-300">
                              <SparklesIcon className="h-5 w-5 mr-3 flex-shrink-0" />
                              Use esta opção caso o cliente esteja apenas pesquisando perfis genéricos. Estes dados engatilham a IA!
                           </div>

                           <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl animate-in zoom-in-95 duration-500">
                                <label className="text-[10px] font-black text-amber-500 uppercase tracking-widest ml-1 flex items-center">
                                   <CurrencyDollarIcon className="h-3 w-3 mr-1" /> Valor Base de Compra / Perfil
                                </label>
                                <input 
                                   value={valorVenda} 
                                   onChange={e => {
                                      let val = e.target.value.replace(/\D/g, "");
                                      val = (Number(val) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
                                      setValorVenda(val);
                                   }} 
                                   className="w-full bg-black/40 border border-amber-500/20 rounded-xl px-4 py-3 text-amber-200 text-sm font-mono focus:border-amber-500 outline-none mt-2" 
                                   placeholder="Qual a faixa de valor que o cliente busca?" 
                                />
                                <p className="text-[9px] text-gray-500 uppercase tracking-tighter mt-1 italic">Informe manualmente para cálculo de ROI em leads de perfil.</p>
                            </div>

                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {formSchema.length === 0 && (
                                 <div className="col-span-2 text-center py-6 text-gray-500 italic text-sm">Nenhum campo configurado no Segment Builder.</div>
                              )}
                              {formSchema.map((field, i) => (
                                 <div key={i} className={`space-y-1 ${field.type === 'text' ? 'md:col-span-2' : ''}`}>
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">{field.label}</label>
                                    <input 
                                       type={field.type === 'number' ? 'number' : 'text'}
                                       value={customData[field.name] || ''} 
                                       onChange={e => field.type === 'currency' 
                                          ? handleCurrencyChange(field.name, e.target.value) 
                                          : setCustomData({ ...customData, [field.name]: e.target.value })
                                       } 
                                       className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-white text-sm focus:border-purple-500 outline-none transition-all" 
                                       placeholder={field.required ? 'Obrigatório' : ''}
                                    />
                                 </div>
                              ))}
                           </div>
                        </div>
                     )}
                  </div>
               )}
            </div>

            {/* Footer */}
            <div className="p-6 bg-black/20 border-t border-white/5 flex items-center justify-between">
               {step === 2 ? (
                  <button onClick={() => setStep(1)} className="px-4 py-2 text-xs font-bold text-gray-500 uppercase hover:text-white">Voltar</button>
               ) : <div></div>}

               {step === 1 ? (
                  <button 
                     onClick={goStep2} 
                     className="flex items-center px-8 py-3 bg-white text-black hover:bg-gray-200 text-xs font-black rounded-xl transition-all shadow-lg uppercase tracking-widest active:scale-95"
                  >
                     Avançar <ArrowRightIcon className="h-4 w-4 ml-2" />
                  </button>
               ) : (
                  <button 
                     onClick={handleSubmit} 
                     disabled={loading}
                     className="flex items-center px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white disabled:bg-gray-700 text-xs font-black rounded-xl transition-all shadow-lg uppercase tracking-widest active:scale-95"
                  >
                     {loading ? 'Salvando...' : 'Finalizar & Enviar p/ CRM'}
                  </button>
               )}
            </div>
        </div>
    </div>
  )
}
