'use client'

import { useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useSidebarMenu } from '@/hooks/useSidebarMenu'
import { OrbitGlyph } from '@/components/marketing/OrbitLoader'

/**
 * Home do Admin — reescrita em 2026-09-19, 2ª versão.
 *
 * A 1ª tentativa desta reescrita virou uma grade com todas as categorias e
 * funcionalidades do tenant — rejeitada explicitamente: essa não é a função
 * desta tela (a sidebar já existe e já faz isso). O pedido real é mais
 * simples e mais difícil: uma tela de chegada bonita, discreta, com leve
 * contextualização da marca — não um painel funcional.
 *
 * Substitui a versão original (4 fotos de imóvel do Unsplash, texto
 * "Gerencie imóveis, cadastros e configurações da sua imobiliária digital"
 * — resíduo da época pré-multi-segmento) por uma saudação pessoal + um
 * glifo de órbita desenhado em SVG (referência discreta ao nome Artemis —
 * a mesma origem de marca já contada em /artemis4, nunca reinventada aqui)
 * — zero funcionalidade listada, zero número, zero imagem externa.
 *
 * Nome de marca: a plataforma foi rebatizada de "Artemis4" para "Artemis9"
 * (ver src/app/artemis4/data.ts e Chrome.tsx) — a rota /artemis4 manteve o
 * nome antigo por compatibilidade, mas todo texto visível usa Artemis9.
 */

function greetingForHour(hour: number): string {
  if (hour < 12) return 'Bom dia'
  if (hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

export default function AdminDashboard() {
  const { user } = useAuth()
  const { theme } = useSidebarMenu('admin')

  const isDark = theme.mode === 'dark'
  const accent = theme.primaryColor || '#2563eb'

  const greeting = useMemo(() => greetingForHour(new Date().getHours()), [])
  const firstName = user?.nome?.split(' ')[0] || ''
  const tenantName = user?.currentTenant?.name
  const segmentName = user?.currentTenant?.segment

  return (
    <div className="flex min-h-[72vh] flex-col items-center justify-center px-6 text-center">
      {/* Eyebrow de marca — discreto, nunca o foco */}
      <div className="mb-6 flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accent }} />
        <span
          className={`text-xs font-semibold uppercase tracking-[0.2em] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}
        >
          Artemis9
        </span>
      </div>

      <OrbitGlyph className="mb-8 h-24 w-40 sm:h-28 sm:w-48" />

      <h1 className={`text-3xl sm:text-4xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
        {greeting}{firstName ? `, ${firstName}` : ''}.
      </h1>

      <p className={`mt-3 max-w-md text-sm sm:text-base ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
        Marketing, atendimento e vendas, num só lugar.
      </p>

      {(tenantName || segmentName) && (
        <p className={`mt-8 text-xs ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
          {tenantName}
          {segmentName ? ` · ${segmentName}` : ''}
        </p>
      )}
    </div>
  )
}
