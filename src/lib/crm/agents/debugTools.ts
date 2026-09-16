import pool from '@/lib/database/connection'

/**
 * Helpers do painel de debug (/admin/master/crm-agentes-debug) — nunca usados em produção,
 * só por essa página Master-only. Ver plano em .claude/plans/bright-sleeping-fairy.md.
 *
 * Escopados aos 2 tenants de teste criados pra essa frente: CRM SOZINHO (Venda de Carros,
 * já existente) e "CRM SOZINHO — IMOBILIÁRIO" (novo). Nada aqui toca segmento nem outro tenant.
 */

const SCAN_AGENT_KEYS = ['pendencia_atendimento', 'stage_stagnation', 'reactivation'] as const

/** Número real do usuário, já conectado à instância Evolution via QR — o único WhatsApp real
 *  sob nosso controle. Números fictícios nunca registrados no WhatsApp, usados pro lado do
 *  papel que está sendo simulado (o envio real falha graciosamente, sem incomodar ninguém). */
export const REAL_WHATSAPP_NUMBER = '5581998000047'
export const FAKE_LEAD_NUMBER = '5581900000001'
export const FAKE_ADMIN_NUMBER = '5500000000000'

/** Pausa (ou retoma, via null = herda o segmento) o scan automático de 5 em 5 min
 * (netimobiliaria-feed → /api/cron/crm/agentes-scan) pra este tenant — dá ao painel controle
 * exclusivo sobre pendencia_atendimento/stage_stagnation/reactivation. next_best_action
 * (ON_STAGE_CHANGE) e score_recalibration (cron próprio, nunca chamado por nós) não precisam
 * disso. */
export async function toggleScanSafety(tenantId: string, paused: boolean): Promise<void> {
  for (const agentKey of SCAN_AGENT_KEYS) {
    if (paused) {
      await pool.query(
        `INSERT INTO public.crm_agentes_config_tenant (tenant_id, agent_key, ativo, params)
         VALUES ($1::uuid, $2, false, '{}'::jsonb)
         ON CONFLICT (tenant_id, agent_key) DO UPDATE SET ativo = false`,
        [tenantId, agentKey],
      )
    } else {
      // NULL = "sem override" — volta a herdar o default do segmento (a mesma coisa que
      // resolveEffectiveAgentConfig já trata como "sem opinião do tenant").
      await pool.query(
        `UPDATE public.crm_agentes_config_tenant SET ativo = NULL
          WHERE tenant_id = $1::uuid AND agent_key = $2`,
        [tenantId, agentKey],
      )
    }
  }
}

export interface ScanSafetyStatus {
  agentKey: string
  pausedByOverride: boolean
}

export async function getScanSafetyStatus(tenantId: string): Promise<ScanSafetyStatus[]> {
  const { rows } = await pool.query(
    `SELECT agent_key, ativo FROM public.crm_agentes_config_tenant
      WHERE tenant_id = $1::uuid AND agent_key = ANY($2::text[])`,
    [tenantId, SCAN_AGENT_KEYS],
  )
  const byKey = new Map(rows.map((r) => [r.agent_key, r.ativo]))
  return SCAN_AGENT_KEYS.map((k) => ({ agentKey: k, pausedByOverride: byKey.get(k) === false }))
}

export type WhatsAppRole = 'admin-real' | 'lead-real'

/**
 * `admin-real`: você recebe de verdade os alertas/PIN (tenants.numero_whatsapp = seu número);
 * o envio ao lead (reactivation/etc.) usa um número fictício — falha graciosamente, mas o
 * painel mostra o texto exato que seria enviado.
 * `lead-real`: inverso — o lead de teste escolhido recebe de verdade a mensagem; o alerta ao
 * admin usa um número fictício (o painel reconstrói e mostra o texto mesmo sem entrega real).
 * Stateless por design: sempre determinístico a partir do papel escolhido, sem precisar
 * guardar "valor original" em lugar nenhum — reaplicar `admin-real` sempre restaura o estado
 * padrão do tenant (numero_whatsapp = seu número real).
 */
export async function setWhatsAppRole(
  tenantId: string,
  role: WhatsAppRole,
  testLeadUuid: string | null,
): Promise<void> {
  const numeroWhatsapp = role === 'admin-real' ? REAL_WHATSAPP_NUMBER : FAKE_ADMIN_NUMBER
  await pool.query(`UPDATE public.tenants SET numero_whatsapp = $1 WHERE id = $2::uuid`, [numeroWhatsapp, tenantId])

  if (testLeadUuid) {
    const telefone = role === 'admin-real' ? FAKE_LEAD_NUMBER : REAL_WHATSAPP_NUMBER
    await pool.query(`UPDATE public.leads_staging SET telefone = $1 WHERE lead_uuid = $2::uuid`, [telefone, testLeadUuid])
  }
}

export interface WhatsAppRoleStatus {
  numeroWhatsapp: string | null
  role: WhatsAppRole | 'unknown'
}

export async function getWhatsAppRoleStatus(tenantId: string): Promise<WhatsAppRoleStatus> {
  const { rows } = await pool.query(`SELECT numero_whatsapp FROM public.tenants WHERE id = $1::uuid`, [tenantId])
  const numeroWhatsapp = rows[0]?.numero_whatsapp ?? null
  const role: WhatsAppRoleStatus['role'] =
    numeroWhatsapp === REAL_WHATSAPP_NUMBER ? 'admin-real' : numeroWhatsapp === FAKE_ADMIN_NUMBER ? 'lead-real' : 'unknown'
  return { numeroWhatsapp, role }
}

/**
 * Backdate por agente — evita esperar dias/horas reais pra ver um agente disparar.
 * `pendencia_atendimento`: recua `bola_desde` (mantendo `bola_com='nos'`).
 * `reactivation`: recua `bola_desde` com `bola_com='cliente'` (é o que o findCandidates exige).
 * `stage_stagnation`: recua `data_entrada` do ciclo ABERTO (data_saida IS NULL) do lead no Kanban.
 */
export async function backdateForAgent(
  agentKey: 'pendencia_atendimento' | 'reactivation' | 'stage_stagnation',
  leadUuid: string,
  amount: number,
  unit: 'minutes' | 'hours' | 'days',
): Promise<void> {
  const interval = `${amount} ${unit}`
  if (agentKey === 'pendencia_atendimento') {
    await pool.query(
      `UPDATE public.leads_staging SET bola_com = 'nos', bola_desde = now() - $2::interval WHERE lead_uuid = $1::uuid`,
      [leadUuid, interval],
    )
    // INICIO_JANELA (pendenciaAtendimentoAgent.ts) usa GREATEST(bola_desde, MAX(atribuições)) —
    // sem recuar também a atribuição mais recente, a janela reseta pro "agora" (o lead acabou
    // de ser atribuído na criação) e o degrau nunca sai de 0, mesmo com bola_desde no passado.
    await pool.query(
      `UPDATE public.leads_staging_atribuicoes SET created_at = now() - $2::interval
        WHERE lead_uuid = $1::uuid`,
      [leadUuid, interval],
    )
  } else if (agentKey === 'reactivation') {
    await pool.query(
      `UPDATE public.leads_staging SET bola_com = 'cliente', bola_desde = now() - $2::interval WHERE lead_uuid = $1::uuid`,
      [leadUuid, interval],
    )
  } else {
    await pool.query(
      `UPDATE public.leads_kanban_ciclos SET data_entrada = now() - $2::interval
        WHERE lead_uuid = $1::uuid AND data_saida IS NULL`,
      [leadUuid, interval],
    )
  }
}
