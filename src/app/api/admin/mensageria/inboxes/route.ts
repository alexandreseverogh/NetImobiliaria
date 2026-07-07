import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { getTokenPayload } from '@/lib/auth/jwt-node'

export const dynamic = 'force-dynamic'

/** GET /api/admin/mensageria/inboxes — lista inboxes do tenant (status somente leitura) */
export async function GET(request: NextRequest) {
  const payload = getTokenPayload(request)
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { rows } = await pool.query(
    `SELECT ib.id, ib.name, ib.channel_type, ib.provider, ib.is_active, ib.created_at,
            ib.team_id, tm.name AS team_name
       FROM mensageria.inboxes ib
       LEFT JOIN mensageria.teams tm ON tm.id = ib.team_id
      WHERE ib.tenant_id = $1 ORDER BY ib.channel_type`,
    [payload.tenantId],
  )
  return NextResponse.json({
    inboxes: rows.map((r) => ({
      id: r.id, name: r.name, channelType: r.channel_type, provider: r.provider,
      isActive: r.is_active, createdAt: r.created_at,
      teamId: r.team_id, teamName: r.team_name,
    })),
  })
}
