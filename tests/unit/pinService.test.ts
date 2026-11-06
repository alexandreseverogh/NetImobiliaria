import { describe, it, expect, vi, afterEach } from 'vitest'
import { issuePin, verifyPin, pinMatches, PIN_TTL_MINUTES } from '@/lib/rules/pinService'

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('issuePin — geração de PIN de aprovação', () => {
  it('gera exatamente 6 dígitos numéricos', () => {
    for (let i = 0; i < 200; i++) {
      const { pin } = issuePin()
      expect(pin).toMatch(/^\d{6}$/)
    }
  })

  it('nunca usa Math.random (gerador não criptográfico)', () => {
    const spy = vi.spyOn(Math, 'random')
    for (let i = 0; i < 50; i++) issuePin()
    expect(spy).not.toHaveBeenCalled()
  })

  it('expira no TTL configurado e não antes', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-06T10:00:00Z'))
    const { expiresAt } = issuePin()
    const expected = new Date('2026-11-06T10:00:00Z').getTime() + PIN_TTL_MINUTES * 60_000
    expect(expiresAt.getTime()).toBe(expected)
  })

  it('o TTL padrão é 24 horas (comportamento atual preservado)', () => {
    expect(PIN_TTL_MINUTES).toBe(24 * 60)
  })
})

describe('verifyPin — validação', () => {
  const future = new Date(Date.now() + 60_000)
  const past = new Date(Date.now() - 60_000)

  it('aceita PIN correto dentro da validade', () => {
    expect(verifyPin({ provided: '123456', expected: '123456', expiresAt: future })).toEqual({ ok: true })
  })

  it('rejeita PIN errado', () => {
    expect(verifyPin({ provided: '123457', expected: '123456', expiresAt: future })).toEqual({
      ok: false,
      reason: 'incorrect',
    })
  })

  it('rejeita PIN expirado mesmo que esteja correto', () => {
    expect(verifyPin({ provided: '123456', expected: '123456', expiresAt: past })).toEqual({
      ok: false,
      reason: 'expired',
    })
  })

  it('rejeita quando não há PIN emitido', () => {
    expect(verifyPin({ provided: '123456', expected: null, expiresAt: future })).toEqual({
      ok: false,
      reason: 'missing',
    })
  })

  it('rejeita entrada com tamanho diferente sem lançar exceção', () => {
    expect(verifyPin({ provided: '12', expected: '123456', expiresAt: future })).toEqual({
      ok: false,
      reason: 'incorrect',
    })
  })
})


describe('pinMatches — comparação de PIN digitado', () => {
  it('aceita igual, ignorando espaços nas bordas', () => {
    expect(pinMatches(' 123456 ', '123456')).toBe(true)
  })
  it('rejeita diferente', () => {
    expect(pinMatches('123456', '654321')).toBe(false)
  })
  it('rejeita quando não há PIN emitido (nunca aprova vazio)', () => {
    expect(pinMatches('', '')).toBe(false)
    expect(pinMatches('123456', null)).toBe(false)
    expect(pinMatches('123456', undefined)).toBe(false)
  })
  it('rejeita tamanho diferente sem lançar', () => {
    expect(pinMatches('1234567', '123456')).toBe(false)
  })
})
