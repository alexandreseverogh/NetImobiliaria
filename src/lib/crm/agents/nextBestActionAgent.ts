import pool from '@/lib/database/connection'
import { resolvePromptTemplate } from '@/lib/intelligence/promptResolver'
import { renderPrompt } from '@/lib/intelligence/promptRenderer'
import { getLlmClient } from '@/lib/marketing/services/llmClient'
import type { CrmAgent, CrmAgentContext, CrmAgentResult } from './types'

/** Única fonte de verdade do padrão — usado tanto em paramHints (o que a UI mostra pro
 *  Master) quanto no fallback real do evaluate() (o que o código de fato usa). Nunca dois
 *  números "padrão" que podem divergir silenciosamente com o tempo. */
const QTD_ATIVIDADES_DEFAULT = 5

function formatDuration(ms: number): string {
  const min = Math.floor(ms / 60000)
  if (min < 60) return `${Math.max(min, 0)}min`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  return `${d}d`
}

/**
 * F3 — Next Best Action (docs/PLANO_AGENTES_ACELERACAO_CRM.md §6/§3).
 *
 * 1º agente com LLM do catálogo. Trigger real é ON_STAGE_CHANGE (disparado best-effort logo
 * após POST /api/crm/kanban/move) + sob demanda (botão "Atualizar sugestão" na ficha do
 * lead) — nunca SCHEDULED_SCAN, por isso não implementa findCandidates(): não faz sentido
 * varrer TODOS os leads pra sugerir a próxima ação de cada um a cada 5 minutos, é sempre
 * "este lead específico, agora".
 *
 * type: 'INFORMATIVE' — nunca DEFENSIVE nem OFFENSIVE. Não notifica WhatsApp/Slack, não
 * exige aprovação, não fala sozinho com o lead. Só uma sugestão de texto que o atendente lê
 * e decide o que fazer — inclusive pode "Registrar como Atividade" (fecha o loop com a
 * feature de Atividades já existente), mas o clique é sempre humano.
 */
export const nextBestActionAgent: CrmAgent = {
  key: 'next_best_action',
  label: 'Próxima Ação Sugerida',
  description:
    'Sugere, via IA, a próxima ação concreta pra avançar o lead — baseado na etapa atual do funil, histórico de atividades e qualificação já feita. Nunca envia nada sozinho, é só uma sugestão pro atendente decidir.',
  trigger: 'ON_STAGE_CHANGE',
  paramHints: [
    { key: 'qtd_atividades_contexto', label: 'Qtd. de atividades recentes no contexto', default: String(QTD_ATIVIDADES_DEFAULT) },
  ],

  async evaluate(ctx: CrmAgentContext): Promise<CrmAgentResult | null> {
    const { rows } = await pool.query(
      `SELECT ls.nome, ls.tag_sonho, ls.resumo_ia, ls.score_prontidao, ls.score_fit,
              kc.titulo_exibicao, lkc.data_entrada
         FROM leads_staging ls
         LEFT JOIN leads_kanban lk ON lk.lead_uuid = ls.lead_uuid
         LEFT JOIN kanban_colunas kc ON kc.id = lk.coluna_id
         LEFT JOIN leads_kanban_ciclos lkc
           ON lkc.lead_uuid = ls.lead_uuid AND lkc.coluna_id = lk.coluna_id AND lkc.data_saida IS NULL
        WHERE ls.lead_uuid = $1::uuid`,
      [ctx.leadUuid],
    )
    const lead = rows[0]
    if (!lead) return null

    // Config efetiva (tenant > segmento), mesmo padrão de speed_to_lead.minutos_alerta —
    // fallback de código = 5 só quando o agente está ATIVO mas ninguém configurou um valor,
    // nunca um limite fixo pra todo segmento/tenant. Clamp 1-20: protege contra um valor
    // absurdo (0/negativo quebraria o LIMIT; um número muito alto infla o prompt sem ganho
    // real de contexto).
    const qtdAtividadesRaw = Number(ctx.params?.qtd_atividades_contexto)
    const qtdAtividades = Number.isFinite(qtdAtividadesRaw) && qtdAtividadesRaw > 0
      ? Math.min(Math.round(qtdAtividadesRaw), 20)
      : QTD_ATIVIDADES_DEFAULT

    const { rows: atividades } = await pool.query(
      `SELECT a.descricao, a.created_at, t.nome AS tipo_nome
         FROM atividades_lead a
         JOIN tipos_atividade t ON t.id = a.tipo_atividade_id
        WHERE a.lead_uuid = $1::uuid AND a.deleted_at IS NULL
        ORDER BY a.created_at DESC
        LIMIT $2`,
      [ctx.leadUuid, qtdAtividades],
    )

    const template = await resolvePromptTemplate('crm_agent_next_best_action', ctx.segment.id)
    if (!template) return null

    const tempoNaEtapa = lead.data_entrada ? `${formatDuration(Date.now() - new Date(lead.data_entrada).getTime())}` : 'tempo desconhecido'
    const atividadesRecentes = atividades.length
      ? atividades
          .map((a) => `- [${a.tipo_nome}] ${a.descricao} (há ${formatDuration(Date.now() - new Date(a.created_at).getTime())})`)
          .join('\n')
      : 'Nenhuma atividade registrada ainda.'

    const prompt = renderPrompt(template, {
      nome_lead: lead.nome || 'Lead',
      etapa_atual: lead.titulo_exibicao || 'sem etapa definida',
      tempo_na_etapa: tempoNaEtapa,
      tag_sonho: lead.tag_sonho || 'não classificado',
      resumo_ia: lead.resumo_ia || 'sem resumo disponível',
      // score_prontidao/score_fit são persistidos ×10 (0-100) — o prompt fala na mesma
      // escala 0-10 que o Prompt Mestre de qualificação já usa, então convertemos de volta.
      score_prontidao: lead.score_prontidao != null ? String(Math.round(lead.score_prontidao / 10)) : 'não avaliado',
      score_fit: lead.score_fit != null ? String(Math.round(lead.score_fit / 10)) : 'não avaliado',
      atividades_recentes: atividadesRecentes,
    })

    const llm = await getLlmClient(ctx.tenantId)
    // 1500, não um teto menor — mesmo achado real de F0.5 (ConciergeService.qualifyLead) e
    // confirmado de novo aqui ao vivo: com Gemini, 300-500 ainda vinha cortado no meio da
    // frase (ou vazando rascunho/raciocínio interno em vez da resposta final). A resposta em
    // si é curta (1-3 frases), a folga é margem contra esse comportamento do provider.
    const suggestion = (await llm.complete(prompt, 1500)).trim()
    if (!suggestion) return null

    return {
      shouldFire: true,
      type: 'INFORMATIVE',
      title: 'Próxima ação sugerida',
      description: suggestion,
      confidence: 1,
    }
  },
}
