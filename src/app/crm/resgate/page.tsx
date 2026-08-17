'use client'

import React, { useState, useEffect } from 'react'
import { ExclamationTriangleIcon, ArrowPathIcon, UserIcon } from '@heroicons/react/24/outline'
import { useTheme } from '@/hooks/useTheme'
import { adminFetch } from '@/lib/auth/adminFetch'

/**
 * G4 — Fila de Resgate (docs/PLANO_PENDENCIA_ATENDIMENTO.md §4, degrau 4).
 *
 * Torna VISÍVEL o estado que era completamente silencioso: leads aguardando uma ação da equipe
 * que a máquina não conseguiu resolver sozinha. Antes desta tela, um lead sem responsável
 * simplesmente não aparecia em lugar nenhum — no banco de dev havia leads com telefone válido
 * parados por até 107 dias sem ninguém jamais ter levantado a mão sobre eles.
 *
 * A tela é deliberadamente somente-leitura: o sistema já retenta a atribuição sozinho a cada
 * varredura. O que ela precisa entregar é o DIAGNÓSTICO — por que estes leads estão parados —
 * porque a saída costuma estar fora do CRM (liberar alguém da ausência, cadastrar um atendente
 * com o papel de distribuição, revisar as estratégias do segmento).
 */

interface FilaItem {
  leadUuid: string
  nome: string | null
  telefone: string | null
  bolaDesde: string
  minutosParado: number
  motivo: 'sem_responsavel' | 'escada_esgotada'
  responsavelNome: string | null
  responsavelIndisponivel: boolean
}

function formatarEspera(minutos: number): string {
  if (minutos < 60) return `${minutos}min`
  const horas = Math.floor(minutos / 60)
  if (horas < 48) return `${horas}h`
  return `${Math.floor(horas / 24)}d`
}

export default function FilaResgatePage() {
  const t = useTheme()
  const [fila, setFila] = useState<FilaItem[]>([])
  const [semResponsavel, setSemResponsavel] = useState(0)
  const [loading, setLoading] = useState(true)

  const carregar = async () => {
    setLoading(true)
    try {
      const res = await adminFetch('/api/crm/pendencia/resgate')
      const data = await res.json()
      if (data.success) {
        setFila(data.fila || [])
        setSemResponsavel(data.semResponsavel || 0)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [])

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className={`text-2xl font-bold tracking-tight italic flex items-center ${t.textPrimary}`}>
            FILA <span className="text-orange-500 ml-2">DE RESGATE</span>
          </h2>
          <p className={`mt-1 text-sm ${t.textSecondary}`}>
            Leads aguardando uma ação da equipe que o sistema não conseguiu resolver sozinho.
          </p>
        </div>
        <button
          onClick={carregar}
          className={`flex items-center px-4 py-2 text-sm font-bold rounded-xl transition-all ${t.cardBg} ${t.textSecondary} hover:${t.textPrimary}`}
        >
          <ArrowPathIcon className="h-4 w-4 mr-2" />Atualizar
        </button>
      </div>

      {!loading && fila.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className={`${t.cardBg} rounded-2xl p-5`}>
            <div className={`text-xs font-bold uppercase tracking-widest ${t.textMuted}`}>Na fila</div>
            <div className={`mt-1 text-3xl font-black ${t.textPrimary}`}>{fila.length}</div>
          </div>
          <div className={`${t.cardBg} rounded-2xl p-5`}>
            <div className={`text-xs font-bold uppercase tracking-widest ${t.textMuted}`}>Sem nenhum responsável</div>
            <div className="mt-1 text-3xl font-black text-orange-500">{semResponsavel}</div>
          </div>
        </div>
      )}

      <div className={`${t.cardBg} rounded-2xl overflow-hidden`}>
        {loading ? (
          <div className={`p-10 text-center ${t.textMuted}`}>Carregando fila...</div>
        ) : fila.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">✅</div>
            <div className={`font-bold ${t.textPrimary}`}>Nenhum lead na fila de resgate</div>
            <p className={`mt-1 text-sm ${t.textMuted}`}>
              Todo lead que está aguardando atendimento tem responsável e ainda está dentro do prazo.
            </p>
          </div>
        ) : (
          <table className="min-w-full">
            <thead className={`${t.isDark ? 'bg-black/20' : 'bg-gray-50'}`}>
              <tr>
                {['Lead', 'Esperando há', 'Situação', 'Responsável'].map((h) => (
                  <th key={h} className={`px-6 py-4 text-left text-xs font-bold uppercase tracking-widest ${t.textMuted}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className={`divide-y ${t.borderSub}`}>
              {fila.map((item) => (
                <tr key={item.leadUuid} className={`group transition-colors ${t.hoverBg}`}>
                  <td className="px-6 py-4">
                    <div className={`text-sm font-medium ${t.textPrimary}`}>{item.nome || 'Lead sem nome'}</div>
                    {item.telefone && <div className={`text-xs ${t.textMuted}`}>{item.telefone}</div>}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-sm font-black ${item.minutosParado > 1440 ? 'text-red-500' : 'text-amber-500'}`}>
                      {formatarEspera(item.minutosParado)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {item.motivo === 'sem_responsavel' ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-orange-500/15 text-orange-500 border border-orange-500/30">
                        <ExclamationTriangleIcon className="h-3 w-3 mr-1" />Sem responsável
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-red-500/15 text-red-500 border border-red-500/30">
                        Escalonamento esgotado
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {item.responsavelNome ? (
                      <div className="flex items-center gap-2">
                        <UserIcon className={`h-4 w-4 ${t.textMuted}`} />
                        <span className={`text-sm ${t.textPrimary}`}>{item.responsavelNome}</span>
                        {item.responsavelIndisponivel && (
                          <span className="inline-flex px-1.5 py-0.5 text-[10px] font-bold rounded bg-orange-100 text-orange-700 uppercase">
                            Ausente
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className={`text-sm italic ${t.textMuted}`}>ninguém</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!loading && semResponsavel > 0 && (
        <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5 text-sm text-orange-900">
          <p className="font-bold">Por que há leads sem responsável?</p>
          <p className="mt-1">
            O sistema tenta atribuí-los automaticamente a cada varredura e continua tentando —
            mas nenhum atendente elegível foi encontrado. As causas mais comuns:
          </p>
          <ul className="mt-2 space-y-1 list-disc pl-5">
            <li>Todos os atendentes do segmento estão marcados como ausentes.</li>
            <li>Nenhum usuário tem o cargo usado pela distribuição deste segmento.</li>
            <li>As estratégias do segmento exigem algo que ninguém atende (ex.: área geográfica cadastrada).</li>
          </ul>
          <p className="mt-2">
            Assim que um atendente ficar elegível, estes leads saem da fila sozinhos — sem ninguém
            precisar reprocessá-los manualmente.
          </p>
        </div>
      )}
    </div>
  )
}
