import { describe, it, expect } from 'vitest'
import { readNumericParam } from '@/lib/rules/numeric'
import { requireTenantId } from '@/lib/rules/tenantScope'

describe('readNumericParam — zero é valor válido', () => {
  it('preserva 0 (antes virava o padrão com parseInt(x) || padrão)', () => {
    expect(readNumericParam(0, 5)).toBe(0)
    expect(readNumericParam('0', 5)).toBe(0)
  })

  it('aceita string numérica vinda do banco (colunas numeric/int do pg)', () => {
    expect(readNumericParam('30', 5)).toBe(30)
    expect(readNumericParam(' 12 ', 5)).toBe(12)
  })

  it('usa o fallback só para ausência', () => {
    expect(readNumericParam(null, 5)).toBe(5)
    expect(readNumericParam(undefined, 5)).toBe(5)
    expect(readNumericParam('', 5)).toBe(5)
  })

  it('lança erro para valor presente e inválido (nunca vira padrão)', () => {
    expect(() => readNumericParam('abc', 5)).toThrow()
    expect(() => readNumericParam(NaN, 5)).toThrow()
  })

  it('aceita negativo quando o chamador permitir (validação de faixa é do chamador)', () => {
    expect(readNumericParam(-1, 5)).toBe(-1)
  })
})

describe('requireTenantId — sem tenant padrão', () => {
  it('devolve o tenant informado', () => {
    expect(requireTenantId('c828d003-0000-0000-0000-000000000000')).toBe('c828d003-0000-0000-0000-000000000000')
  })

  it('lança erro se ausente, vazio ou só espaços (não usa tenant fixo)', () => {
    expect(() => requireTenantId(undefined)).toThrow(/tenant_id obrigatório/)
    expect(() => requireTenantId(null)).toThrow(/tenant_id obrigatório/)
    expect(() => requireTenantId('   ')).toThrow(/tenant_id obrigatório/)
  })
})
