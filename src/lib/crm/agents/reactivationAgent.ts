import pool from '@/lib/database/connection'
import { resolvePromptTemplate } from '@/lib/intelligence/promptResolver'
import { renderPrompt } from '@/lib/intelligence/promptRenderer'
import { getLlmClient } from '@/lib/marketing/services/llmClient'
import type { CrmAgent, CrmAgentCandidate, CrmAgentContext, CrmAgentResult } from './types'

/** Única fonte de verdade do padrão — mesmo espírito de MINUTOS_ALERTA_DEFAULT (F1) e
 *  QTD_ATIVIDADES_DEFAULT (F3): usado tanto em paramHints (o que a UI mostra) quanto no
 *  fallback real do evaluate() (o que o código de fato usa). */
const DIAS_INATIVIDADE_DEFAULT = 7

function formatDays(ms: number): number {
  return Math.floor(ms / 86_400_000)
}

/**
 * F4 — Reativação (docs/PLANO_AGENTES_ACELERACAO_CRM.md §6/§5).
 *
 * 1º agente OFFENSIVE de verdade do catálogo — fala diretamente com o lead, então NUNCA
 * dispara sozinho: sempre grava `crm_agent_actions` com status PENDING_APPROVAL + PIN,
 * notifica o tenant via WhatsApp/Slack (runner.ts), e só é efetivamente enviado depois de
 * aprovação humana explícita (src/lib/crm/agents/reactivationExecutor.ts) — mesmo fluxo já
 * validado em produção pelos agentes OFFENSIVE de Campanhas (SCALE/REALLOCATE_BUDGET).
 *
 * `requer_revisao_extra` (params, opcional) — segmento sensível (ex.: Saúde) pode marcar que
 * mesmo depois de aprovado o rascunho NUNCA é enviado automaticamente, só fica disponível pro
 * humano copiar/colar manualmente (ver reactivationExecutor.ts).
 */
