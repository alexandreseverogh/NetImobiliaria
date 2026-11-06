import { describe, it, expect } from 'vitest'
import { verifyCronSecret } from '@/lib/security/cronAuth'

describe('verifyCronSecret — fail closed', () => {
  it('aceita segredo idêntico', () => {
    expect(verifyCronSecret('abc123', 'abc123')).toBe(true)
  })

  it('rejeita segredo diferente', () => {
    expect(verifyCronSecret('abc124', 'abc123')).toBe(false)
  })

  it('rejeita quando CRON_SECRET não está configurado (sem fallback)', () => {
    expect(verifyCronSecret('your-secret-key', undefined)).toBe(false)
    expect(verifyCronSecret('', undefined)).toBe(false)
  })

  it('rejeita o antigo segredo literal de fallback quando a env está vazia', () => {
    expect(verifyCronSecret('your-secret-key', '')).toBe(false)
  })

  it('rejeita header ausente mesmo com segredo configurado', () => {
    expect(verifyCronSecret(null, 'abc123')).toBe(false)
    expect(verifyCronSecret(undefined, 'abc123')).toBe(false)
  })

  it('rejeita tamanhos diferentes sem lançar exceção', () => {
    expect(verifyCronSecret('abc', 'abc123')).toBe(false)
  })
})
