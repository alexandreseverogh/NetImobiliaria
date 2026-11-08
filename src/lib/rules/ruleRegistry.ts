/**
 * Catálogo de regras numéricas configuráveis (Fase 2 do plano REGRAS_CONFIGURAVEIS).
 *
 * Cada chave declara tipo, unidade e faixa válida. NÃO há valor padrão aqui: o valor vem
 * sempre da tabela (system_benchmarks) via ruleResolver. Ausência de valor é erro explícito.
 */

export type RuleType = 'number' | 'pct' | 'brl' | 'days' | 'count' | 'ratio' | 'score'

export interface RuleDefinition {
  key: string
  label: string
  type: RuleType
  min: number
  max: number
  description: string
}

export const RULE_REGISTRY: Record<string, RuleDefinition> = {
  cpl_critical_multiplier: {
    key: 'cpl_critical_multiplier', label: 'Múltiplo do CPL crítico', type: 'ratio', min: 1, max: 10,
    description: 'CPL é considerado crítico quando passa deste múltiplo do CPL ideal (DOWNSCALE).',
  },
  realloc_window_days: {
    key: 'realloc_window_days', label: 'Janela de realocação (dias)', type: 'days', min: 1, max: 90,
    description: 'Janela de métricas usada para avaliar candidatos a realocação de verba.',
  },
  realloc_circuit_threshold: {
    key: 'realloc_circuit_threshold', label: 'Propostas malsucedidas para desligar realocação', type: 'count', min: 1, max: 50,
    description: 'Quantidade de propostas BACKFIRED que desliga a sugestão automática de realocação.',
  },
  realloc_circuit_window_days: {
    key: 'realloc_circuit_window_days', label: 'Janela do circuit breaker (dias)', type: 'days', min: 7, max: 365,
    description: 'Período em que as propostas BACKFIRED são contadas para o circuit breaker.',
  },
  efficiency_good_max: {
    key: 'efficiency_good_max', label: 'Eficiência: limite de ótimo', type: 'ratio', min: 0, max: 5,
    description: 'Índice CPL ÷ CPL crítico abaixo disto é ótimo.',
  },
  efficiency_warn_max: {
    key: 'efficiency_warn_max', label: 'Eficiência: limite de atenção', type: 'ratio', min: 0, max: 5,
    description: 'Índice CPL ÷ CPL crítico abaixo disto é atenção; igual ou acima é crítico.',
  },
  efficiency_bar_max: {
    key: 'efficiency_bar_max', label: 'Eficiência: escala da barra', type: 'ratio', min: 0.5, max: 10,
    description: 'Índice acima disto preenche a barra de eficiência inteira.',
  },
  good_cpl_factor: {
    key: 'good_cpl_factor', label: 'Fator de CPL bom', type: 'ratio', min: 0, max: 1,
    description: 'CPL abaixo de ideal × este fator é considerado bom.',
  },
  warn_cpl_factor: {
    key: 'warn_cpl_factor', label: 'Fator de alerta de CPL', type: 'ratio', min: 1, max: 3,
    description: 'CPL acima de ideal × este fator é alerta (warn). Abaixo do limiar crítico.',
  },
  fit_public_weak_max: {
    key: 'fit_public_weak_max', label: 'Fit máximo de lead fraco (ajuste de público)', type: 'score', min: 0, max: 100,
    description: 'Leads com fit abaixo deste valor indicam ajuste de público na captação.',
  },
  fit_queue_strong_min: {
    key: 'fit_queue_strong_min', label: 'Fit mínimo de lead forte (prioridade na fila)', type: 'score', min: 0, max: 100,
    description: 'Leads com fit igual ou acima deste valor sobem na fila de atendimento.',
  },
}

export function getRuleDefinition(key: string): RuleDefinition {
  const def = RULE_REGISTRY[key]
  if (!def) throw new Error(`Regra desconhecida: "${key}" não está no catálogo ruleRegistry`)
  return def
}
