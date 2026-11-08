import { describe, it, expect } from 'vitest'
import { resolveRule, RuleMissingError, RuleInvalidError } from '@/lib/rules/ruleResolver'
import { RULE_REGISTRY, getRuleDefinition } from '@/lib/rules/ruleRegistry'

describe('resolveRule — cascata cliente > tenant > segmento+rede > segmento', () => {
  it('cliente vence todas as outras camadas', () => {
    const r = resolveRule('cpl_critical_multiplier', { client: 3, tenant: 2.8, segmentNetwork: 2.6, segment: 2.5 })
    expect(r).toEqual({ value: 3, source: 'client' })
  })

  it('tenant vence segmento quando cliente não tem valor', () => {
    const r = resolveRule('cpl_critical_multiplier', { client: null, tenant: 2.8, segment: 2.5 })
    expect(r).toEqual({ value: 2.8, source: 'tenant' })
  })

  it('segmento+rede vence segmento genérico', () => {
    const r = resolveRule('cpl_critical_multiplier', { segmentNetwork: 2.6, segment: 2.5 })
    expect(r).toEqual({ value: 2.6, source: 'segment_network' })
  })

  it('usa o valor do segmento quando nenhuma camada mais específica existe', () => {
    const r = resolveRule('cpl_critical_multiplier', { segment: 2.5 })
    expect(r).toEqual({ value: 2.5, source: 'segment' })
  })

  it('zero é valor válido e não é tratado como ausente', () => {
    const r = resolveRule('realloc_circuit_threshold', { tenant: 1, segment: 3 })
    expect(r.value).toBe(1)
    const z = resolveRule('fit_public_weak_max', { client: 0, segment: 45 })
    expect(z).toEqual({ value: 0, source: 'client' })
  })
})

describe('resolveRule — fail loud (sem fallback silencioso)', () => {
  it('lança RuleMissingError quando nenhuma camada tem valor', () => {
    expect(() => resolveRule('cpl_critical_multiplier', {})).toThrow(RuleMissingError)
    expect(() => resolveRule('cpl_critical_multiplier', { client: null, tenant: null, segment: null })).toThrow(RuleMissingError)
  })

  it('ignora NaN e Infinity como valor ausente', () => {
    expect(() => resolveRule('cpl_critical_multiplier', { segment: NaN })).toThrow(RuleMissingError)
    expect(() => resolveRule('cpl_critical_multiplier', { segment: Infinity })).toThrow(RuleMissingError)
  })

  it('rejeita valor fora da faixa da regra', () => {
    expect(() => resolveRule('cpl_critical_multiplier', { segment: 0.5 })).toThrow(RuleInvalidError)
    expect(() => resolveRule('fit_queue_strong_min', { segment: 120 })).toThrow(RuleInvalidError)
  })

  it('rejeita chave que não está no catálogo', () => {
    expect(() => resolveRule('chave_inexistente', { segment: 1 })).toThrow(/não está no catálogo/)
  })
})

describe('ruleRegistry — integridade do catálogo', () => {
  it('toda chave declara faixa válida (min <= max) e chave coerente', () => {
    for (const [k, def] of Object.entries(RULE_REGISTRY)) {
      expect(def.key).toBe(k)
      expect(def.min).toBeLessThanOrEqual(def.max)
      expect(def.label.length).toBeGreaterThan(0)
      expect(def.description.length).toBeGreaterThan(0)
    }
  })

  it('getRuleDefinition falha para chave desconhecida', () => {
    expect(() => getRuleDefinition('nao_existe')).toThrow()
  })
})
