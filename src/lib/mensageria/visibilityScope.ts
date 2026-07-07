/**
 * Modelo de visibilidade gerencial (M5.1) — 3 níveis: Administrador (total),
 * Líder de time (`mensageria.team_members.role='lead'`, escopado ao(s) time(s) que lidera),
 * Atendente (própria + não atribuídas do time). Decisão confirmada em docs/PLANO_MENSAGERIA.md
 * seção 16.3 (Opção A). Reaproveitado por GET /conversations, detalhe, PATCH, envio de mensagem
 * e (futuramente) M5/Painel do Gestor — um único resolver, sem lógica duplicada.
 */
import pool from '@/lib/database/connection'

export type MensageriaScope =
  | { level: 'full' }
  | { level: 'team'; teamIds: string[] }
  | { level: 'own'; userId: string; teamIds: string[] }

/**
 * Mesmo critério de "admin" já usado pela sidebar (`get_sidebar_menu_for_user`,
 * `role.name ILIKE '%admin%'`) e pelo bypass de Master (`is_system_role`) — lido
 * direto do JWT (já carrega ambos os campos), sem round-trip extra ao banco.
 */
export function isTenantAdminFromPayload(payload: { role_name?: string; is_system_role?: boolean } | null | undefined): boolean {
  if (!payload) return false
  if (payload.is_system_role) return true
  return !!payload.role_name && payload.role_name.toLowerCase().includes('admin')
}

export async function resolveMensageriaScope(
  tenantId: string,
  userId: string,
  isTenantAdmin: boolean,
): Promise<MensageriaScope> {
  if (isTenantAdmin) return { level: 'full' }

  const { rows } = await pool.query(
    `SELECT tm.team_id, tm.role
       FROM mensageria.team_members tm
       JOIN mensageria.teams t ON t.id = tm.team_id
      WHERE tm.user_id = $1 AND t.tenant_id = $2`,
    [userId, tenantId],
  )
  const leaderTeams = rows.filter((r) => r.role === 'lead').map((r) => r.team_id)
  if (leaderTeams.length > 0) return { level: 'team', teamIds: leaderTeams }

  return { level: 'own', userId, teamIds: rows.map((r) => r.team_id) }
}

/**
 * Traduz o escopo para uma cláusula SQL parametrizada, a ser adicionada ao WHERE
 * existente de uma query em mensageria.conversations (alias `c`). `startIndex` é o
 * próximo índice de parâmetro livre ($N) do array `args` já construído pelo chamador.
 */
export function scopeToSql(scope: MensageriaScope, args: any[]): { clause: string | null; args: any[] } {
  if (scope.level === 'full') return { clause: null, args }
  if (scope.level === 'team') {
    args.push(scope.teamIds)
    return { clause: `c.team_id = ANY($${args.length}::uuid[])`, args }
  }
  // level === 'own'
  args.push(scope.userId)
  const userIdx = args.length
  args.push(scope.teamIds)
  const teamsIdx = args.length
  return {
    clause: `(c.assignee_id = $${userIdx} OR (c.assignee_id IS NULL AND c.team_id = ANY($${teamsIdx}::uuid[])))`,
    args,
  }
}
