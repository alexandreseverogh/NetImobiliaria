import pool from '@/lib/database/connection'
import type { CrmAgent, CrmAgentCandidate, CrmAgentContext, CrmAgentResult } from './types'

/**
 * F2 — Estagnação por Etapa (docs/PLANO_AGENTES_ACELERACAO_CRM.md §6).
 *
 * Sem LLM — só reaproveita 3 coisas que já existem e nunca foram ligadas a uma ação ativa:
 *   1. kanban_colunas.sla_hours — já é por-etapa, já é por-tenant (o próprio tenant define
 *      via Personalização do Kanban), default 24h.
 *   2. leads_kanban_ciclos.data_entrada — quando o lead entrou na etapa ATUAL (ciclo aberto,
 *      data_saida IS NULL).
 *   3. atividades_lead — se há algum toque humano DESDE que entrou nesta etapa, o corretor
 *      já está trabalhando o lead; não alerta mesmo que o SLA técnico tenha passado.
 *
 * Etapa sem sla_hours configurado (NULL) nunca dispara — não inventa um limiar que o tenant
 * não definiu.
 */
export const stageStagnationAgent: CrmAgent = {
  key: 'stage_stagnation',
  label: 'Estagnação por Etapa',
  description:
    'Alerta quando um lead fica parado numa etapa do funil além do prazo (SLA) daquela etapa, sem nenhum toque humano registrado desde que entrou nela.',
  trigger: 'SCHEDULED_SCAN',

  async findCandidates(): Promise<CrmAgentCandidate[]> {
    // Ciclo aberto (data_saida IS NULL) = etapa atual do lead. Só considera colunas com
    // sla_hours configurado e já estourado; idempotência escopada ao CICLO (não ao lead pra
    // sempre) — uma ação antiga de uma etapa anterior não bloqueia um novo alerta quando o
    // lead já avançou pra outra etapa e estagnou de novo lá.
    //
    // tenant_id/client_id vêm de leads_staging (fonte confiável), não de leads_kanban_ciclos —
    // o trigger que popula essa tabela (trg_log_kanban_ciclos) nunca preenche essas 2 colunas,
    // apesar delas existirem no schema (achado real, confirmado ao testar: sempre NULL).
    const { rows } = await pool.query(
      `SELECT lkc.lead_uuid, ls.tenant_id, ls.client_id
         FROM leads_kanban_ciclos lkc
         JOIN kanban_colunas kc ON kc.id = lkc.coluna_id
         JOIN leads_staging ls ON ls.lead_uuid = lkc.lead_uuid
        WHERE lkc.data_saida IS NULL
          AND kc.sla_hours IS NOT NULL
          AND kc.sla_hours > 0
          AND lkc.data_entrada < now() - (kc.sla_hours || ' hours')::interval
          AND NOT EXISTS (
            SELECT 1 FROM atividades_lead a
             WHERE a.lead_uuid = lkc.lead_uuid
               AND a.deleted_at IS NULL
               AND a.created_at >= lkc.data_entrada
          )
          AND NOT EXISTS (
            SELECT 1 FROM public.crm_agent_actions caa
             WHERE caa.lead_uuid = lkc.lead_uuid
               AND caa.agent_key = 'stage_stagnation'
               AND caa.created_at >= lkc.data_entrada
          )`,
    )
    return rows.map((r) => ({ leadUuid: r.lead_uuid, tenantId: r.tenant_id, clientId: r.client_id }))
  },

  async evaluate(ctx: CrmAgentContext): Promise<CrmAgentResult | null> {
    const { rows } = await pool.query(
      `SELECT ls.nome, kc.titulo_exibicao, kc.sla_hours, lkc.data_entrada,
              u.nome AS corretor_nome
         FROM leads_kanban_ciclos lkc
         JOIN kanban_colunas kc ON kc.id = lkc.coluna_id
         JOIN leads_staging ls ON ls.lead_uuid = lkc.lead_uuid
         LEFT JOIN users u ON u.id = ls.corretor_atribuido_id
        WHERE lkc.lead_uuid = $1::uuid AND lkc.data_saida IS NULL
        ORDER BY lkc.data_entrada DESC
        LIMIT 1`,
      [ctx.leadUuid],
    )
    const row = rows[0]
    if (!row || !row.sla_hours) return null

    const hoursInStage = (Date.now() - new Date(row.data_entrada).getTime()) / 3_600_000
    if (hoursInStage < row.sla_hours) return null

    const quem = row.corretor_nome ? ` (com ${row.corretor_nome})` : ' (sem responsável atribuído)'
    return {
      shouldFire: true,
      type: 'DEFENSIVE',
      title: `Lead parado em "${row.titulo_exibicao}" há ${Math.round(hoursInStage)}h`,
      description: `${row.nome || 'Lead'}${quem} está na etapa "${row.titulo_exibicao}" há mais de ${row.sla_hours}h (prazo da etapa), sem nenhum contato registrado desde que entrou.`,
      confidence: 1,
    }
  },
}