export const reactivationAgent: CrmAgent = {
  key: 'reactivation',
  label: 'Reativação de Lead Inativo',
  description:
    'Identifica leads sem nenhum contato há muito tempo e usa IA pra rascunhar uma mensagem de reengajamento — nunca envia sozinho, sempre exige aprovação humana (PIN + WhatsApp), igual aos agentes ofensivos de Campanhas.',
  trigger: 'SCHEDULED_SCAN',
  paramHints: [
    { key: 'dias_inatividade', label: 'Dias sem contato até sugerir reativação', default: String(DIAS_INATIVIDADE_DEFAULT) },
    { key: 'requer_revisao_extra', label: 'Nunca enviar automático mesmo aprovado (true/false)', default: 'false' },
  ],

  async findCandidates(): Promise<CrmAgentCandidate[]> {
    // G5 — candidatura agora vem do estado "de quem é a bola"
    // (docs/PLANO_PENDENCIA_ATENDIMENTO.md §1, Buraco D).
    //
    // A versão anterior media MAX(atividades_lead.created_at) SEM NOÇÃO DE DIREÇÃO. Consequência
    // real: um lead em que o CLIENTE escreveu e NÓS nunca respondemos entrava aqui — a plataforma
    // mandaria um "sentimos sua falta" para quem está esperando resposta nossa. Reativar é a ação
    // certa só quando a bola está com o CLIENTE; quando está conosco, a ação certa é escalar
    // internamente (pendencia_atendimento).
    //
    // Dois ganhos de simplificação por tabela: o piso de 6h passa a ser sobre bola_desde (o
    // silêncio DELE, não "a última coisa que aconteceu"), e a exclusão de etapa terminal some —
    // lead ganho/perdido já tem bola_com NULL pelo próprio motor canônico.
    //
    // Cooldown de 30 dias (ou PENDING_APPROVAL em aberto) evita propor reativação repetida.
    const { rows } = await pool.query(
      `SELECT ls.lead_uuid, ls.tenant_id, ls.client_id
         FROM public.leads_staging ls
        WHERE ls.bola_com = 'cliente'
          AND ls.bola_desde < now() - interval '6 hours'
          AND ls.telefone IS NOT NULL AND ls.telefone <> ''
          AND NOT EXISTS (
            SELECT 1 FROM public.crm_agent_actions caa
             WHERE caa.lead_uuid = ls.lead_uuid
               AND caa.agent_key = 'reactivation'
               AND (caa.status = 'PENDING_APPROVAL' OR caa.created_at > now() - interval '30 days')
          )`,
    )
    return rows.map((r) => ({ leadUuid: r.lead_uuid, tenantId: r.tenant_id, clientId: r.client_id }))
  },

  async evaluate(ctx: CrmAgentContext): Promise<CrmAgentResult | null> {
    const { rows } = await pool.query(
      `SELECT ls.nome, ls.tag_sonho, ls.resumo_ia, ls.bola_com, ls.bola_desde,
              kc.titulo_exibicao
         FROM leads_staging ls
         LEFT JOIN leads_kanban lk ON lk.lead_uuid = ls.lead_uuid
         LEFT JOIN kanban_colunas kc ON kc.id = lk.coluna_id
        WHERE ls.lead_uuid = $1::uuid`,
      [ctx.leadUuid],
    )
    const lead = rows[0]
    if (!lead) return null
    // A bola pode ter voltado pra nós entre a varredura e a avaliação (o cliente escreveu
    // agora). Nunca propor reativação em cima de estado velho — seria exatamente o Buraco D.
    if (lead.bola_com !== 'cliente' || !lead.bola_desde) return null

    const diasInatividadeRaw = Number(ctx.params?.dias_inatividade)
    const diasInatividade = Number.isFinite(diasInatividadeRaw) && diasInatividadeRaw > 0
      ? Math.min(Math.round(diasInatividadeRaw), 90)
      : DIAS_INATIVIDADE_DEFAULT

    // Silêncio DO CLIENTE: conta desde que devolvemos a bola pra ele, não desde "a última coisa
    // que aconteceu no lead" (que podia ser uma mensagem dele mesmo, ainda sem resposta nossa).
    const diasInativo = formatDays(Date.now() - new Date(lead.bola_desde).getTime())
    if (diasInativo < diasInatividade) return null

    const template = await resolvePromptTemplate('crm_agent_reactivation_message', {
      segmentId: ctx.segment.id, tenantId: ctx.tenantId, clientId: ctx.clientId,
    })
    if (!template) return null

    const prompt = renderPrompt(template, {
      nome_lead: lead.nome || 'Lead',
      dias_inativo: String(diasInativo),
      etapa_atual: lead.titulo_exibicao || 'sem etapa definida',
      tag_sonho: lead.tag_sonho || 'não classificado',
      resumo_ia: lead.resumo_ia || 'sem resumo disponível',
    })

    // G6 — o tipo deixa de ser fixo e passa a refletir o que de fato acontece
    // (docs/PLANO_PENDENCIA_ATENDIMENTO.md §8). Decisão do usuário (2026-08-08): "não espera
    // decisão manual" — a plataforma automatiza call centers, e um humano aprovando cada
    // mensagem é o mesmo gargalo que os degraus internos já eliminaram.
    //
    //   • sem requer_revisao_extra → DEFENSIVE: o runner grava e o execute() ENVIA sozinho.
    //   • com requer_revisao_extra → OFFENSIVE: PENDING_APPROVAL + PIN, como antes. É a válvula
    //     para segmento regulado (Saúde foi o exemplo do próprio usuário em F4), onde falar com
    //     o cliente sem revisão humana tem risco de outra natureza.
    const requerRevisaoExtra = ctx.params?.requer_revisao_extra === true ||
      ctx.params?.requer_revisao_extra === 'true'

    const llm = await getLlmClient(ctx.tenantId, ctx.clientId)
    // 1500 — mesmo achado real já documentado em F0.5/F3 (ConciergeService.qualifyLead,
    // nextBestActionAgent): com Gemini, tetos menores (300-500) vinham cortados no meio ou
    // vazando raciocínio interno do modelo em vez da resposta final. A resposta em si é curta.
    const suggestion = (await llm.complete(prompt, 1500)).trim()
    if (!suggestion) return null

    const etapa = lead.titulo_exibicao || 'sem etapa'
    return {
      shouldFire: true,
      type: requerRevisaoExtra ? 'OFFENSIVE' : 'DEFENSIVE',
      title: requerRevisaoExtra
        ? `Lead inativo há ${diasInativo}d — sugestão de reativação`
        : `Reativação enviada — lead sem retorno há ${diasInativo}d`,
      description: requerRevisaoExtra
        ? `${lead.nome || 'Lead'} está sem retorno há mais de ${diasInativo} dias (etapa "${etapa}"). Este segmento exige revisão humana: a mensagem foi rascunhada pela IA e aguarda aprovação antes de qualquer envio.`
        : `${lead.nome || 'Lead'} está sem retorno há mais de ${diasInativo} dias (etapa "${etapa}"). A mensagem de reativação foi rascunhada pela IA e enviada automaticamente.`,
      confidence: 1,
      suggestedMessage: suggestion,
      leadNome: lead.nome ?? null,
    }
  },

  /**
   * G6 — envio automático. Só roda no caminho DEFENSIVE; quando o segmento exige revisão extra
   * o resultado é OFFENSIVE e a ação fica em PENDING_APPROVAL, aguardando humano (mesmo fluxo
   * PIN+WhatsApp de F4, intocado).
   */
  async execute(_ctx: CrmAgentContext, result: CrmAgentResult, actionId: string): Promise<string | null> {
    if (result.type !== 'DEFENSIVE') return null
    const { autoSendReactivation } = await import('./reactivationExecutor')
    return autoSendReactivation(actionId)
  },
}
