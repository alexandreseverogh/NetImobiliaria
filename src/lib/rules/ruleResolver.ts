import { getRuleDefinition } from './ruleRegistry'

/** Camadas em ordem de precedência (a primeira com valor vence). */
export interface RuleLayers {
  client?: number | null
  tenant?: number | null
  segmentNetwork?: number | null
  segment?: number | null
}

export type RuleSource = 'client' | 'tenant' | 'segment_network' | 'segment'

export interface ResolvedRule {
  value: number
  source: RuleSource
}

export class RuleMissingError extends Error {
  constructor(key: string) {
    super(`Regra "${key}" sem valor configurado em nenhuma camada (cliente, tenant, segmento)`)
    this.name = 'RuleMissingError'
  }
}

export class RuleInvalidError extends Error {
  constructor(key: string, value: number, min: number, max: number) {
    super(`Valor ${value} fora da faixa [${min}, ${max}] para a regra "${key}"`)
    this.name = 'RuleInvalidError'
  }
}

const isSet = (v: number | null | undefined): v is number =>
  typeof v === 'number' && Number.isFinite(v)

/**
 * Resolve o valor efetivo de uma regra. Cascata: cliente > tenant > segmento+rede > segmento.
 * Zero é valor válido (não é "ausente"). Sem valor em nenhuma camada, lança RuleMissingError.
 */
export function resolveRule(key: string, layers: RuleLayers): ResolvedRule {
  const def = getRuleDefinition(key)
  let resolved: ResolvedRule | null = null
  if (isSet(layers.client)) resolved = { value: layers.client, source: 'client' }
  else if (isSet(layers.tenant)) resolved = { value: layers.tenant, source: 'tenant' }
  else if (isSet(layers.segmentNetwork)) resolved = { value: layers.segmentNetwork, source: 'segment_network' }
  else if (isSet(layers.segment)) resolved = { value: layers.segment, source: 'segment' }
  if (!resolved) throw new RuleMissingError(key)
  if (resolved.value < def.min || resolved.value > def.max) {
    throw new RuleInvalidError(key, resolved.value, def.min, def.max)
  }
  return resolved
}
