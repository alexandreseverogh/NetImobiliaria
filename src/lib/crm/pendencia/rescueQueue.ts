import pool from '@/lib/database/connection'
import { DistributionEngine } from '@/lib/routing/distributionEngine'
import { resolveEffectiveAgentConfig } from '@/lib/crm/agents/effectiveConfig'

/**
 * G3 — Fila de resgate (docs/PLANO_PENDENCIA_ATENDIMENTO.md §4, degrau 4).
 *
 * Fecha o Buraco A: `DistributionEngine.findBestCandidate()` pode não achar candidato elegível;
 * nesse caso `corretor_atribuido_id` fica NULL — e o transbordo (cron) exige exatamente o
 * contrário (`AND corretor_atribuido_id IS NOT NULL`), então o lead NUNCA é reprocessado.
 * No banco de dev isso produziu leads com telefone válido parados até 107 dias, sem ninguém.
 *
 * ─── Por que a retentativa é SILENCIOSA ────────────────────────────────────────
 * Duas cadências diferentes, de propósito:
 *   • RETENTAR atribuição: toda varredura (5 em 5 min). É barato, e o lead precisa sair da
 *     fila no minuto em que alguém ficar disponível — férias acabam, plantão troca, um
 *     atendente novo é cadastrado.
 *   • ALERTAR sobre a fila: uma vez por episódio (degrau 4, no próprio agente). Repetir o
 *     alerta a cada 5 minutos seria o mesmo flood que o digest existe pra evitar.
 * Por isso esta função não grava `crm_agent_actions` — quem alerta é o agente.
 */

export interface RescueRetryResult {
  examinados: number
  atribuidos: number
}

/**
 * Reprocessa leads PENDENTES e SEM RESPONSÁVEL, tentando atribuir de novo.
 *
 * Respeita a mesma config efetiva do agente (tenant > segmento): um tenant que não ativou a
 * vigilância não tem seus leads redistribuídos silenciosamente pelas nossas costas.
 */
export async function runRescueRetries(): Promise<RescueRetryResult> {
  const { rows } = await pool.query(
    `SELECT ls.lead_uuid, ls.tenant_id, ls.client_id, ls.imovel_id, ls.estado_fk, ls.cidade_fk
       FROM public.leads_staging ls
      WHERE ls.bola_com = 'nos'
        AND ls.corretor_atribuido_id IS NULL`,
  )

  // Cache por tenant — a fila de resgate concentra muitos leads do mesmo tenant.
  const cfgCache = new Map<string, boolean>()
  let atribuidos = 0

  for (const lead of rows) {
    let ativo = cfgCache.get(lead.tenant_id)
    if (ativo === undefined) {
      const cfg = await resolveEffectiveAgentConfig('pendencia_atendimento', lead.tenant_id, lead.client_id)
      ativo = !!cfg?.ativo
      cfgCache.set(lead.tenant_id, ativo)
    }
    if (!ativo) continue

    try {
      const candidato = await DistributionEngine.findBestCandidate(
        {
          lead_id: lead.lead_uuid,
          target_id: lead.imovel_id ?? undefined,
          estado_fk: lead.estado_fk ?? undefined,
          cidade_fk: lead.cidade_fk ?? undefined,
          tenant_id: lead.tenant_id,
        },
        [], // sem exclusões: o lead nunca chegou a ter dono, ninguém "já falhou" com ele
      )
      if (!candidato) continue

      await pool.query(
        `UPDATE public.leads_staging
            SET corretor_atribuido_id = $1, atribuido_em = NOW(), atribuicao_expira_em = $2
          WHERE lead_uuid = $3::uuid AND corretor_atribuido_id IS NULL`,
        [candidato.id, candidato.is_plantonista ? null : candidato.expira_em, lead.lead_uuid],
      )
      await pool.query(
        `INSERT INTO public.leads_staging_atribuicoes (lead_uuid, corretor_id, status, tenant_id, client_id)
         VALUES ($1::uuid, $2::uuid, 'atribuido', $3::uuid, $4)`,
        [lead.lead_uuid, candidato.id, lead.tenant_id, lead.client_id ?? null],
      )
      atribuidos++
    } catch (err) {
      // Um lead problemático nunca pode travar o resgate dos demais.
      console.error(`[crm/pendencia/resgate] falha ao reatribuir lead ${lead.lead_uuid}:`, err)
    }
  }

  return { examinados: rows.length, atribuidos }
}

export interface RescueQueueItem {
  leadUuid: string
  nome: string | null
  telefone: string | null
  bolaDesde: Date
  minutosParado: number
  motivo: 'sem_responsavel' | 'escada_esgotada'
  responsavelNome: string | null
  responsavelIndisponivel: boolean
}

/**
 * A fila em si — leads pendentes que a máquina NÃO conseguiu resolver sozinha. É uma consulta
 * sobre o estado, não uma tabela: nada a sincronizar, nada que possa divergir da realidade.
 *
 * Dois motivos de entrada:
 *   • `sem_responsavel` — nunca foi atribuído a ninguém (Buraco A puro)
 *   • `escada_esgotada` — passou por todos os degraus e continua aguardando ação nossa
 */
export async function getRescueQueue(tenantId: string, clientId?: string | null): Promise<RescueQueueItem[]> {
  const { rows } = await pool.query(
    `SELECT ls.lead_uuid, ls.nome, ls.telefone, ls.bola_desde,
            EXTRACT(EPOCH FROM (now() - ls.bola_desde))::bigint / 60 AS minutos_parado,
            ls.corretor_atribuido_id,
            u.nome AS responsavel_nome,
            (u.indisponivel_ate IS NOT NULL AND u.indisponivel_ate > now()) AS responsavel_indisponivel,
            COALESCE((
              SELECT max(COALESCE((caa.payload->>'degrau')::int, 0))
                FROM public.crm_agent_actions caa
               WHERE caa.lead_uuid = ls.lead_uuid
                 AND caa.agent_key = 'pendencia_atendimento'
                 AND caa.created_at >= ls.bola_desde
            ), 0) AS degrau_atual
       FROM public.leads_staging ls
       LEFT JOIN public.users u ON u.id = ls.corretor_atribuido_id
      WHERE ls.tenant_id = $1::uuid
        AND ($2::uuid IS NULL OR ls.client_id = $2::uuid)
        AND ls.bola_com = 'nos'
      ORDER BY ls.bola_desde ASC`,
    [tenantId, clientId ?? null],
  )

  return rows
    .filter((r) => !r.corretor_atribuido_id || Number(r.degrau_atual) >= 3)
    .map((r) => ({
      leadUuid: r.lead_uuid,
      nome: r.nome,
      telefone: r.telefone,
      bolaDesde: new Date(r.bola_desde),
      minutosParado: Number(r.minutos_parado),
      motivo: r.corretor_atribuido_id ? 'escada_esgotada' : 'sem_responsavel',
      responsavelNome: r.responsavel_nome ?? null,
      responsavelIndisponivel: r.responsavel_indisponivel === true,
    }))
}
