import pool from '@/lib/database/connection'
import type { CrmAgent, CrmAgentCandidate, CrmAgentContext, CrmAgentResult } from './types'

/**
 * G1 — Vigilância de Pendência de Atendimento (docs/PLANO_PENDENCIA_ATENDIMENTO.md).
 *
 * Substitui e ABSORVE o antigo `speed_to_lead` (F1), que só enxergava o 1º contato: ele saía
 * da vigilância na primeira atividade registrada e nunca mais voltava. Este agente pergunta
 * outra coisa, continuamente: *a bola está do nosso lado, e há quanto tempo?* — o que cobre o
 * 1º contato (ordinal 1), o 3º, o 40º, e o lead que nunca teve dono.
 *
 * Sem LLM — é um relógio. O estado "de quem é a bola" já vem materializado em
 * leads_staging.bola_com/bola_desde pelo motor canônico (src/lib/crm/pendencia/pendencyState.ts),
 * alimentado por captação, Mensageria e atividades do CRM conforme os módulos contratados.
 *
 * ─── Idempotência por EPISÓDIO, não por lead ───────────────────────────────────
 * A diferença central em relação a todos os agentes anteriores. Um episódio de pendência
 * começa quando a bola vem pra nós e termina quando devolvemos. Dentro dele, cada degrau
 * dispara no máximo uma vez. A chave do episódio é o próprio `bola_desde` — quando a bola é
 * devolvida e volta depois, ele avança e TODOS os degraus rearmam sozinhos.
 */

/** Fallbacks de código — usados só quando o agente está ativo mas o parâmetro não foi
 *  configurado. Fonte única: os mesmos valores aparecem em paramHints (o que a UI mostra). */
const MINUTOS_1O_CONTATO_DEFAULT = 30
const MINUTOS_CONTINUIDADE_DEFAULT = 240
const FATOR_ESCALONAMENTO_DEFAULT = 3
const FATOR_REATRIBUICAO_DEFAULT = 6

/**
 * Maior degrau da escada. Serve de poda no findCandidates: lead que já recebeu o degrau máximo
 * neste episódio não precisa ser reavaliado a cada 5 minutos até a bola se mover.
 *
 * Atenção: a poda só silencia o ALERTA. A retentativa de atribuição continua acontecendo a
 * cada rodada, em runRescueRetries() (src/lib/crm/pendencia/rescueQueue.ts) — duas cadências
 * diferentes de propósito, ver §4 do plano.
 */
const DEGRAU_MAX_IMPLEMENTADO = 4

/** Piso genérico de varredura — não é o limiar real (que é por tenant/segmento e só o
 *  evaluate() conhece), só evita trazer da query leads cuja pendência nasceu agora mesmo. */
const PISO_VARREDURA_MINUTOS = 5

/**
 * Início da janela de idempotência: o mais recente entre "a bola veio pra nós" e "o lead trocou
 * de responsável".
 *
 * A 2ª parcela é o que impede uma escada esgotada de ser herdada. Achado testando G3: depois de
 * uma reatribuição, todos os degraus daquele episódio já haviam disparado — então o NOVO
 * responsável ficava sem relógio nenhum, e se ele também ignorasse o lead nada mais aconteceria.
 * Com isso, cada responsável recebe a escada inteira, o que é exatamente o "sistemático do 2º
 * toque em diante" que a frente exige.
 *
 * `bola_desde` continua intacto de propósito: ele é o tempo REAL de espera do cliente, e é o que
 * as mensagens mostram. Resetá-lo na reatribuição faria a plataforma subestimar quanto tempo a
 * pessoa está esperando de fato.
 */
const INICIO_JANELA = `GREATEST(
  ls.bola_desde,
  COALESCE((SELECT max(sa.created_at AT TIME ZONE 'UTC')
              FROM public.leads_staging_atribuicoes sa
             WHERE sa.lead_uuid = ls.lead_uuid), ls.bola_desde)
)`

