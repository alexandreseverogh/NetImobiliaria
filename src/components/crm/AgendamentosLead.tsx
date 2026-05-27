'use client'

import React, { useState, useEffect } from 'react'
import {
  CalendarDaysIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { useTheme } from '@/hooks/useTheme'

interface Agendamento {
  id: string
  data_hora_inicio: string
  data_hora_fim: string
  status: 'agendado' | 'confirmado' | 'cancelado' | 'realizado'
  corretor_nome?: string
  imovel_id?: number
  observacoes?: string
}

interface Props {
  leadUuid: string
  onAgendar?: () => void
}

const STATUS_CONFIG = {
  agendado:   { label: 'Agendado',   color: 'text-blue-500',    bg: 'bg-blue-500/10 border-blue-500/20',    icon: CalendarDaysIcon },
  confirmado: { label: 'Confirmado', color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20', icon: CheckCircleIcon },
  realizado:  { label: 'Realizado',  color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20', icon: CheckCircleIcon },
  cancelado:  { label: 'Cancelado',  color: 'text-red-500',     bg: 'bg-red-500/10 border-red-500/20',      icon: XCircleIcon },
}

function formatarDH(iso: string) {
  const d = new Date(iso)
  return {
    data:  d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'America/Recife' }),
    hora:  d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Recife' }),
  }
}

export default function AgendamentosLead({ leadUuid, onAgendar }: Props) {
  const t = useTheme()
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [loading, setLoading] = useState(true)
  const [cancelingId, setCancelingId] = useState<string | null>(null)

  useEffect(() => {
    if (leadUuid) loadAgendamentos()
  }, [leadUuid])

  const loadAgendamentos = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/crm/agendamentos?lead_uuid=${leadUuid}`)
      const data = await res.json()
      if (data.success) setAgendamentos(data.agendamentos)
    } catch (e) { /* silent */ } finally { setLoading(false) }
  }

  const handleCancelar = async (id: string) => {
    if (!confirm('Tem certeza que deseja cancelar esta visita? O evento será removido dos dois Google Calendars.')) return
    setCancelingId(id)
    try {
      const res = await fetch(`/api/crm/agendamentos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelado' }),
      })
      if (res.ok) {
        setAgendamentos(prev =>
          prev.map(a => a.id === id ? { ...a, status: 'cancelado' } : a)
        )
      }
    } finally { setCancelingId(null) }
  }

  if (loading) return (
    <div className={`text-center py-4 text-xs italic ${t.textMuted} animate-pulse`}>
      Carregando histórico de visitas...
    </div>
  )

  return (
    <div className="space-y-3">
      <div className={`flex items-center justify-between`}>
        <div className={`flex items-center space-x-2 text-xs font-black uppercase tracking-widest ${t.textMuted}`}>
          <CalendarDaysIcon className="h-4 w-4 text-blue-500" />
          <span>Histórico de Visitas</span>
          {agendamentos.length > 0 && (
            <span className="bg-blue-500/10 text-blue-500 border border-blue-500/20 px-2 py-0.5 rounded-full text-[10px]">
              {agendamentos.length}
            </span>
          )}
        </div>
        {onAgendar && (
          <button
            onClick={onAgendar}
            className="text-[10px] font-bold text-blue-500 hover:text-blue-400 transition-colors"
          >
            + Nova visita
          </button>
        )}
      </div>

      {agendamentos.length === 0 ? (
        <div className={`text-center py-6 rounded-2xl border border-dashed ${t.borderSub} ${t.isDark ? 'bg-white/[0.02]' : 'bg-gray-50'}`}>
          <CalendarDaysIcon className={`h-8 w-8 mx-auto mb-2 ${t.textMuted}`} />
          <p className={`text-xs font-medium ${t.textMuted}`}>Nenhuma visita agendada ainda</p>
        </div>
      ) : (
        <div className="space-y-2">
          {agendamentos.map(ag => {
            const cfg = STATUS_CONFIG[ag.status] || STATUS_CONFIG.agendado
            const StatusIcon = cfg.icon
            const { data, hora } = formatarDH(ag.data_hora_inicio)
            const { hora: horaFim } = formatarDH(ag.data_hora_fim)
            const isPast = new Date(ag.data_hora_inicio) < new Date()
            const isCancelable = ag.status !== 'cancelado' && ag.status !== 'realizado'

            return (
              <div
                key={ag.id}
                className={`flex items-start justify-between p-4 rounded-2xl border transition-all ${cfg.bg} ${isPast && ag.status === 'agendado' ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start space-x-3">
                  <div className={`mt-0.5 p-1.5 rounded-lg ${t.isDark ? 'bg-black/20' : 'bg-white/60'}`}>
                    <StatusIcon className={`h-4 w-4 ${cfg.color}`} />
                  </div>
                  <div>
                    <div className={`text-xs font-bold ${cfg.color} uppercase tracking-widest`}>
                      {cfg.label}
                    </div>
                    <div className={`text-sm font-semibold mt-0.5 ${t.textPrimary}`}>
                      {data} • {hora}–{horaFim}
                    </div>
                    {ag.corretor_nome && (
                      <div className={`text-[10px] font-medium mt-0.5 ${t.textMuted}`}>
                        Corretor: {ag.corretor_nome}
                      </div>
                    )}
                    {ag.observacoes && (
                      <div className={`text-[10px] italic mt-1 ${t.textSecondary}`}>
                        "{ag.observacoes}"
                      </div>
                    )}
                  </div>
                </div>

                {isCancelable && (
                  <button
                    onClick={() => handleCancelar(ag.id)}
                    disabled={cancelingId === ag.id}
                    className={`ml-2 flex-shrink-0 p-1.5 rounded-lg transition-all ${t.isDark ? 'hover:bg-red-500/20 text-red-500/50 hover:text-red-500' : 'hover:bg-red-50 text-red-300 hover:text-red-500'} disabled:opacity-30`}
                    title="Cancelar visita"
                  >
                    <XCircleIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
