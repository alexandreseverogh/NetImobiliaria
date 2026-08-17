'use client'

import { XMarkIcon, ArrowRightIcon } from '@heroicons/react/24/outline'
import type { ModuleCardContent } from './moduleContent'

interface Props {
  moduleName: string
  content: ModuleCardContent
  onClose: () => void
  onEnter: () => void
}

export default function ModuleDetailModal({ moduleName, content, onClose, onEnter }: Props) {
  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6 bg-[#020617]/80 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label={`Detalhes do módulo ${moduleName}`}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl max-h-[88vh] overflow-y-auto rounded-[28px] border border-white/10 bg-gradient-to-b from-slate-900/95 to-slate-950/95 backdrop-blur-2xl shadow-[0_20px_80px_-20px_rgba(0,0,0,0.6)] animate-in fade-in zoom-in-95 duration-300"
      >
        {/* Fechar */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-5 right-5 z-10 inline-flex items-center justify-center w-10 h-10 rounded-xl border border-white/10 bg-white/[0.04] text-gray-400 hover:text-amber-100 hover:border-amber-300/30 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>

        <div className="p-8 md:p-12">
          {/* Cabeçalho */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-300/20 bg-amber-950/20 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span className="text-[9px] font-black uppercase tracking-[0.25em] text-amber-200/90">
              Módulo de Operação
            </span>
          </div>
          <h2 className="font-[family-name:var(--font-display)] text-3xl md:text-4xl font-bold uppercase tracking-tight italic text-white mb-6">
            {moduleName}
          </h2>

          {/* Argumento de abertura (categoria/mercado, antes dos diferenciais) */}
          <p className="text-base md:text-lg text-gray-200 font-medium leading-relaxed mb-10 max-w-[68ch]">
            {content.modal.intro}
          </p>

          {/* Pilares — sem ícone-em-caixa-arredondada acima do título (evita o clichê de template);
              hierarquia por peso tipográfico, não por cor ou numeração */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8 mb-10">
            {content.modal.pillars.map((pillar) => (
              <div key={pillar.title}>
                <h3 className="text-sm font-black uppercase tracking-tight italic text-white mb-2">
                  {pillar.title}
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed font-medium max-w-[42ch]">
                  {pillar.description}
                </p>
              </div>
            ))}
          </div>

          {/* Linha de confiança */}
          <div className="rounded-2xl border border-amber-300/15 bg-amber-950/10 px-6 py-5 mb-8">
            <p className="text-xs md:text-sm text-amber-100/90 leading-relaxed font-medium">
              {content.modal.trustLine}
            </p>
          </div>

          {/* Rodapé de cross-sell */}
          <p className="text-[11px] text-gray-500 leading-relaxed font-medium mb-8 max-w-[60ch]">
            {content.modal.crossSellFooter}
          </p>

          {/* CTA final */}
          <a
            href="/admin/login"
            onClick={onEnter}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-300 to-amber-500 hover:from-amber-200 hover:to-amber-400 text-slate-950 font-black uppercase tracking-wider italic text-xs shadow-xl shadow-amber-500/25 ring-1 ring-amber-200/40 transition-all touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#020617]"
          >
            {content.modal.ctaLabel}
            <ArrowRightIcon className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  )
}
