import type { CrmAgent } from './types'
import { pendenciaAtendimentoAgent } from './pendenciaAtendimentoAgent'
import { stageStagnationAgent } from './stageStagnationAgent'
import { nextBestActionAgent } from './nextBestActionAgent'
import { reactivationAgent } from './reactivationAgent'
import { scoreRecalibrationAgent } from './scoreRecalibrationAgent'

export * from './types'

/**
 * Catálogo de agentes disponíveis — mesmo espírito de DISTRIBUTION_STRATEGIES
 * (src/lib/routing/strategies/index.ts): cada fase do plano registra 1 agente novo aqui
 * (F2 stage_stagnation, F3 next_best_action, F4 reactivation, F5 score_recalibration). Um
 * agente só fica configurável (toggle real na UI, aceito pelo PUT de
 * /api/admin/master/segments/[id]/agentes) no exato momento em que a fase dele é implementada
 * aqui — nunca antes, nunca "de mentira".
 *
 * `speed_to_lead` (F1) foi ABSORVIDO por `pendencia_atendimento` em 2026-08-08
 * (docs/PLANO_PENDENCIA_ATENDIMENTO.md §6.1): era o caso particular de ordinal 1 do mesmo
 * relógio — "a bola está conosco desde a captação e ninguém devolveu" — e ficava cego do 2º
 * toque em diante. Manter os dois geraria alerta duplicado e configuração confusa. Feito
 * enquanto nenhum tenant tinha o agente ativado (verificado: 1 config órfã com ativo=false,
 * zero ações geradas); depois de ligado em produção viraria migração de dado de cliente.
 */
export const CRM_AGENTS: Record<string, CrmAgent> = {
  [pendenciaAtendimentoAgent.key]: pendenciaAtendimentoAgent,
  [stageStagnationAgent.key]: stageStagnationAgent,
  [nextBestActionAgent.key]: nextBestActionAgent,
  [reactivationAgent.key]: reactivationAgent,
  [scoreRecalibrationAgent.key]: scoreRecalibrationAgent,
}

// Derivado de CRM_AGENTS (não repetido campo a campo) — evita o catálogo divergir do agente
// real quando um campo novo (ex.: paramHints) é adicionado só num dos dois lugares.
export const CRM_AGENT_CATALOG = Object.values(CRM_AGENTS).map((a) => ({
  key: a.key,
  label: a.label,
  description: a.description,
  paramHints: a.paramHints ?? [],
}))
