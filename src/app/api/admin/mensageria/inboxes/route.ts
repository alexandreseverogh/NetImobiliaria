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

const CREATABLE_CHANNELS = ['whatsapp', 'webform', 'manual'] as const

/**
 * POST /api/admin/mensageria/inboxes — cria uma inbox própria do tenant (client_id NULL).
 * Complementa (não substitui) o auto-create preguiçoso de webform/manual em
 * src/lib/mensageria/inboxes.ts — útil quando o tenant ainda não teve nenhuma
 * interação real no canal e precisa da inbox existir antes (ex.: testar o bot).
 * Body: { name, channelType }
 */
export async function POST(request: NextRequest) {
  const payload = getTokenPayload(request)
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const name: string = (body.name || '').trim()
  const channelType: string = body.channelType

  if (!name) return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
  if (!CREATABLE_CHANNELS.includes(channelType as any)) {
    return NextResponse.json({ error: `Canal inválido. Use um de: ${CREATABLE_CHANNELS.join(', ')}` }, { status: 400 })
  }

  const { rows: existing } = await pool.query(
    `SELECT id FROM mensageria.inboxes WHERE tenant_id = $1 AND client_id IS NULL AND channel_type = $2 LIMIT 1`,
    [payload.tenantId, channelType],
  )
  if (existing[0]) {
    return NextResponse.json({ error: `Já existe uma inbox de ${channelType} para este tenant.` }, { status: 409 })
  }

  const provider = channelType === 'whatsapp' ? 'evolution' : 'internal'
  const { rows } = await pool.query(
    `INSERT INTO mensageria.inboxes (tenant_id, client_id, name, channel_type, provider, config)
     VALUES ($1, NULL, $2, $3, $4, '{}'::jsonb)
     RETURNING id, name, channel_type, provider, is_active, created_at`,
    [payload.tenantId, name, channelType, provider],
  )
  const row = rows[0]
  return NextResponse.json({
    inbox: {
      id: row.id, name: row.name, channelType: row.channel_type, provider: row.provider,
      isActive: row.is_active, createdAt: row.created_at, teamId: null, teamName: null,
    },
  }, { status: 201 })
}
