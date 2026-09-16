'use client'

import { UserGroupIcon, ChatBubbleBottomCenterTextIcon } from '@heroicons/react/24/outline'
import { useTheme } from '@/hooks/useTheme'

export interface VendedorPerformance {
  id: string
  nome: string
  leadsAtribuidos: number
  negociosFechados: number
  valorFechado: number
  negociosPerdidos: number
  valorPerdidoEstimado: number
  pipelineEstimado: number
  tempoMedioRespostaMin: number | null
}

export interface MotivoPerda {
  motivo: string
  total: number
}

const currency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

function formatTempo(min: number | null): string {
  if (min == null) return '—'
  if (min < 60) return `${Math.round(min)}min`
  const horas = min / 60
  if (horas < 24) return `${horas.toFixed(1)}h`
  return `${(horas / 24).toFixed(1)}d`
}

/**
 * Performance por vendedor — construído direto de leads_staging/leads_kanban (nunca via
 * corretor_scores/gamificação). Rótulo do painel vem do cargo real do segmento
 * (distribution_role_name, já pluralizado) — a lista de quem aparece nunca depende do nome
 * do cargo, só de quem tem lead atribuído de verdade.
 */
export default function PerformanceVendedoresPanel({
  roleLabelPlural,
  vendedores,
  motivosPerda,
}: {
  roleLabelPlural: string
  vendedores: VendedorPerformance[]
  motivosPerda: MotivoPerda[]
}) {
  const t = useTheme()

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className={`lg:col-span-2 rounded-[2rem] p-6 transition-all ${
        t.isDark ? `${t.cardDark} shadow-xl border border-white/5` : 'bg-white shadow-[0_8px_30px_-12px_rgba(0,0,0,0.06)] border border-slate-100'
      }`}>
        <h3 className={`text-sm font-black uppercase tracking-widest flex items-center mb-5 ${t.isDark ? t.textPrimary : 'text-slate-800'}`}>
          <div className={`p-2 rounded-xl mr-3 ${t.isDark ? 'bg-blue-500/10' : 'bg-blue-50 border border-blue-100 shadow-sm'}`}>
            <UserGroupIcon className={`h-4 w-4 ${t.isDark ? 'text-blue-400' : 'text-blue-500'}`} />
          </div>
          Performance — {roleLabelPlural}
        </h3>

        {vendedores.length === 0 ? (
          <div className={`text-sm font-bold uppercase tracking-widest italic text-center py-16 rounded-[2rem] border-2 border-dashed ${t.isDark ? `${t.textMuted} ${t.borderSub}` : 'text-slate-400 border-slate-200 bg-slate-50'}`}>
            Nenhum lead atribuído no período.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className={`text-[10px] uppercase tracking-widest border-b ${t.textMuted} ${t.borderSub}`}>
                  <th className="pb-3 pl-1">Nome</th>
                  <th className="pb-3 text-center">Atribuídos</th>
                  <th className="pb-3 text-center">Fechados</th>
                  <th className="pb-3 text-right">Valor Fechado</th>
                  <th className="pb-3 text-center">Perdidos</th>
                  <th className="pb-3 text-right">Pipeline (est.)</th>
                  <th className="pb-3 text-center">Resp. Média</th>
                </tr>
              </thead>
              <tbody className={`${t.divider} divide-y`}>
                {vendedores.map((v) => (
                  <tr key={v.id} className={`transition-colors ${t.hoverBg}`}>
                    <td className={`py-3 pl-1 text-sm font-bold ${t.textPrimary}`}>{v.nome}</td>
                    <td className={`py-3 text-center text-sm ${t.textSecondary}`}>{v.leadsAtribuidos}</td>
                    <td className="py-3 text-center text-sm font-bold text-emerald-500">{v.negociosFechados}</td>
                    <td className={`py-3 text-right text-sm font-bold ${t.textPrimary}`}>{currency(v.valorFechado)}</td>
                    <td className="py-3 text-center text-sm font-bold text-rose-500">{v.negociosPerdidos}</td>
                    <td className={`py-3 text-right text-sm ${t.isDark ? 'text-amber-400' : 'text-amber-600'}`}>{currency(v.pipelineEstimado)}</td>
                    <td className={`py-3 text-center text-xs font-semibold ${t.textSecondary}`}>{formatTempo(v.tempoMedioRespostaMin)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className={`rounded-[2rem] p-6 transition-all ${
        t.isDark ? `${t.cardBgSolid} shadow-sm border border-white/5` : 'bg-white shadow-[0_8px_30px_-12px_rgba(0,0,0,0.06)] border border-slate-100'
      }`}>
        <h3 className={`text-sm font-black uppercase tracking-widest flex items-center mb-5 ${t.isDark ? t.textPrimary : 'text-slate-800'}`}>
          <div className={`p-2 rounded-xl mr-3 ${t.isDark ? 'bg-rose-500/10' : 'bg-rose-50 border border-rose-100 shadow-sm'}`}>
            <ChatBubbleBottomCenterTextIcon className={`h-4 w-4 ${t.isDark ? 'text-rose-400' : 'text-rose-500'}`} />
          </div>
          Principais Motivos de Perda
        </h3>
        {motivosPerda.length === 0 ? (
          <div className={`text-xs font-bold uppercase tracking-widest italic text-center py-10 rounded-2xl border-2 border-dashed ${t.isDark ? `${t.textMuted} ${t.borderSub}` : 'text-slate-400 border-slate-200 bg-slate-50'}`}>
            Sem negócios perdidos no período.
          </div>
        ) : (
          <div className="space-y-2">
            {motivosPerda.map((m, idx) => (
              <div key={idx} className="flex items-center justify-between gap-2">
                <span className={`text-xs font-medium truncate ${t.isDark ? t.textSecondary : 'text-slate-600'}`}>{m.motivo}</span>
                <span className={`text-xs font-black shrink-0 ${t.isDark ? t.textPrimary : 'text-slate-700'}`}>{m.total}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
