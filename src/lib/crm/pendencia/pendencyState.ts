import pool from '@/lib/database/connection'
import type { PoolClient } from 'pg'

/**
 * G0 — Estado "de quem é a bola" (docs/PLANO_PENDENCIA_ATENDIMENTO.md §2 e §5).
 *
 * FONTE ÚNICA da pergunta "o lead está esperando NOSSA ação, ou a do cliente, e desde quando?".
 * Mesmo espírito de leadEvents.ts ("o que conta como lead") — a regra existe em UM lugar só,
 * e todo consumidor lê daqui em vez de reimplementar a própria versão.
 *
 * Por que isso existe: todo prazo que a plataforma tinha até 2026-08-08 era prazo de PRIMEIRO
 * toque (F1 para de olhar na 1ª atividade; o SLA de Mensageria para na 1ª resposta;
 * `atribuicao_expira_em` é one-shot). Lead abandonado do 2º toque em diante era invisível.
 *
 * ─── Módulos contratados ───────────────────────────────────────────────────────
 * NÃO há gate explícito de módulo aqui, de propósito: a AUSÊNCIA de dado já é o gate.
 * Tenant sem Mensageria não tem linha em mensageria.messages → aquela fonte simplesmente não
 * contribui. Tenant sem CRM não registra atividades → idem. Todos caem no sinal base
 * (a captação do próprio lead), que não exige módulo nenhum. Nenhum tenant fica com cobertura
 * zero e nenhum é obrigado a contratar módulo pra ser vigiado.
 *
 * ─── Materialização ────────────────────────────────────────────────────────────
 * O estado é gravado em leads_staging.bola_com/bola_desde (caminho rápido, escrito nos pontos
 * de escrita conhecidos) + reconciliação em lote (rede de segurança, recomputa da fonte real).
 * A correção nunca depende de eu ter lembrado de todo call site.
 */

export type BolaCom = 'nos' | 'cliente'

export interface PendencyState {
  bolaCom: BolaCom | null
  bolaDesde: Date | null
}

/**
 * A regra canônica, em SQL. Usada tanto pelo recompute de 1 lead (caminho de escrita) quanto
 * pela reconciliação em lote — nunca duplicada, pra não criar 2ª fonte de verdade.
 *
 * `$1` = array de lead_uuid, ou NULL para "todos".
 *
 * Precedência: etapa terminal (is_ganho/is_perda — atributo explícito desde 2026-08-07, nunca
 * o nome da coluna) zera a pendência. Fora isso, vence o evento mais recente entre os dois
 * lados. GREATEST ignora NULL no Postgres, então fonte ausente simplesmente não pesa.
 */
const SQL_RECOMPUTE = `
WITH alvo AS (
  SELECT ls.lead_uuid,
         ls.created_at,
         (COALESCE(kc.is_ganho, false) OR COALESCE(kc.is_perda, false)) AS terminal
    FROM public.leads_staging ls
    LEFT JOIN public.leads_kanban lk ON lk.lead_uuid = ls.lead_uuid
    LEFT JOIN public.kanban_colunas kc ON kc.id = lk.coluna_id
   WHERE $1::uuid[] IS NULL OR ls.lead_uuid = ANY($1::uuid[])
),
sinais AS (
  SELECT a.lead_uuid,
         a.terminal,
         -- Bola veio pra nós: o lead chegou, o cliente SE MANIFESTOU DE NOVO pela captação,
         -- mandou mensagem, ou o tenant registrou uma atividade marcada como entrada.
         --
         -- marketing_eventos é o que fecha um furo real da 1ª versão desta regra: quando um
         -- lead JÁ EXISTENTE se manifesta de novo (formulário/CTA/webhook), leads_staging não
         -- ganha linha nova nem move created_at — o Match Engine só enriquece a linha antiga.
         -- Sem esta fonte, um lead que acabou de escrever seria classificado como "bola com o
         -- cliente" só porque nossa última ação era mais recente que a captação ORIGINAL.
         -- marketing_eventos grava 1 linha por TOQUE (verificado: 24 eventos p/ 21 leads).
         GREATEST(
           a.created_at,
           (SELECT max(me.created_at)
              FROM public.marketing_eventos me
             WHERE me.lead_uuid = a.lead_uuid),
           (SELECT max(m.created_at)
              FROM mensageria.contacts ct
              JOIN mensageria.conversations cv ON cv.contact_id = ct.id
              JOIN mensageria.messages m ON m.conversation_id = cv.id
             WHERE ct.lead_uuid = a.lead_uuid AND m.direction = 'inbound'),
           (SELECT max(al.created_at)
              FROM public.atividades_lead al
              JOIN public.tipos_atividade ta ON ta.id = al.tipo_atividade_id
             WHERE al.lead_uuid = a.lead_uuid AND al.deleted_at IS NULL AND ta.is_entrada = true)
         ) AS ultimo_inbound,
         -- Bola devolvida: respondemos (humano ou bot) ou registramos uma ação nossa.
         --
         -- O filtro is_private = false é obrigatório: nota interna NUNCA sai pelo canal, não é
         -- resposta ao cliente e não pode devolver a bola. Sem esse filtro, um atendente
         -- escrevendo uma anotação pra si mesmo silenciaria o alarme sem ter atendido ninguém.
         -- Mesma distinção que o endpoint de resposta já faz para first_response_at.
         GREATEST(
           (SELECT max(m.created_at)
              FROM mensageria.contacts ct
              JOIN mensageria.conversations cv ON cv.contact_id = ct.id
              JOIN mensageria.messages m ON m.conversation_id = cv.id
             WHERE ct.lead_uuid = a.lead_uuid AND m.direction = 'outbound' AND m.is_private = false),
           (SELECT max(al.created_at)
              FROM public.atividades_lead al
              JOIN public.tipos_atividade ta ON ta.id = al.tipo_atividade_id
             WHERE al.lead_uuid = a.lead_uuid AND al.deleted_at IS NULL AND ta.is_entrada = false)
         ) AS ultimo_outbound
    FROM alvo a
),
calculado AS (
  SELECT lead_uuid,
         CASE WHEN terminal THEN NULL
              WHEN ultimo_outbound IS NULL OR ultimo_outbound < ultimo_inbound THEN 'nos'
              ELSE 'cliente'
         END AS novo_bola_com,
         CASE WHEN terminal THEN NULL
              WHEN ultimo_outbound IS NULL OR ultimo_outbound < ultimo_inbound THEN ultimo_inbound
              ELSE ultimo_outbound
         END AS novo_bola_desde
    FROM sinais
)
UPDATE public.leads_staging ls
   SET bola_com = c.novo_bola_com,
       bola_desde = c.novo_bola_desde
  FROM calculado c
 WHERE ls.lead_uuid = c.lead_uuid
   -- Só escreve o que de fato mudou: evita write amplification inútil a cada varredura e
   -- preserva bola_desde (a chave do episódio de pendência, §2.1 do plano) quando nada mudou.
   AND (ls.bola_com IS DISTINCT FROM c.novo_bola_com
        OR ls.bola_desde IS DISTINCT FROM c.novo_bola_desde)
 RETURNING ls.lead_uuid, ls.bola_com, ls.bola_desde
`

