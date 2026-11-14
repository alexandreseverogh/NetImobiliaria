'use client'

import React from 'react'
import {
  XMarkIcon,
  SparklesIcon,
  ChatBubbleBottomCenterTextIcon,
  ChatBubbleLeftRightIcon,
  UsersIcon,
  ArrowUturnLeftIcon,
  CalendarDaysIcon,
  CheckBadgeIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import { useTheme } from '@/hooks/useTheme'
import AgendarVisitaModal from '@/components/crm/AgendarVisitaModal'
import AtividadesLead from '@/components/crm/AtividadesLead'
import LeadTimeline from '@/components/crm/LeadTimeline'
import NextBestActionCard from '@/components/crm/NextBestActionCard'
import type { FichaLead, LeadFichaApi } from '@/components/crm/useLeadFicha'

/** Telefone formatado para exibição (mesma regra usada nas listas do CRM). */
export const formatPhone = (phone?: string | null) => {
  if (!phone) return 'S/ Telefone'
  const c = phone.replace(/\D/g, '')
  if (c.length === 11) return `(${c.slice(0, 2)}) ${c.slice(2, 7)}-${c.slice(7)}`
  if (c.length === 10) return `(${c.slice(0, 2)}) ${c.slice(2, 6)}-${c.slice(6)}`
  return phone
}

/**
 * FICHA COMPLETA DO LEAD — único componente de exibição usado pelo Kanban e pela página de
 * Leads. Recebe o retorno de useLeadFicha(). Renderiza também o modal "Negócio Fechado" (quando
 * um lead vai para etapa de Ganho) e o de Agendar Visita, porque ambos nascem dentro da ficha.
 */
export default function LeadFichaModal<L extends FichaLead>({ ficha }: { ficha: LeadFichaApi<L> }) {
  const t = useTheme()
  const {
    colunas, selectedLead, closeLead, tenantConfig,
    fichaRawJsonEdits, setFichaRawJsonEdits, fichaMensagemEdit, setFichaMensagemEdit,
    fichaValorEstimadoInput, setFichaValorEstimadoInput,
    fichaInfoDirty, saveFichaInfoLeadCombined, savingInfoLead, savingValorEstimado,
    ativoFormSchema, movingLead, deletingLead, moveLead, getNextColumn, getPrevColumn,
    handleDeleteLead, handleRestoreLead,
    isAgendarOpen, setIsAgendarOpen, bumpAgendamentos,
    atividadeAction, setAtividadeAction, novaAtividadeNonce, activityPrefill,
    handleUseSuggestionAsActivity,
    pendingGanhoMove, valorVendaInput, setValorVendaInput, confirmGanhoMove, cancelGanhoMove,
    referenceValueField,
  } = ficha

  return (
    <>
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className={`${t.modalBg} w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border ${t.borderSub}`}>
            <div className={`relative p-6 border-b ${t.borderSub} bg-gradient-to-br from-blue-600/10 to-indigo-600/5`}>
              <button onClick={closeLead}
                className={`absolute right-6 top-1/2 -translate-y-1/2 p-2 ${t.textMuted} ${t.hoverBg} rounded-full transition-all`}>
                <XMarkIcon className="h-6 w-6" />
              </button>
              <div className="flex items-center space-x-5">
                <div className="h-14 w-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30 overflow-hidden">
                  {selectedLead.contato_avatar_url ? (
                    <img src={selectedLead.contato_avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <UsersIcon className="h-8 w-8" />
                  )}
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
                {/* Coluna 1: Informações do Lead — todo campo que o lead trouxe na criação é
                    editável; um único botão salva tudo, só quando há alteração real pendente. */}
                <div className={`p-5 ${t.cardBg} rounded-3xl border-emerald-500/20 border relative`}>
                  <div className="absolute -top-3 left-6 flex items-center space-x-2 bg-emerald-600 text-[9px] font-bold text-white px-3 py-0.5 rounded-full uppercase shadow-lg shadow-emerald-500/20">
                    <CheckBadgeIcon className="h-3 w-3" /><span>Informações do Lead</span>
                  </div>
                  <div className="mt-4 space-y-4">
                    {ativoFormSchema.filter(f => f.type !== 'currency').length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {ativoFormSchema.filter(f => f.type !== 'currency').map((field) => (
                          <div key={field.name} className={`space-y-1 ${field.type === 'text' ? 'md:col-span-2' : ''}`}>
                            <label className={`block text-[9px] font-black uppercase tracking-widest ml-1 ${t.textMuted}`}>{field.label}</label>
                            <input
                              type={field.type === 'number' ? 'number' : 'text'}
                              value={fichaRawJsonEdits[field.name] ?? ''}
                              onChange={e => setFichaRawJsonEdits(prev => ({ ...prev, [field.name]: e.target.value }))}
                              className={`w-full rounded-xl py-2 px-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${t.isDark ? t.inputBg : 'bg-emerald-50/60 text-slate-800 border border-emerald-200'}`}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {!selectedLead.enriquecimento_cache && ativoFormSchema.length === 0 && (
                      <p className={`text-xs italic ${t.textMuted}`}>Nenhum campo de Perfil de Interesse configurado para este segmento.</p>
                    )}
                  </div>
                </div>

                {/* Coluna 2: Análise IA */}
                <div className={`p-5 ${t.cardBg} rounded-3xl border border-blue-500/20 relative self-start`}>
                  <div className="absolute -top-3 left-6 flex items-center space-x-2 bg-blue-600 text-[9px] font-bold text-white px-3 py-0.5 rounded-full uppercase shadow-lg shadow-blue-500/20">
                    <SparklesIcon className="h-3 w-3" /><span>Análise por IA</span>
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

                    {/* Intenção e Aderência — 2 dimensões separadas, nunca combinadas. */}
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      {[
                        {
                          label: 'Intenção',
                          val: selectedLead.score_prontidao != null ? `${selectedLead.score_prontidao}%` : 'Não avaliado',
                          bg: t.isDark ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-200',
                          fg: t.isDark ? 'text-blue-400' : 'text-blue-700',
                        },
                        {
                          label: 'Aderência',
                          val: selectedLead.score_fit != null ? `${selectedLead.score_fit}%` : '—',
                          bg: t.isDark ? 'bg-violet-500/10 border-violet-500/20' : 'bg-violet-50 border-violet-200',
                          fg: t.isDark ? 'text-violet-400' : 'text-violet-700',
                        },
                      ].map(({ label, val, bg, fg }) => (
                        <div key={label} className={`p-3 rounded-xl border ${bg}`}>
                          <p className={`text-[9px] font-bold uppercase tracking-widest mb-1 ${fg}`}>{label}</p>
                          <span className={`text-lg font-bold ${fg}`}>{val}</span>
                        </div>
                      ))}
                    </div>

                    {selectedLead.valor_venda != null && (
                      <div className="mt-3 p-3 rounded-xl border bg-emerald-500/5 border-emerald-500/20">
                        <p className="text-[9px] font-bold uppercase tracking-widest mb-1 text-emerald-500">Valor Fechado (real)</p>
                        <span className="text-lg font-bold text-emerald-500">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedLead.valor_venda)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Terceiro container, largura total: Mensagem que originou o lead + Valor Estimado */}
              <div className={`p-5 ${t.cardBg} rounded-3xl border-emerald-500/20 border relative`}>
                <div className="absolute -top-3 left-6 flex items-center space-x-2 bg-emerald-600 text-[9px] font-bold text-white px-3 py-0.5 rounded-full uppercase shadow-lg shadow-emerald-500/20">
                  <ChatBubbleLeftRightIcon className="h-3 w-3" /><span>Mensagem e Valor Estimado</span>
                </div>
                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 flex flex-col space-y-1">
                      <label className={`block text-[9px] font-black uppercase tracking-widest ml-1 flex items-center gap-1.5 ${t.textMuted}`}>
                        <ChatBubbleLeftRightIcon className="h-3.5 w-3.5" />Mensagem que originou o lead (WhatsApp)
                      </label>
                      <textarea
                        value={fichaMensagemEdit}
                        onChange={e => setFichaMensagemEdit(e.target.value)}
                        rows={3}
                        placeholder="Nenhuma mensagem registrada."
                        className={`w-full rounded-xl py-2 px-3 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-y max-h-48 ${t.isDark ? t.inputBg : 'bg-emerald-50/60 text-slate-800 border border-emerald-200'}`}
                      />
                    </div>

                    {/* Valor Estimado — editável enquanto a etapa não é terminal */}
                    {(() => {
                      const currentCol = colunas.find(c => c.nome === selectedLead.coluna_nome)
                      const isTerminal = !!(currentCol?.is_ganho || currentCol?.is_perda)
                      return (
                        <div className="flex flex-col space-y-1">
                          <label className={`block text-[9px] font-black uppercase tracking-widest ml-1 ${t.textMuted}`}>Valor Estimado</label>
                          <div className={`flex-1 flex items-center p-3 rounded-xl border ${t.isDark ? 'bg-amber-500/5 border-amber-500/20' : 'bg-amber-50 border-amber-200'}`}>
                            {isTerminal ? (
                              <span className={`text-lg font-bold ${t.isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                                {selectedLead.valor_venda_estimado != null ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedLead.valor_venda_estimado) : '—'}
                              </span>
                            ) : (
                              <div className="relative w-full">
                                <span className={`absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold ${t.isDark ? 'text-amber-400' : 'text-amber-600'}`}>R$</span>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={fichaValorEstimadoInput}
                                  onChange={e => {
                                    const digits = e.target.value.replace(/\D/g, '')
                                    if (!digits) { setFichaValorEstimadoInput(''); return }
                                    const num = parseInt(digits, 10) / 100
                                    setFichaValorEstimadoInput(num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
                                  }}
                                  placeholder="0,00"
                                  className={`w-full rounded-lg py-1.5 pl-8 pr-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/30 ${t.isDark ? 'bg-black/20 text-amber-300' : 'bg-white text-amber-700 border border-amber-200'}`}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })()}
                  </div>

                  <button
                    type="button"
                    onClick={saveFichaInfoLeadCombined}
                    disabled={!fichaInfoDirty.any || savingInfoLead || savingValorEstimado}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${(!fichaInfoDirty.any || savingInfoLead || savingValorEstimado) ? 'opacity-40 cursor-not-allowed' : ''} bg-emerald-600 hover:bg-emerald-500 text-white`}
                  >
                    <CheckBadgeIcon className="h-4 w-4" />
                    {(savingInfoLead || savingValorEstimado) ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                </div>
              </div>

              {/* Sugestão da IA — informativo, nunca bloqueante */}
              <NextBestActionCard
                leadUuid={selectedLead.lead_uuid}
                onUseAsActivity={handleUseSuggestionAsActivity}
              />

              {/* Histórico unificado: mensagens, atividades e visitas em ordem cronológica */}
              <div className={`p-5 ${t.cardBg} rounded-3xl border border-indigo-500/10`}>
                <LeadTimeline
                  leadUuid={selectedLead.lead_uuid}
                  isDark={t.isDark}
                  refreshKey={ficha.agendamentosVersion}
                  onAgendar={tenantConfig?.calendario ? () => setIsAgendarOpen(true) : undefined}
                  onAtividadeAction={(id, action) => setAtividadeAction({ id, action, nonce: Date.now() })}
                  onNovaAtividade={() => ficha.setNovaAtividadeNonce(Date.now())}
                />
              </div>

              {/* Formulário de nova atividade: aberto pela barra do Histórico */}
              <AtividadesLead
                leadUuid={selectedLead.lead_uuid}
                clientId={selectedLead.client_id}
                prefill={activityPrefill}
                hideList
                actionRequest={atividadeAction}
                onChanged={bumpAgendamentos}
                openNonce={novaAtividadeNonce}
              />
            </div>

            <div className={`p-6 border-t ${t.borderSub} ${t.isDark ? 'bg-black/20' : 'bg-gray-50'} flex flex-wrap items-center justify-between gap-3`}>
              {/* Exclusão/restauração — só na ficha, nunca no card do Kanban */}
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
                <button onClick={closeLead} className={`px-6 py-3 text-xs font-bold uppercase tracking-widest ${t.textMuted} hover:text-blue-500 transition-all`}>Fechar</button>
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

      {/* Modal "Negócio Fechado" — ao entrar numa etapa de Ganho (pelo drag-and-drop ou pela ficha) */}
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
            {referenceValueField && pendingGanhoMove.lead.raw_json?.[referenceValueField.name] && (
              <div className="mb-4">
                <label className={`block text-[9px] font-black uppercase tracking-widest ${t.textMuted} mb-2`}>
                  {referenceValueField.label} (declarado pelo lead)
                </label>
                <input
                  type="text"
                  disabled
                  value={String(pendingGanhoMove.lead.raw_json[referenceValueField.name])}
                  className={`w-full rounded-2xl py-3 px-4 text-sm font-bold cursor-not-allowed opacity-60 ${t.isDark ? t.inputBg : 'bg-slate-100 text-slate-500 border border-slate-200'}`}
                />
              </div>
            )}
            {pendingGanhoMove.lead.valor_venda_estimado != null && (
              <div className="mb-4">
                <label className={`block text-[9px] font-black uppercase tracking-widest ${t.textMuted} mb-2`}>
                  Valor Estimado
                </label>
                <input
                  type="text"
                  disabled
                  value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pendingGanhoMove.lead.valor_venda_estimado)}
                  className={`w-full rounded-2xl py-3 px-4 text-sm font-bold cursor-not-allowed opacity-60 ${t.isDark ? t.inputBg : 'bg-slate-100 text-slate-500 border border-slate-200'}`}
                />
              </div>
            )}
            <label className={`block text-[9px] font-black uppercase tracking-widest ${t.textMuted} mb-2`}>
              Valor de Fechamento (opcional)
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
                onClick={cancelGanhoMove}
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

      {/* Modal Agendar Visita */}
      {isAgendarOpen && selectedLead && tenantConfig && (
        <AgendarVisitaModal
          isOpen={isAgendarOpen}
          onClose={() => setIsAgendarOpen(false)}
          onSuccess={() => { setIsAgendarOpen(false); bumpAgendamentos() }}
          lead={selectedLead as any}
          tenantConfig={tenantConfig}
        />
      )}
    </>
  )
}
