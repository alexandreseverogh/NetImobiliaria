'use client'

import { FunnelIcon } from '@heroicons/react/24/outline'
import { useTheme } from '@/hooks/useTheme'

export interface KanbanFunnelStage {
  id: number
  nome: string
  titulo_exibicao?: string | null
  cor?: string | null
  ordem: number
  total: number
}

/**
 * Funil real de CRM — quantos negócios existem em cada coluna do Kanban de vendas
 * (leads_kanban/kanban_colunas), sempre disponível com o módulo de CRM, independente de
 * Campanhas contratada. Distinto do funil de mídia paga do dashboard de Campanhas
 * (StageFunnelWidget, TOF/MOF/BOF por atribuição de anúncio) — este responde "onde estão meus
 * negócios", aquele "que campanha trouxe lead em qual estágio de anúncio".
 */
export default function KanbanFunnelWidget({ stages }: { stages: KanbanFunnelStage[] }) {
  const t = useTheme()

  if (!stages || stages.length === 0) return null

  const maxTotal = Math.max(1, ...stages.map(s => s.total))
  const grandTotal = stages.reduce((acc, s) => acc + s.total, 0)

  return (
    <div className={`rounded-[2rem] p-6 transition-all ${
      t.isDark ? `${t.cardDark} shadow-xl border border-white/5` : 'bg-white shadow-[0_8px_30px_-12px_rgba(0,0,0,0.06)] border border-slate-100'
    }`}>
      <div className="flex items-center justify-between mb-5">
        <h3 className={`text-sm font-black uppercase tracking-widest flex items-center ${t.isDark ? t.textPrimary : 'text-slate-800'}`}>
          <div className={`p-2 rounded-xl mr-3 ${t.isDark ? 'bg-blue-500/10' : 'bg-blue-50 border border-blue-100 shadow-sm'}`}>
            <FunnelIcon className={`h-4 w-4 ${t.isDark ? 'text-blue-400' : 'text-blue-500'}`} />
          </div>
          Funil de Vendas (CRM)
        </h3>
        <span className={`text-[11px] font-bold ${t.isDark ? t.textMuted : 'text-slate-400'}`}>{grandTotal} negócios</span>
      </div>

      <div className="space-y-3">
        {stages.map((s) => {
          const label = s.titulo_exibicao || s.nome
          const pct = grandTotal > 0 ? Math.round((s.total / grandTotal) * 100) : 0
          const widthPct = Math.max(2, Math.round((s.total / maxTotal) * 100))
          const color = s.cor || '#2563eb'
          return (
            <div key={s.id}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-semibold truncate ${t.isDark ? t.textSecondary : 'text-slate-600'}`}>{label}</span>
                <span className={`text-xs font-bold shrink-0 ml-2 ${t.isDark ? t.textPrimary : 'text-slate-700'}`}>
                  {s.total} {grandTotal > 0 && <span className={`font-normal ${t.isDark ? t.textMuted : 'text-slate-400'}`}>({pct}%)</span>}
                </span>
              </div>
              <div className={`h-2 rounded-full overflow-hidden ${t.isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${widthPct}%`, backgroundColor: color }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
