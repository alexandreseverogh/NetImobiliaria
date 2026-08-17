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

  // Step 2 State: Vínculo Exato (item real de inventário do segmento) vs Perfil de Interesse
  const [modoSelecao, setModoSelecao] = useState<'exato' | 'perfil'>('perfil')
  const [ativoDisponivel, setAtivoDisponivel] = useState(false)
  const [ativoLabel, setAtivoLabel] = useState('Item')
  const [ativoSearch, setAtivoSearch] = useState('')
  const [ativoResults, setAtivoResults] = useState<any[]>([])
  const [selectedAtivo, setSelectedAtivo] = useState<any>(null)

  const [formSchema, setFormSchema] = useState<FormSchemaField[]>([])
  const [customData, setCustomData] = useState<any>({})

  // Demanda do cliente — texto livre, sempre disponível independente de config de segmento.
  // Alimenta ConciergeService.qualifyLead como `mensagem` (docs/CHECKPOINT.md, 2026-08-14).
  const [demanda, setDemanda] = useState('')

  useEffect(() => {
    if (isOpen) {
       // Reset state
       setStep(1)
       setModoSelecao('perfil')
       setClientSearch('')
       setNome('')
       setEmail('')
       setTelefone('')
       setSelectedClient(null)
       setSelectedAtivo(null)
       setAtivoSearch('')
       setCustomData({})
       setDemanda('')

       // Config do ativo (Vínculo Exato) + formulário de Perfil de Interesse do segmento —
       // endpoint leve, não exige permissão de editar o Segment Builder (docs/CHECKPOINT.md,
       // 2026-08-14) já que qualquer atendente comum precisa disso pra criar um lead.
       fetch('/api/crm/ativo/config', { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                setAtivoDisponivel(!!data.available)
                if (data.available) {
                  setAtivoLabel(data.label || 'Item')
                  setModoSelecao('exato')
                }
                setFormSchema(data.formSchema || [])
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

  // Ativo Search Hook (item real de inventário do segmento — imóvel, veículo, etc.)
  useEffect(() => {
    if (ativoSearch.length >= 2) {
      const delay = setTimeout(() => {
        fetch(`/api/crm/ativo/search?q=${encodeURIComponent(ativoSearch)}`, { credentials: 'include' })
          .then(res => res.json())
          .then(data => setAtivoResults(data.items || []))
      }, 300)
      return () => clearTimeout(delay)
    } else {
      setAtivoResults([])
    }
  }, [ativoSearch])

  const selectClient = (c: any) => {
    setSelectedClient(c)
    setNome(c.nome)
    setEmail(c.email || '')
    setTelefone(c.telefone || '')
    setClientSearch('')
    setClientResults([])
  }

  const selectAtivo = (item: any) => {
    setSelectedAtivo(item)
    setAtivoSearch('')
    setAtivoResults([])
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
         imovel_id: modoSelecao === 'exato' && selectedAtivo ? selectedAtivo.id : null,
         raw_json: modoSelecao === 'perfil' ? customData : {},
         mensagem: demanda,
         utm_source: 'CRM Manual'
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
                     </div>
                  </div>
               )}

               {step === 2 && (
                  <div className="space-y-6 animate-in slide-in-from-right-4">
                     {/* Choice Tabs — "Vínculo Exato" só existe se o segmento/tenant tiver um
                         ativo configurado (imóvel, veículo, etc.); sem isso, vai direto pro
                         Perfil de Interesse, sem oferecer uma busca quebrada. */}
                     <div className="flex p-1 bg-black/40 rounded-xl space-x-1">
                        {ativoDisponivel && (
                           <button
                              onClick={() => setModoSelecao('exato')}
                              className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${modoSelecao === 'exato' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                           >
                              Vínculo Exato
                           </button>
                        )}
                        <button
                           onClick={() => setModoSelecao('perfil')}
                           className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${modoSelecao === 'perfil' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                        >
                           Perfil de Interesse
                        </button>
                     </div>

                     {/* Demanda do cliente — texto livre, sempre disponível independente de
                         config de segmento; alimenta a IA de qualificação em qualquer modo. */}
                     <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Demanda do Cliente</label>
                        <textarea
                           value={demanda}
                           onChange={e => setDemanda(e.target.value)}
                           rows={3}
                           className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-white text-sm focus:border-blue-500 outline-none transition-all resize-none"
                           placeholder="O que o cliente disse/pediu, em texto livre (opcional, mas ajuda muito a IA a qualificar o lead)"
                        />
                     </div>

                     {modoSelecao === 'exato' && ativoDisponivel && (
                        <div className="space-y-4 pt-2">
                           <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center text-sm text-blue-300">
                              <CheckBadgeIcon className="h-5 w-5 mr-3 flex-shrink-0" />
                              Use esta opção se você já sabe exatamente qual {ativoLabel.toLowerCase()} (ou Ref/ID) o cliente quer.
                           </div>

                           <div className="space-y-2 relative">
                               <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Pesquisar {ativoLabel}</label>
                               <div className="relative">
                                 <BuildingOfficeIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                 <input
                                   type="text"
                                   value={ativoSearch}
                                   onChange={(e) => setAtivoSearch(e.target.value)}
                                   placeholder="Nome ou ID..."
                                   className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                                 />
                               </div>
                               {/* Dropdown Results */}
                               {ativoResults.length > 0 && (
                                  <div className="absolute top-16 left-0 w-full bg-[#1e293b] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-10 max-h-48 overflow-y-auto">
                                     {ativoResults.map((item, i) => (
                                       <div
                                          key={i}
                                          onClick={() => selectAtivo(item)}
                                          className="p-3 hover:bg-white/5 cursor-pointer border-b border-white/5 last:border-0"
                                       >
                                          <div className="text-sm font-bold text-white">[{item.id}] {item.nome}</div>
                                       </div>
                                     ))}
                                  </div>
                               )}
                           </div>

                           {/* Selected Tag */}
                           {selectedAtivo && (
                               <div className="p-4 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between">
                                  <div>
                                     <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">{ativoLabel} Vinculado</div>
                                     <div className="text-white text-sm mt-1">{selectedAtivo.nome}</div>
                                  </div>
                                  <button onClick={() => setSelectedAtivo(null)} className="text-gray-500 hover:text-red-400"><XMarkIcon className="h-5 w-5"/></button>
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
