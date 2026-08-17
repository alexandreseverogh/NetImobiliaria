/**
 * Agentes de Aceleração do CRM — vocabulário plugável (docs/PLANO_AGENTES_ACELERACAO_CRM.md).
 *
 * Mesmo padrão já comprovado em produção pro motor de distribuição de leads
 * (src/lib/routing/strategies/types.ts) e pras redes de anúncio/provedores de LLM: o
 * VOCABULÁRIO de agentes é código (implementar um agente novo sempre exige um arquivo novo
 * registrado no catálogo, src/lib/crm/agents/index.ts), mas QUAIS rodam por segmento/tenant,
 * ligados ou não, e com que parâmetros é 100% dirigido por dado
 * (crm_agentes_config_segmento/_tenant, curado pela Master em /admin/master/segments).
 */

import type { Segment } from '@/lib/intelligence/segmentResolver'

export interface CrmAgentContext {
  tenantId: string
  leadUuid: string
  segment: Segment
  /** Config efetiva já resolvida: override do tenant > default do segmento. */
  params: Record<string, any>
}

export interface CrmAgentResult {
  shouldFire: boolean
  /** Mesma taxonomia já usada em campanhasmarketingdigital."AgentAction": DEFENSIVE
   *  auto-executa (só notifica, nunca fala com o cliente); OFFENSIVE sempre exige
   *  aprovação humana (PIN + WhatsApp) antes de qualquer efeito externo.
   *  INFORMATIVE (F3, next_best_action) não é nem um nem outro — é só uma sugestão
   *  visível na ficha do lead, nunca dispara notificação nem exige aprovação. */
  type: 'DEFENSIVE' | 'OFFENSIVE' | 'INFORMATIVE'
  title: string
  description: string
  confidence: number
  /** Só preenchido quando type === 'OFFENSIVE' (ex.: rascunho de reativação). */
  suggestedMessage?: string
  /** Contexto livre gravado em crm_agent_actions.payload. Em pendencia_atendimento carrega
   *  `{ degrau }` — a chave da idempotência por episódio (§2.1 do plano de pendência). */
  payload?: Record<string, unknown>
  /** Quem deveria ter agido. Usado só pra AGRUPAR o digest por responsável — a notificação em
   *  si continua indo pro canal do tenant (não existe canal por pessoa na plataforma hoje). */
  responsavelNome?: string | null
  /** Nome do lead, pra compor a linha do digest sem o runner ter que reconsultar por lead. */
  leadNome?: string | null
}

/** Candidato mínimo pro runner resolver o resto (config efetiva + chamar evaluate). */
export interface CrmAgentCandidate {
  leadUuid: string
  tenantId: string
  clientId: string | null
}

/** Descreve um parâmetro que o agente sabe ler de `ctx.params` — sem isso, o editor genérico
 *  de parâmetros da Master (SegmentAgentesModal.tsx) é chave/valor livre, então nenhum Master
 *  descobriria que "qtd_atividades_contexto" existe sem ler o código/documentação. Cada
 *  agente declara os próprios (mesmo espírito do catálogo: vocabulário é código, valor é
 *  dado) — a UI usa isso só pra SUGERIR, nunca restringe o editor livre. */
export interface CrmAgentParamHint {
  key: string
  label: string
  /** Mesmo valor do fallback de código usado quando o agente está ativo mas o parâmetro não
   *  foi configurado — nunca dois números diferentes pro "padrão" (um documentado na UI, outro
   *  no código) que podem divergir silenciosamente com o tempo. */
  default: string
}

export interface CrmAgent {
  key: string
  label: string
  description: string
  trigger: 'ON_LEAD_CREATED' | 'ON_STAGE_CHANGE' | 'SCHEDULED_SCAN'
  evaluate(ctx: CrmAgentContext): Promise<CrmAgentResult | null>
  /** Obrigatório pra agentes SCHEDULED_SCAN — acha os leads candidatos globalmente (todos os
   *  tenants numa query só, mesmo espírito de scanAndAlertBreaches() da Mensageria). Cada
   *  agente sabe a própria condição de candidatura (pendencia_atendimento: bola parada do
   *  nosso lado além do piso; stage_stagnation: sem atividade desde que entrou na etapa
   *  atual) — o runner não precisa (nem deve) saber os detalhes de cada um. */
  findCandidates?(): Promise<CrmAgentCandidate[]>
  /** Parâmetros que este agente sabe usar — ver CrmAgentParamHint. Omitido/vazio quando o
   *  agente não tem nenhum parâmetro configurável (ex.: stage_stagnation, que lê o limiar de
   *  kanban_colunas.sla_hours, uma superfície de config diferente). */
  paramHints?: CrmAgentParamHint[]
  /** Efeito colateral REAL do agente, executado automaticamente logo após a ação ser gravada.
   *  Existe porque a partir de G2 um agente DEFENSIVE não só avisa — ele corrige (reatribui o
   *  lead). O runner continua genérico: só chama se o agente declarar o método, sem saber o que
   *  ele faz. Decisão do usuário (2026-08-08): nenhum degrau interno passa por fila de
   *  aprovação — a plataforma automatiza call centers e esperar decisão manual derrota o
   *  propósito. Retorna um resumo curto que entra no digest, pra ficar auditável o que a
   *  máquina fez sozinha. */
  execute?(ctx: CrmAgentContext, result: CrmAgentResult, actionId: string): Promise<string | null>
  /** Quando true, o runner NÃO manda uma notificação por lead — acumula os disparos da rodada
   *  e envia UMA mensagem por tenant, agrupada por responsável. Obrigatório em escala de call
   *  center: um WhatsApp por lead parado é inutilizável com centenas de atendentes. A ação em
   *  crm_agent_actions continua sendo gravada por lead (auditoria granular intacta). */
  digest?: boolean
}
