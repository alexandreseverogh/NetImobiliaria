'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  CalendarDaysIcon,
  ClockIcon,
  CheckCircleIcon,
  XMarkIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ExclamationTriangleIcon,
  LinkIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline'
import { useTheme } from '@/hooks/useTheme'
import { useAuth } from '@/hooks/useAuth'

interface Slot {
  inicio: string
  fim: string
  disponivel: boolean
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  lead: {
    lead_uuid: string
    nome: string
    email?: string
    imovel_id?: number | null
    coluna_nome?: string
  }
  /** Configuração do tenant (vem do pai via /api/crm/config/tenant) */
  tenantConfig: {
    calendario: boolean
    duracao_visita: number
    empresa_configurada: boolean
    google_calendar_authorized: boolean
    has_google_token: boolean
  }
}

type Step = 'connect' | 'date' | 'slot' | 'confirm' | 'success'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    timeZone: 'America/Recife',
  })
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Recife',
  })
}

export default function AgendarVisitaModal({ isOpen, onClose, onSuccess, lead, tenantConfig }: Props) {
  const t = useTheme()
  const { user } = useAuth()
  const tenantId = user?.currentTenant?.id
  const [step, setStep] = useState<Step>('date')
  const [selectedDate, setSelectedDate] = useState('')
  const [slots, setSlots] = useState<Slot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [observacoes, setObservacoes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [agendamentoId, setAgendamentoId] = useState('')

  // Calendário visual — mês atual
  const today = new Date()
  const [calMonth, setCalMonth] = useState({ year: today.getFullYear(), month: today.getMonth() })

  useEffect(() => {
    if (isOpen) {
      const isConfigured = tenantConfig.google_calendar_authorized && tenantConfig.has_google_token
      setStep(isConfigured ? 'date' : 'connect')
      setSelectedDate('')
      setSlots([])
      setSelectedSlot(null)
      setObservacoes('')
      setError('')
    }
  }, [isOpen, tenantConfig.google_calendar_authorized, tenantConfig.has_google_token])

  // ── Calendário ─────────────────────────────────────────────

  const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate()
  const firstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay()

  const calDays = () => {
    const { year: y, month: m } = calMonth
    const total = daysInMonth(y, m)
    const startDay = firstDayOfMonth(y, m)
    const days: (number | null)[] = Array(startDay).fill(null)
    for (let d = 1; d <= total; d++) days.push(d)
    return days
  }

  const formatCalDate = (day: number) => {
    const m = String(calMonth.month + 1).padStart(2, '0')
    const d = String(day).padStart(2, '0')
    return `${calMonth.year}-${m}-${d}`
  }

  const isPastDay = (day: number) => {
    const date = new Date(formatCalDate(day) + 'T00:00:00')
    const compareDate = new Date()
    compareDate.setHours(0, 0, 0, 0)
    return date < compareDate
  }

  const handleSelectDate = async (day: number) => {
    if (isPastDay(day)) return
    const dateStr = formatCalDate(day)
    setSelectedDate(dateStr)
    setSelectedSlot(null)
    setSlots([])
    setError('')
    setLoadingSlots(true)

    try {
      const res = await fetch(`/api/crm/agendamentos/disponibilidade?data=${dateStr}&tenantId=${tenantId}`)
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Erro ao buscar disponibilidade')
        return
      }
      setSlots(data.slots || [])
      setStep('slot')
    } catch {
      setError('Falha de conexão ao verificar disponibilidade')
    } finally {
      setLoadingSlots(false)
    }
  }

  // ── Submit ─────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!selectedSlot) return
    setSubmitting(true)
    setError('')
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('admin-auth-token') : null
      const res = await fetch('/api/crm/agendamentos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          lead_uuid: lead.lead_uuid,
          tenant_id: tenantId,
          data_hora_inicio: selectedSlot.inicio,
          observacoes: observacoes || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Erro ao criar agendamento')
        return
      }
      setAgendamentoId(data.agendamento?.id || '')
      setStep('success')
    } catch {
      setError('Falha de conexão ao criar agendamento')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Progresso ──────────────────────────────────────────────

  const stepProgress: Record<Step, number> = {
    connect: 0, date: 1, slot: 2, confirm: 3, success: 4,
  }
  const totalSteps = 3

  if (!isOpen) return null

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className={`relative w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 ${t.isDark ? 'bg-[#0f1629] border border-white/10' : 'bg-white border border-gray-200'}`}>

        {/* Header */}
        <div className="relative bg-gradient-to-r from-blue-700 to-indigo-700 p-6">
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center">
                <CalendarDaysIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-white font-black text-base uppercase tracking-tight">Agendar Visita</h2>
                <p className="text-blue-200 text-xs font-medium mt-0.5 truncate max-w-[220px]">
                  {lead.nome || 'Lead'}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition-all">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Steps indicator */}
          {step !== 'connect' && step !== 'success' && (
            <div className="relative flex items-center space-x-2 mt-5">
              {['Data', 'Horário', 'Confirmar'].map((label, i) => {
                const active = stepProgress[step] === i + 1
                const done = stepProgress[step] > i + 1
                return (
                  <React.Fragment key={label}>
                    <div className="flex items-center space-x-1.5">
                      <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-black border transition-all ${
                        done ? 'bg-emerald-500 border-emerald-400 text-white' :
                        active ? 'bg-white border-white text-blue-700' :
                        'bg-white/10 border-white/20 text-white/50'
                      }`}>
                        {done ? '✓' : i + 1}
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider hidden sm:block ${
                        active ? 'text-white' : done ? 'text-emerald-300' : 'text-white/40'
                      }`}>{label}</span>
                    </div>
                    {i < 2 && <div className={`flex-1 h-px ${done ? 'bg-emerald-400/50' : 'bg-white/15'}`} />}
                  </React.Fragment>
                )
              })}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="p-6 max-h-[65vh] overflow-y-auto">

          {/* Error */}
          {error && (
            <div className="mb-4 flex items-start space-x-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-400 font-medium">{error}</p>
            </div>
          )}

          {/* ── Step: Conectar Google ── */}
          {step === 'connect' && (
            <div className="text-center py-4 space-y-6">
              <div className="mx-auto w-20 h-20 rounded-3xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <CalendarDaysIcon className="h-10 w-10 text-blue-500" />
              </div>
              <div>
                <h3 className={`text-lg font-black ${t.textPrimary}`}>Conectar Google Calendar</h3>
                <p className={`text-sm mt-2 leading-relaxed ${t.textSecondary}`}>
                  Para agendar visitas é necessário autorizar o acesso ao seu Google Calendar.
                  Isso permite verificar sua disponibilidade e criar os eventos automaticamente.
                </p>
              </div>
              <a
                href={`/api/auth/google/authorize?returnUrl=${encodeURIComponent('/crm/kanban')}`}
                className="flex items-center justify-center w-full px-6 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-500/20 text-sm gap-2"
              >
                <LinkIcon className="h-4 w-4" />
                Conectar Google Calendar
              </a>
              <p className={`text-[10px] ${t.textMuted}`}>
                Você será redirecionado ao Google e voltará automaticamente após autorizar.
              </p>
            </div>
          )}

          {/* ── Step: Selecionar Data ── */}
          {step === 'date' && (
            <div className="space-y-4">
              {/* Nav mês */}
              <div className="flex items-center justify-between">
                <button onClick={() => setCalMonth(prev => {
                  const d = new Date(prev.year, prev.month - 1)
                  return { year: d.getFullYear(), month: d.getMonth() }
                })} className={`p-2 rounded-xl transition-all ${t.hoverBg} ${t.textMuted}`}>
                  <ArrowLeftIcon className="h-4 w-4" />
                </button>
                <span className={`text-sm font-black uppercase tracking-widest ${t.textPrimary}`}>
                  {new Date(calMonth.year, calMonth.month).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </span>
                <button onClick={() => setCalMonth(prev => {
                  const d = new Date(prev.year, prev.month + 1)
                  return { year: d.getFullYear(), month: d.getMonth() }
                })} className={`p-2 rounded-xl transition-all ${t.hoverBg} ${t.textMuted}`}>
                  <ArrowRightIcon className="h-4 w-4" />
                </button>
              </div>

              {/* Dias da semana */}
              <div className="grid grid-cols-7 gap-1">
                {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                  <div key={i} className={`text-center text-[10px] font-black py-1 ${t.textMuted} uppercase`}>{d}</div>
                ))}
                {calDays().map((day, i) => {
                  if (!day) return <div key={`e${i}`} />
                  const isToday = formatCalDate(day) === today.toISOString().slice(0, 10)
                  const isSelected = formatCalDate(day) === selectedDate
                  const isPast = isPastDay(day)
                  return (
                    <button
                      key={day}
                      onClick={() => !isPast && handleSelectDate(day)}
                      disabled={isPast}
                      className={`h-9 w-full rounded-xl text-sm font-bold transition-all ${
                        isSelected ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' :
                        isToday ? `${t.isDark ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-blue-50 text-blue-600 border border-blue-200'}` :
                        isPast ? `${t.isDark ? 'text-white/10' : 'text-gray-200'} cursor-not-allowed` :
                        `${t.textPrimary} ${t.hoverBg}`
                      }`}
                    >
                      {day}
                    </button>
                  )
                })}
              </div>

              {loadingSlots && (
                <div className={`text-center py-4 text-xs italic animate-pulse ${t.textMuted}`}>
                  Verificando disponibilidade...
                </div>
              )}
            </div>
          )}

          {/* ── Step: Selecionar Horário ── */}
          {step === 'slot' && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <button onClick={() => { setStep('date'); setSelectedSlot(null) }}
                  className={`p-2 rounded-xl ${t.hoverBg} ${t.textMuted} transition-all`}>
                  <ArrowLeftIcon className="h-4 w-4" />
                </button>
                <div>
                  <p className={`text-xs font-black uppercase tracking-widest ${t.textMuted}`}>Data selecionada</p>
                  <p className={`text-sm font-bold ${t.textPrimary}`}>
                    {selectedDate && formatDate(selectedDate + 'T12:00:00')}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {slots.length === 0 ? (
                  <div className={`col-span-3 text-center py-8 text-sm ${t.textMuted} italic`}>
                    Nenhum horário disponível nesta data
                  </div>
                ) : slots.map((slot, i) => (
                  <button
                    key={i}
                    onClick={() => { if (slot.disponivel) { setSelectedSlot(slot); setStep('confirm') } }}
                    disabled={!slot.disponivel}
                    className={`py-3 px-2 rounded-2xl text-sm font-bold text-center border transition-all ${
                      selectedSlot?.inicio === slot.inicio
                        ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20'
                        : slot.disponivel
                          ? `${t.cardBg} ${t.textPrimary} hover:border-blue-500/40 cursor-pointer`
                          : `${t.isDark ? 'bg-white/[0.02] border-white/5 text-white/15' : 'bg-gray-50 border-gray-100 text-gray-200'} cursor-not-allowed line-through`
                    }`}
                  >
                    <div>{formatTime(slot.inicio)}</div>
                    {!slot.disponivel && <div className="text-[9px] mt-0.5 font-medium uppercase">Ocupado</div>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Step: Confirmar ── */}
          {step === 'confirm' && selectedSlot && (
            <div className="space-y-5">
              <button onClick={() => setStep('slot')}
                className={`flex items-center space-x-1 text-xs ${t.textMuted} hover:text-blue-500 transition-colors`}>
                <ArrowLeftIcon className="h-3 w-3" />
                <span>Alterar horário</span>
              </button>

              {/* Resumo */}
              <div className={`p-5 rounded-2xl ${t.cardInner} space-y-3`}>
                <div className={`text-[10px] font-black uppercase tracking-widest ${t.textMuted} flex items-center space-x-1`}>
                  <CalendarDaysIcon className="h-3 w-3" />
                  <span>Resumo da Visita</span>
                </div>
                {[
                  ['📅 Data',     formatDate(selectedSlot.inicio)],
                  ['🕐 Horário',  `${formatTime(selectedSlot.inicio)} — ${formatTime(selectedSlot.fim)}`],
                  ['👤 Cliente',  lead.nome || '—'],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between items-start gap-2">
                    <span className={`text-xs ${t.textMuted}`}>{label}</span>
                    <span className={`text-xs font-semibold text-right ${t.textPrimary}`}>{value}</span>
                  </div>
                ))}
              </div>

              {/* Observações */}
              <div>
                <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${t.textMuted}`}>
                  Observações (opcional)
                </label>
                <textarea
                  value={observacoes}
                  onChange={e => setObservacoes(e.target.value)}
                  rows={3}
                  placeholder="Instruções para o cliente, ponto de encontro..."
                  className={`w-full rounded-2xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-blue-500/50 transition-all ${t.inputBg}`}
                />
              </div>

              <div className={`flex items-start space-x-2 p-3 rounded-xl ${t.isDark ? 'bg-blue-500/5 border border-blue-500/15' : 'bg-blue-50 border border-blue-100'}`}>
                <CalendarDaysIcon className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className={`text-[10px] leading-relaxed ${t.textSecondary}`}>
                  Um evento será criado no seu Google Calendar e no calendário da empresa.
                  E-mails de confirmação serão enviados para você e para o cliente.
                </p>
              </div>
            </div>
          )}

          {/* ── Step: Sucesso ── */}
          {step === 'success' && (
            <div className="text-center py-4 space-y-5">
              <div className="mx-auto w-20 h-20 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                <CheckCircleIcon className="h-10 w-10 text-emerald-500" />
              </div>
              <div>
                <h3 className={`text-xl font-black ${t.textPrimary}`}>Visita Agendada!</h3>
                <p className={`text-sm mt-2 leading-relaxed ${t.textSecondary}`}>
                  O evento foi criado no Google Calendar e os e-mails de confirmação foram enviados.
                </p>
              </div>
              <div className={`p-4 rounded-2xl ${t.cardInner} text-left space-y-2`}>
                {selectedSlot && [
                  ['📅', formatDate(selectedSlot.inicio)],
                  ['🕐', `${formatTime(selectedSlot.inicio)} — ${formatTime(selectedSlot.fim)}`],
                  ['👤', lead.nome || '—'],
                ].map(([icon, text]) => (
                  <div key={icon} className={`flex items-center space-x-2 text-sm ${t.textSecondary}`}>
                    <span>{icon}</span>
                    <span className="font-medium">{text}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => { onSuccess(); onClose() }}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-emerald-500/20 text-sm"
              >
                Concluir
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {(step === 'confirm') && (
          <div className={`p-4 border-t ${t.borderSub} ${t.isDark ? 'bg-black/20' : 'bg-gray-50'}`}>
            <button
              onClick={handleSubmit}
              disabled={submitting || !selectedSlot}
              className="w-full flex items-center justify-center gap-2 py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-500 text-white font-black rounded-2xl transition-all shadow-lg text-sm uppercase tracking-wider active:scale-95"
            >
              {submitting ? (
                <><div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Criando evento...</>
              ) : (
                <><PaperAirplaneIcon className="h-4 w-4" />Confirmar Agendamento</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