/**
 * Recomputa a pendência de 1 lead a partir das fontes reais e persiste.
 * Chamado dos pontos de escrita (nova mensagem, nova atividade, movimentação de etapa).
 * Best-effort por natureza: nunca deve derrubar a operação principal que o disparou.
 */
export async function touchPendency(leadUuid: string, client?: PoolClient): Promise<PendencyState | null> {
  const runner = client ?? pool
  const { rows } = await runner.query(SQL_RECOMPUTE, [[leadUuid]])
  if (rows.length === 0) return null // nada mudou — estado já estava correto
  return {
    bolaCom: rows[0].bola_com as BolaCom | null,
    bolaDesde: rows[0].bola_desde ? new Date(rows[0].bola_desde) : null,
  }
}

/**
 * Reconciliação em lote — a rede de segurança do §5 do plano.
 * Sem argumento, recomputa a base inteira (uso: job noturno + backfill inicial).
 * Com `leadUuids`, recomputa só aquele subconjunto.
 *
 * Retorna quantos leads tiveram o estado efetivamente CORRIGIDO (não quantos foram examinados)
 * — número diferente de zero num job noturno é sinal de que algum caminho de escrita não está
 * chamando touchPendency(), o que é exatamente o que essa rede existe pra revelar.
 */
export async function reconcilePendency(leadUuids?: string[]): Promise<{ corrigidos: number }> {
  const { rowCount } = await pool.query(SQL_RECOMPUTE, [leadUuids ?? null])
  return { corrigidos: rowCount ?? 0 }
}

/**
 * Atalho para o lado da Mensageria: resolve o lead pelo contato e recomputa.
 * Existe pra que ingest.ts não precise conhecer o join contacts→leads_staging — o
 * conhecimento de como os dois mundos se ligam fica aqui, num lugar só.
 * Contato ainda não vinculado a lead (lead_uuid NULL) simplesmente não faz nada.
 */
export async function touchPendencyByContact(contactId: string): Promise<PendencyState | null> {
  const { rows } = await pool.query(
    `SELECT lead_uuid FROM mensageria.contacts WHERE id = $1::uuid AND lead_uuid IS NOT NULL`,
    [contactId],
  )
  if (!rows[0]?.lead_uuid) return null
  return touchPendency(rows[0].lead_uuid)
}

/**
 * Idem, a partir da conversa. Existe porque o endpoint de resposta do atendente
 * (POST /api/admin/mensageria/conversations/[id]/messages) NÃO passa por ingestMessage() —
 * grava direto na tabela com SQL próprio, apesar de ingest.ts se declarar "ponto único de
 * ingestão". Descoberto testando o caminho real em 2026-08-08: sem este gancho, o motor
 * escalaria um lead que o atendente acabou de responder.
 */
export async function touchPendencyByConversation(conversationId: string): Promise<PendencyState | null> {
  const { rows } = await pool.query(
    `SELECT ct.lead_uuid
       FROM mensageria.conversations cv
       JOIN mensageria.contacts ct ON ct.id = cv.contact_id
      WHERE cv.id = $1::uuid AND ct.lead_uuid IS NOT NULL`,
    [conversationId],
  )
  if (!rows[0]?.lead_uuid) return null
  return touchPendency(rows[0].lead_uuid)
}

/** Leitura simples do estado já materializado (não recomputa). */
export async function getPendency(leadUuid: string): Promise<PendencyState | null> {
  const { rows } = await pool.query(
    `SELECT bola_com, bola_desde FROM public.leads_staging WHERE lead_uuid = $1::uuid`,
    [leadUuid],
  )
  if (!rows[0]) return null
  return {
    bolaCom: rows[0].bola_com as BolaCom | null,
    bolaDesde: rows[0].bola_desde ? new Date(rows[0].bola_desde) : null,
  }
}
