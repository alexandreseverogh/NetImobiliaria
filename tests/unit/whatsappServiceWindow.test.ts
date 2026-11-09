import { describe, it, expect } from 'vitest'
import { isWithinServiceWindow, SERVICE_WINDOW_MS } from '@/lib/mensageria/channels/whatsappCloudSend'

describe('isWithinServiceWindow (janela de 24h da Meta)', () => {
  const now = new Date('2026-11-09T12:00:00Z')

  it('sem nenhuma mensagem do cliente, a janela está fechada', () => {
    expect(isWithinServiceWindow(null, now)).toBe(false)
  })

  it('mensagem recebida há 1 hora: janela aberta', () => {
    expect(isWithinServiceWindow(new Date('2026-11-09T11:00:00Z'), now)).toBe(true)
  })

  it('mensagem recebida há 23h59: ainda aberta', () => {
    expect(isWithinServiceWindow(new Date(now.getTime() - SERVICE_WINDOW_MS + 60_000), now)).toBe(true)
  })

  it('mensagem recebida há exatamente 24h: fechada (limite exclusivo)', () => {
    expect(isWithinServiceWindow(new Date(now.getTime() - SERVICE_WINDOW_MS), now)).toBe(false)
  })

  it('mensagem recebida há 2 dias: fechada', () => {
    expect(isWithinServiceWindow(new Date('2026-11-07T12:00:00Z'), now)).toBe(false)
  })
})