function paramInt(params: Record<string, any> | undefined, key: string, fallback: number, max: number): number {
  const raw = Number(params?.[key])
  return Number.isFinite(raw) && raw > 0 ? Math.min(Math.round(raw), max) : fallback
}

export const pendenciaAtendimentoAgent: CrmAgent = {
  key: 'pendencia_atendimento',
  label: 'Pendência de Atendimento',
  description:
    'Vigia continuamente os leads que estão aguardando uma ação NOSSA e escalona sozinho quando ninguém responde — no 1º contato e em todos os toques seguintes. Cobre inclusive o caso do atendente que ficou indisponível: nenhum lead fica esperando indefinidamente.',
  trigger: 'SCHEDULED_SCAN',
  digest: true,
  paramHints: [
    { key: 'minutos_1o_contato', label: 'Minutos até alertar no 1º contato', default: String(MINUTOS_1O_CONTATO_DEFAULT) },
    { key: 'minutos_continuidade', label: 'Minutos até alertar do 2º toque em diante', default: String(MINUTOS_CONTINUIDADE_DEFAULT) },
    { key: 'fator_escalonamento', label: 'Multiplicador do limiar para escalar ao gestor', default: String(FATOR_ESCALONAMENTO_DEFAULT) },
    { key: 'fator_reatribuicao', label: 'Multiplicador do limiar para reatribuir automaticamente', default: String(FATOR_REATRIBUICAO_DEFAULT) },
  ],

  async findCandidates(): Promise<CrmAgentCandidate[]> {
    // Poda no SQL (barata e indexada): só leads com a bola do nosso lado, parados além do piso,
    // e que ainda não receberam o degrau máximo NESTE episódio (created_at >= bola_desde).
    const { rows } = await pool.query(
      `SELECT ls.lead_uuid, ls.tenant_id, ls.client_id
         FROM public.leads_staging ls
        WHERE ls.bola_com = 'nos'
          AND ls.bola_desde < now() - ($1 || ' minutes')::interval
          AND NOT EXISTS (
            SELECT 1 FROM public.crm_agent_actions caa
             WHERE caa.lead_uuid = ls.lead_uuid
               AND caa.agent_key = 'pendencia_atendimento'
               AND caa.created_at >= ${INICIO_JANELA}
               AND COALESCE((caa.payload->>'degrau')::int, 0) >= $2
          )`,
      [PISO_VARREDURA_MINUTOS, DEGRAU_MAX_IMPLEMENTADO],
    )
    return rows.map((r) => ({ leadUuid: r.lead_uuid, tenantId: r.tenant_id, clientId: r.client_id }))
  },

  async evaluate(ctx: CrmAgentContext): Promise<CrmAgentResult | null> {
    const { rows } = await pool.query(
      `SELECT ls.nome, ls.bola_com, ls.bola_desde,
              ${INICIO_JANELA} AS inicio_janela,
              (ls.corretor_atribuido_id IS NOT NULL) AS tem_responsavel,
              u.nome AS responsavel_nome,
              (u.indisponivel_ate IS NOT NULL AND u.indisponivel_ate > now()) AS responsavel_indisponivel,
              u.indisponivel_motivo,
              -- 1º contato = nunca devolvemos a bola na história deste lead. Distingue o lead
              -- recém-captado (limiar agressivo, minutos) do lead em conversa andando (horas).
              NOT EXISTS (
                SELECT 1 FROM public.atividades_lead al
                  JOIN public.tipos_atividade ta ON ta.id = al.tipo_atividade_id
                 WHERE al.lead_uuid = ls.lead_uuid AND al.deleted_at IS NULL AND ta.is_entrada = false
              ) AND NOT EXISTS (
                SELECT 1 FROM mensageria.contacts ct
                  JOIN mensageria.conversations cv ON cv.contact_id = ct.id
                  JOIN mensageria.messages m ON m.conversation_id = cv.id
                 WHERE ct.lead_uuid = ls.lead_uuid AND m.direction = 'outbound' AND m.is_private = false
              ) AS eh_primeiro_contato,
              -- Maior degrau já disparado nesta janela (episódio, ou desde a última troca de
              -- responsável — ver INICIO_JANELA).
              COALESCE((
                SELECT max(COALESCE((caa.payload->>'degrau')::int, 0))
                  FROM public.crm_agent_actions caa
                 WHERE caa.lead_uuid = ls.lead_uuid
                   AND caa.agent_key = 'pendencia_atendimento'
                   AND caa.created_at >= ${INICIO_JANELA}
              ), 0) AS degrau_ja_disparado
         FROM public.leads_staging ls
         LEFT JOIN public.users u ON u.id = ls.corretor_atribuido_id
        WHERE ls.lead_uuid = $1::uuid`,
      [ctx.leadUuid],
    )
    const lead = rows[0]
    // A bola pode ter sido devolvida entre a varredura e a avaliação — nunca alerta em cima
    // de estado velho (o falso positivo mais caro: cutucar quem acabou de atender).
    if (!lead || lead.bola_com !== 'nos' || !lead.bola_desde) return null

    const minutos1o = paramInt(ctx.params, 'minutos_1o_contato', MINUTOS_1O_CONTATO_DEFAULT, 1440)
    const minutosCont = paramInt(ctx.params, 'minutos_continuidade', MINUTOS_CONTINUIDADE_DEFAULT, 20160)
    const fator = paramInt(ctx.params, 'fator_escalonamento', FATOR_ESCALONAMENTO_DEFAULT, 50)
    const fatorReat = paramInt(ctx.params, 'fator_reatribuicao', FATOR_REATRIBUICAO_DEFAULT, 200)

    // DOIS relógios, de propósito:
    //  • minutosParado — espera REAL do cliente (desde bola_desde). É o que as mensagens
    //    mostram: dizer "aguardando há 5min" para quem espera há 7 horas seria mentir.
    //  • minutosNaJanela — tempo sob o RESPONSÁVEL ATUAL (desde a última troca de dono). É o
    //    que decide os degraus. Sem essa separação, um lead reatribuído após 400min dispararia
    //    o degrau 3 no instante seguinte e ficaria quicando entre atendentes — cada um perdendo
    //    o lead antes de ter tido qualquer chance real de atender. Achado testando G3.
    const minutosParado = Math.floor((Date.now() - new Date(lead.bola_desde).getTime()) / 60000)
    const minutosNaJanela = Math.floor((Date.now() - new Date(lead.inicio_janela).getTime()) / 60000)
    const limiarBase = lead.eh_primeiro_contato ? minutos1o : minutosCont
    const limiarEscalonamento = limiarBase * fator
    // Nunca antes do escalonamento, mesmo que o Master configure um fator menor por engano —
    // reatribuir sem ter avisado ninguém antes seria tirar o lead pelas costas do responsável.
    const limiarReatribuicao = Math.max(limiarBase * fatorReat, limiarEscalonamento + 1)

    let degrau = 0
    if (minutosNaJanela >= limiarReatribuicao) degrau = 3
    else if (minutosNaJanela >= limiarEscalonamento) degrau = 2
    else if (minutosNaJanela >= limiarBase) degrau = 1

    // Degrau 4 — fila de resgate: a escada foi até o fim e o lead CONTINUA sem ninguém. Só
    // acontece quando a reatribuição do degrau 3 não achou candidato (todo mundo indisponível,
    // nenhum atendente com o papel de distribuição, etc.). É o estado que hoje é silencioso e
    // que produziu leads parados por 107 dias sem ninguém levantar a mão (Buraco A).
    if (degrau === 3 && lead.degrau_ja_disparado >= 3 && !lead.tem_responsavel) degrau = 4

    // Responsável de licença/férias: cutucá-lo é inútil e injusto — a pendência pula direto
    // para o escalonamento. Decisão do usuário (2026-08-08): adoecer não é relaxar.
    if (degrau === 1 && lead.responsavel_indisponivel) degrau = 2

    if (degrau === 0) return null
    // Já cobrimos este degrau (ou um mais alto) neste episódio — silêncio até a bola se mover.
    if (degrau <= lead.degrau_ja_disparado) return null

    const quem = lead.responsavel_nome
      ? lead.responsavel_indisponivel
        ? `${lead.responsavel_nome} (indisponível${lead.indisponivel_motivo ? `: ${lead.indisponivel_motivo}` : ''})`
        : lead.responsavel_nome
      : 'sem responsável atribuído'

    const tempo = minutosParado >= 120 ? `${Math.floor(minutosParado / 60)}h` : `${minutosParado}min`
    const contexto = lead.eh_primeiro_contato ? '1º contato' : 'retorno do cliente'

    const titulo = degrau === 4
      ? `FILA DE RESGATE — lead sem nenhum responsável há ${tempo}`
      : degrau === 3
        ? `REATRIBUIÇÃO AUTOMÁTICA — lead sem resposta há ${tempo}`
        : degrau === 2
          ? `ESCALONAMENTO — lead aguardando há ${tempo} sem retorno`
          : `Lead aguardando resposta há ${tempo}`

    const descricao = degrau === 4
      ? `${lead.nome || 'Lead'} está há ${tempo} aguardando atendimento e NÃO há nenhum atendente elegível para recebê-lo. A reatribuição automática já foi tentada e não encontrou candidato. O sistema segue tentando a cada varredura, mas isso exige ação humana: liberar alguém da indisponibilidade, cadastrar um atendente com o papel de distribuição, ou revisar as estratégias do segmento.`
      : degrau === 3
        ? `${lead.nome || 'Lead'} passou de ${limiarReatribuicao} min aguardando uma ação nossa (${contexto}) mesmo após o alerta e o escalonamento. Responsável anterior: ${quem}. O lead está sendo passado automaticamente para outro atendente.`
        : degrau === 2
          ? `${lead.nome || 'Lead'} continua sem resposta após ${tempo} (${contexto}) — passou de ${limiarEscalonamento} min sem ninguém agir. Responsável: ${quem}.`
          : `${lead.nome || 'Lead'} está aguardando uma ação nossa (${contexto}) há ${tempo}. Responsável: ${quem}.`

    return {
      shouldFire: true,
      type: 'DEFENSIVE',
      title: titulo,
      description: descricao,
      confidence: 1,
      payload: { degrau, minutosParado, minutosNaJanela, ehPrimeiroContato: lead.eh_primeiro_contato },
      responsavelNome: lead.responsavel_nome ?? null,
      leadNome: lead.nome ?? null,
    }
  },

  /**
   * Degrau 3 é o único que CORRIGE em vez de só avisar. Rodado automaticamente pelo runner
   * logo após a ação ser gravada — sem fila de aprovação (decisão do usuário, 2026-08-08).
   * Nos degraus 1 e 2 não há efeito colateral nenhum: retorna null e o runner segue.
   */
  async execute(ctx: CrmAgentContext, result: CrmAgentResult): Promise<string | null> {
    // Só o degrau 3 reatribui. O degrau 4 (fila de resgate) NÃO tenta de novo aqui: a
    // retentativa dele já roda a cada varredura em runRescueRetries(), silenciosa e sem
    // gravar ação — repetir aqui seria uma segunda tentativa idêntica no mesmo instante.
    if (Number(result.payload?.degrau ?? 0) !== 3) return null
    const { reassignStalledLead } = await import('@/lib/crm/pendencia/reassignExecutor')
    const outcome = await reassignStalledLead(ctx.leadUuid, ctx.tenantId)
    return outcome.resumo
  },
}
