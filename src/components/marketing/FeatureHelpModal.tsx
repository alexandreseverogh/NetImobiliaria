'use client';

/**
 * Botão "Ajuda" + modal explicativo, reutilizado pelas páginas do módulo de Campanhas cuja
 * função não é óbvia só pelo nome na sidebar (Galeria de Criativos, Iniciativas, Destinos de
 * CTA, Mecanismos — ver `featureHelpContent.ts`). O conteúdo é 100% dado (prop), este arquivo
 * cuida só da estrutura/comportamento — mesmo espírito de reuso já usado em
 * `AgentesAceleracaoHelp.tsx`.
 *
 * Deliberadamente sem nenhum uso do acento âmbar do design system (DESIGN.md, "Regra do
 * Acento Único" — gold só onde há uma decisão real a tomar). Um modal de leitura não tem ponto
 * de decisão nenhum; a hierarquia vem inteira de peso tipográfico e estrutura, não de cor. Só
 * exceção: azul institucional nos links de integração — uso explicitamente sancionado pelo
 * design system para links, não um acento novo.
 */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  QuestionMarkCircleIcon,
  XMarkIcon,
  ArrowRightIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import type { FeatureHelpContent } from '@/lib/marketing/featureHelpContent';

// ─── Tokens (DESIGN.md — valores exatos, não aproximação Tailwind) ─────────────

const ink = {
  primary: '#0f172a',
  secondary: '#334155',
  muted: '#64748b',
};
const linkBlue = '#1d4ed8';
const focusBlue = '#2563eb';

// ─── Trigger ─────────────────────────────────────────────────────────────────

interface Props {
  content: FeatureHelpContent;
  /** Classe extra pro botão, quando a página precisa encaixar no próprio layout de header. */
  className?: string;
}

export function FeatureHelpButton({ content, className = '' }: Props) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(false);
  const [open, setOpenState] = useState(false);

  useEffect(() => {
    if (open) { wasOpenRef.current = true; return; }
    if (wasOpenRef.current) { triggerRef.current?.focus(); wasOpenRef.current = false; }
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpenState(true)}
        title={`Ajuda — ${content.title}`}
        className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold text-[#334155] hover:text-[#0f172a] hover:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb] focus-visible:ring-offset-1 ${className}`}
      >
        <QuestionMarkCircleIcon className="h-4 w-4" />
        Ajuda
      </button>

      <AnimatePresence>
        {open && <HelpModal content={content} onClose={() => setOpenState(false)} />}
      </AnimatePresence>
    </>
  );
}

// ─── Modal ───────────────────────────────────────────────────────────────────

function HelpModal({ content, onClose }: { content: FeatureHelpContent; onClose: () => void }) {
  const reduceMotion = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const Icon = content.icon;

  useEffect(() => {
    panelRef.current?.focus();
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const overlayMotion = reduceMotion
    ? { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 1 } }
    : { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.18 } };
  const panelMotion = reduceMotion
    ? { initial: { opacity: 1, scale: 1, y: 0 }, animate: { opacity: 1, scale: 1, y: 0 }, exit: { opacity: 1, scale: 1, y: 0 } }
    : {
        initial: { opacity: 0, scale: 0.97, y: 10 },
        animate: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.97, y: 10 },
        transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] as const },
      };

  return (
    <motion.div
      {...overlayMotion}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-[2px]"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        {...panelMotion}
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="feature-help-title"
        className="relative w-full max-w-xl max-h-[85vh] flex flex-col rounded-2xl bg-white border border-slate-200 shadow-[0_20px_60px_rgba(15,23,42,0.25)] overflow-hidden focus:outline-none"
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-5 border-b border-slate-100 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="shrink-0 h-10 w-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                <Icon className="h-5 w-5" style={{ color: ink.secondary }} />
              </div>
              <div className="min-w-0">
                <h2 id="feature-help-title" className="text-lg font-bold leading-tight" style={{ color: ink.primary }}>
                  {content.title}
                </h2>
                <p className="text-sm mt-0.5" style={{ color: ink.muted }}>{content.tagline}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Fechar"
              className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb]"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
          {/* O que é */}
          <section>
            <SectionLabel>O que é</SectionLabel>
            <div className="mt-2 space-y-2.5">
              {content.whatIsIt.map((p, i) => (
                <p key={i} className="text-sm leading-relaxed" style={{ color: ink.secondary }}>{p}</p>
              ))}
            </div>
          </section>

          {/* Como usar — passos numerados (a sequência importa de verdade aqui) */}
          <section>
            <SectionLabel>Como usar</SectionLabel>
            <ol className="mt-3 space-y-3.5">
              {content.howToUse.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span
                    className="shrink-0 h-6 w-6 rounded-full border flex items-center justify-center text-[11px] font-bold mt-0.5"
                    style={{ borderColor: '#cbd5e1', color: ink.secondary }}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold" style={{ color: ink.primary }}>{step.title}</p>
                    <p className="text-sm leading-relaxed mt-0.5" style={{ color: ink.muted }}>{step.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* Benefícios — checklist, forma deliberadamente distinta dos passos acima */}
          <section>
            <SectionLabel>Benefícios e ganhos esperados</SectionLabel>
            <ul className="mt-3 space-y-2">
              {content.benefits.map((b, i) => (
                <li key={i} className="flex gap-2.5">
                  <CheckIcon className="h-4 w-4 shrink-0 mt-0.5" style={{ color: ink.secondary }} />
                  <span className="text-sm leading-relaxed" style={{ color: ink.secondary }}>{b}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Integração — linhas de link real para as outras telas do módulo */}
          {content.integration.length > 0 && (
            <section>
              <SectionLabel>Como se integra com o resto do módulo</SectionLabel>
              <div className="mt-3 rounded-xl border border-slate-100 divide-y divide-slate-100 overflow-hidden">
                {content.integration.map((link, i) => (
                  <Link
                    key={i}
                    href={link.href}
                    className="flex items-center gap-3 px-3.5 py-3 hover:bg-slate-50 transition-colors group"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold" style={{ color: linkBlue }}>{link.label}</p>
                      <p className="text-xs mt-0.5" style={{ color: ink.muted }}>{link.detail}</p>
                    </div>
                    <ArrowRightIcon
                      className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5"
                      style={{ color: linkBlue }}
                    />
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 shrink-0">
          <p className="text-[11px] text-center" style={{ color: '#94a3b8' }}>
            Pressione <kbd className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-mono text-[10px] mx-0.5">Esc</kbd> ou clique fora para fechar
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[13px] font-bold" style={{ color: ink.primary }}>
      {children}
    </h3>
  );
}
