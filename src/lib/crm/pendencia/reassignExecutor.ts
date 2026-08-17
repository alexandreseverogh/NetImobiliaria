import pool from '@/lib/database/connection'
import { DistributionEngine } from '@/lib/routing/distributionEngine'

/**
 * G2 — Reatribuição automática por pendência de atendimento
 * (docs/PLANO_PENDENCIA_ATENDIMENTO.md §4, degrau 3).
 *
 * É o degrau que transforma o motor de "alarme" em "correção": quando um lead passou tempo
 * demais aguardando uma ação nossa mesmo depois do alerta e do escalonamento, ele é passado
 * para outro atendente automaticamente — sem fila de aprovação, por decisão explícita do
 * usuário (2026-08-08): a plataforma automatiza call centers, e esperar decisão manual para
 * religar o atendimento derrota o propósito.
 *
 * Reaproveita integralmente o DistributionEngine e o catálogo de estratégias por segmento que
 * já existiam — o que faltava nunca foi o mecanismo de reatribuir, era um gatilho que
 * enxergasse o abandono no meio da conversa. O transbordo (cron) só olha
 * `atribuicao_expira_em`, que é um prazo de ACEITE inicial e nasce NULL justamente nos dois
 * caminhos mais comuns (dono do ativo e plantonista) — ver Buraco B do §1 do plano.
 */

export interface ReassignOutcome {
  reatribuido: boolean
  /** Resumo curto para o digest — o gestor precisa saber o que a máquina mudou sozinha. */
  resumo: string
  novoResponsavelId?: string
}

/**
 * Reatribui o lead, excluindo quem já o teve (inclusive o atual). Nunca penaliza um responsável
 * marcado como indisponível: perder o lead sim, levar punição de SLA não — adoecer não é
 * relaxar (§4.1). Os atendentes indisponíveis também já são filtrados dentro das próprias
 * estratégias de distribuição, então o motor nunca entrega o lead para outra pessoa ausente.
 */
export async function reassignStalledLead(leadUuid: string, tenantId: string): Promise<ReassignOutcome> {
  const { rows } = await pool.query(
    `SELECT ls.corretor_atribuido_id, ls.imovel_id, ls.estado_fk, ls.cidade_fk, ls.client_id,
            u.nome AS atual_nome,
            (u.indisponivel_ate IS NOT NULL AND u.indisponivel_ate > now()) AS atual_indisponivel
       FROM public.leads_staging ls
       LEFT JOIN public.users u ON u.id = ls.corretor_atribuido_id
      WHERE ls.lead_uuid = $1::uuid`,
    [leadUuid],
  )
  const lead = rows[0]
  if (!lead) return { reatribuido: false, resumo: 'lead não encontrado' }

  // Exclui todo mundo que já teve este lead — reatribuir para quem já o abandonou antes
  // apenas reinicia o mesmo ciclo de silêncio.
  const { rows: hist } = await pool.query(
    `SELECT DISTINCT corretor_id FROM public.leads_staging_atribuicoes WHERE lead_uuid = $1::uuid`,
    [leadUuid],
  )
  const exclude: string[] = hist.map((h) => h.corretor_id).filter(Boolean)
  if (lead.corretor_atribuido_id && !exclude.includes(lead.corretor_atribuido_id)) {
    exclude.push(lead.corretor_atribuido_id)
  }

  // O dono do ativo é resolvido pela própria estratégia owner_of_asset a partir da config do
  // segmento — não passamos source_owner_id de propósito: se o dono está na lista de exclusão
  // (é justamente ele que abandonou), a cascata precisa seguir para a próxima estratégia.
  const novo = await DistributionEngine.findBestCandidate(
    {
      lead_id: leadUuid,
      target_id: lead.imovel_id ?? undefined,
      estado_fk: lead.estado_fk ?? undefined,
      cidade_fk: lead.cidade_fk ?? undefined,
      tenant_id: tenantId,
    },
    exclude,
  )

  if (!novo) {
    // Buraco A do plano: hoje o lead simplesmente ficaria parado e invisível. Aqui ele
    // permanece explicitamente pendente — o motor volta a avaliá-lo nas próximas rodadas, e a
    // fila de resgate visível é a entrega da G3.
    return {
      reatribuido: false,
      resumo: `sem atendente disponível para reatribuir${lead.atual_nome ? ` (segue com ${lead.atual_nome})` : ''}`,
    }
  }

  await pool.query(
    `UPDATE public.leads_staging
        SET corretor_atribuido_id = $1,
            atribuido_em = NOW(),
            atribuicao_expira_em = $2
      WHERE lead_uuid = $3::uuid`,
    [novo.id, novo.is_plantonista ? null : novo.expira_em, leadUuid],
  )

  await pool.query(
    `INSERT INTO public.leads_staging_atribuicoes (lead_uuid, corretor_id, status, tenant_id, client_id)
     VALUES ($1::uuid, $2::uuid, 'atribuido', $3::uuid, $4)`,
    [leadUuid, novo.id, tenantId, lead.client_id ?? null],
  )

  // Gamificação: quem estava de licença perde o lead mas NÃO leva penalidade de SLA.
  // Best-effort dos dois lados — falha de gamificação nunca desfaz a reatribuição, que é o
  // que de fato protege o cliente.
  try {
    const { GamificationService } = await import('@/lib/gamification/gamificationService')
    if (lead.corretor_atribuido_id && !lead.atual_indisponivel) {
      await GamificationService.penalizeSLA(lead.corretor_atribuido_id)
    }
    await GamificationService.awardXP(novo.id, 0, 'leads_recebidos')
  } catch {
    /* gamificação é acessória */
  }

  const de = lead.atual_nome
    ? `${lead.atual_nome}${lead.atual_indisponivel ? ' (indisponível, sem penalidade)' : ''}`
    : 'sem responsável'
  return {
    reatribuido: true,
    resumo: `reatribuído automaticamente: ${de} → ${novo.nome} (${novo.motivo_atribuicao})`,
    novoResponsavelId: novo.id,
  }
}
