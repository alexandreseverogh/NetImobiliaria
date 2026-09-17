'use client'

import { useEffect, useState } from 'react'

import './artemis4.css'
import './artemis4-sections.css'

import { MODULE_CONTENT } from './moduleContent'
import ModuleDetailModal from './ModuleDetailModal'
import SpecialistContactModal from './SpecialistContactModal'
import { Nav, Footer, LeavingOverlay, useReveal } from './components/Chrome'
import { Hero, AuthorityBand } from './components/Hero'
import { Diagnosis, ClosedLoop, ProductTour, AgentSection } from './components/Product'
import { Origin, Versus, Segments, Guarantees, Faq, FinalCta } from './components/Story'

/**
 * ARTEMIS4 — landing (superfície BRAND).
 *
 * Reescrita completa em 2026-09-12. O que mudou em relação à versão anterior,
 * e por quê:
 *
 * 1. O hero deixou de ser um simulador de reentrada em tela cheia (vídeo do
 *    YouTube + canvas em requestAnimationFrame + HUD com Mach, temperatura de
 *    escudo ablativo e "DEEP SPACE NETWORK"). Aquilo gastava os únicos
 *    segundos de atenção da página numa metáfora sem legenda, e mantinha dois
 *    laços disputando a main thread — a causa raiz do "Entrar lento" que
 *    docs/CHECKPOINT.md registra como issue crônico. Agora o hero mostra
 *    telemetria de NEGÓCIO e o fundo é CSS puro (zero canvas, zero rAF).
 *
 * 2. O vídeo de reentrada não foi descartado: migrou para a seção "Por que
 *    Artemis", onde ganha função narrativa ao lado dos fatos verificados da
 *    missão, e só carrega quando chega perto do viewport.
 *
 * 3. Os números de mercado saíram de dentro de um modal a dois cliques de
 *    distância e viraram uma faixa de autoridade logo abaixo do hero, cada um
 *    com a fonte primária linkada.
 *
 * 4. Entrou a prova concreta que não existia: seis funcionalidades reais da
 *    plataforma com representação de tela, mais o registro de decisões do
 *    agente autônomo.
 */

const LOOP_SLUGS = ['trafego-pago', 'mensageria', 'crm'] as const

export default function Artemis4LandingPage() {
  const rootRef = useReveal()
  const [navigating, setNavigating] = useState(false)
  const [detailSlug, setDetailSlug] = useState<string | null>(null)
  const [availableSlugs, setAvailableSlugs] = useState<string[] | null>(null)
  const [specialistOpen, setSpecialistOpen] = useState(false)

  /**
   * Pré-aquece /admin/login no mount.
   * Em dev o Next compila a rota sob demanda e o primeiro acesso custa
   * segundos; em produção o custo é do bundle. Disparar aqui, sem esperar
   * ociosidade, é o fix já registrado em docs/CHECKPOINT.md (um clique rápido
   * vence um requestIdleCallback).
   */
  useEffect(() => {
    fetch('/admin/login').catch(() => {
      /* best-effort: é só aquecimento */
    })
  }, [])

  /**
   * Âncora vinda de fora (link compartilhado como /artemis4#plataforma).
   * Esta é uma página de cliente: quando o navegador tenta pular para o hash,
   * o conteúdo ainda não existe no DOM e o pulo não acontece. Refazemos o
   * pulo depois da montagem. O `scroll-margin-top` no CSS cuida de não deixar
   * o título atrás do nav fixo.
   */
  useEffect(() => {
    const hash = window.location.hash
    if (!hash || hash.length < 2) return
    const id = decodeURIComponent(hash.slice(1))
    const jump = () => document.getElementById(id)?.scrollIntoView()
    const t = window.setTimeout(jump, 120)
    return () => window.clearTimeout(t)
  }, [])

  /**
   * Módulos ativos no banco.
   * Não bloqueia a renderização: os três estágios aparecem imediatamente e
   * só são removidos se a API responder dizendo que o módulo está inativo.
   * Isso mantém o gate real de `system_modules` sem skeleton nem salto de
   * layout no primeiro paint.
   */
  useEffect(() => {
    let cancelled = false
    fetch('/api/public/modules')
      .then((r) => r.json())
      .then((d) => {
        if (cancelled || !d?.success || !Array.isArray(d.modules)) return
        setAvailableSlugs(d.modules.map((m: { slug: string }) => m.slug))
      })
      .catch(() => {
        /* falha silenciosa: sem resposta, mostramos os três (default seguro) */
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleEnter = () => setNavigating(true)
  const handleOpenSpecialist = () => setSpecialistOpen(true)

  const visibleLoopSlugs = availableSlugs
    ? LOOP_SLUGS.filter((s) => availableSlugs.includes(s))
    : [...LOOP_SLUGS]

  return (
    <div className="a4" ref={rootRef}>
      {navigating && <LeavingOverlay />}

      {detailSlug && MODULE_CONTENT[detailSlug] && (
        <ModuleDetailModal
          moduleName={MODULE_CONTENT[detailSlug].displayName}
          content={MODULE_CONTENT[detailSlug]}
          onClose={() => setDetailSlug(null)}
          onEnter={handleEnter}
          onOpenSpecialist={handleOpenSpecialist}
        />
      )}

      <SpecialistContactModal open={specialistOpen} onClose={() => setSpecialistOpen(false)} />

      <Nav onEnter={handleEnter} onOpenSpecialist={handleOpenSpecialist} />

      <main style={{ paddingTop: 0 }}>
        <Hero onEnter={handleEnter} onOpenSpecialist={handleOpenSpecialist} />
        <AuthorityBand />
        <Diagnosis />
        <ClosedLoop onOpenModule={setDetailSlug} visibleSlugs={visibleLoopSlugs} />
        <ProductTour />
        <AgentSection />
        <Origin />
        <Versus />
        <Segments />
        <Guarantees />
        <Faq />
        <FinalCta onEnter={handleEnter} onOpenSpecialist={handleOpenSpecialist} />
      </main>

      <Footer onOpenSpecialist={handleOpenSpecialist} />
    </div>
  )
}
