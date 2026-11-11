import pool from '@/lib/database/connection'

/**
 * Fixa o dono do lead (leads_staging.dono_user_id) no primeiro usuário logado que atua nele.
 *
 * Regra (decisão 2026-11-13): o dono é quem passou a alimentar o lead — primeira atividade
 * registrada, primeira movimentação no Kanban, primeira edição da ficha ou primeiro agendamento.
 * Uma vez fixado, não muda: COALESCE garante que ações posteriores de outros usuários não
 * sobrescrevem. Leads de campanha nascem com dono NULL ("Ainda não atendido").
 *
 * Best-effort: nunca derruba a ação principal (atividade, move, edição) se falhar.
 */
export async function fixarDonoSeVazio(leadUuid: string, userId: string | null | undefined): Promise<void> {
  if (!leadUuid || !userId) return
  try {
    await pool.query(
      `UPDATE public.leads_staging
          SET dono_user_id = COALESCE(dono_user_id, $2::uuid)
        WHERE lead_uuid = $1::uuid AND dono_user_id IS NULL`,
      [leadUuid, userId],
    )
  } catch (err) {
    console.error('[leadDono] falha ao fixar dono do lead (ignorada):', err)
  }
}
