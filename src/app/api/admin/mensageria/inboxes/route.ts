import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { getTokenPayload } from '@/lib/auth/jwt-node'
import { resolveWhatsAppProvider } from '@/lib/mensageria/inboxes'

export const dynamic = 'force-dynamic'

/** GET /api/admin/mensageria/inboxes — lista inboxes do tenant (status somente leitura) */
export async function GET(request: NextRequest) {
  const payload = getTokenPayload(request)
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { rows } = await pool.query(
    `SELECT ib.id, ib.name, ib.channel_type, ib.provider, ib.is_active, ib.created_at,
            ib.team_id, tm.name AS team_name, ib.client_id, cl.nome AS client_name
       FROM mensageria.inboxes ib
       LEFT JOIN mensageria.teams tm ON tm.id = ib.team_id
       LEFT JOIN public.clientes cl ON cl.uuid = ib.client_id
      WHERE ib.tenant_id = $1 ORDER BY ib.channel_type`,
    [payload.tenantId],
  )
  return NextResponse.json({
    inboxes: rows.map((r) => ({
      id: r.id, name: r.name, channelType: r.channel_type, provider: r.provider,
      isActive: r.is_active, createdAt: r.created_at,
      teamId: r.team_id, teamName: r.team_name,
      clientId: r.client_id, clientName: r.client_name,
    })),
  })
}

const CREATABLE_CHANNELS = ['whatsapp', 'webform', 'manual'] as const

/**
 * POST /api/admin/mensageria/inboxes — cria uma inbox do tenant OU de um cliente específico.
 * Complementa (não substitui) o auto-create preguiçoso de webform/manual/whatsapp em
 * src/lib/mensageria/inboxes.ts — útil quando ainda não houve nenhuma interação real no canal
 * e precisa da inbox existir antes (ex.: testar o bot). `resolveWhatsAppInbox()` já cria uma
 * inbox por cliente automaticamente quando ele tem WhatsApp próprio — isto só cobre o caso de
 * querer criar/ver isso ANTES da 1ª mensagem real, pros 3 canais.
 * Body: { name, channelType, clientId? }
 */
export async function POST(request: NextRequest) {
  const payload = getTokenPayload(request)
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const name: string = (body.name || '').trim()
  const channelType: string = body.channelType
  const clientId: string | null = body.clientId || null

  if (!name) return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
  if (!CREATABLE_CHANNELS.includes(channelType as any)) {
    return NextResponse.json({ error: `Canal inválido. Use um de: ${CREATABLE_CHANNELS.join(', ')}` }, { status: 400 })
  }
  if (clientId) {
    const { rows: own } = await pool.query(`SELECT 1 FROM public.clientes WHERE uuid = $1 AND tenant_id = $2`, [clientId, payload.tenantId])
    if (own.length === 0) return NextResponse.json({ error: 'Cliente não encontrado neste tenant' }, { status: 400 })
  }

  // Mesma unicidade do auto-create: 1 inbox por (tenant, cliente OU tenant-wide, canal).
  const { rows: existing } = await pool.query(
    `SELECT id FROM mensageria.inboxes
      WHERE tenant_id = $1 AND channel_type = $2 AND client_id IS NOT DISTINCT FROM $3
      LIMIT 1`,
    [payload.tenantId, channelType, clientId],
  )
  if (existing[0]) {
    return NextResponse.json(
      { error: `Já existe uma inbox de ${channelType} para ${clientId ? 'este cliente' : 'este tenant'}.` },
      { status: 409 },
    )
  }

  // Canal whatsapp respeita a escolha explícita e excludente de provider (tenant/cliente,
  // docs/PLANO_WHATSAPP_CLOUD_API_PROVIDER.md seção 5.4b) — nunca hardcoded em 'evolution'.
  const provider = channelType === 'whatsapp' ? await resolveWhatsAppProvider(payload.tenantId, clientId) : 'internal'
  const { rows } = await pool.query(
    `INSERT INTO mensageria.inboxes (tenant_id, client_id, name, channel_type, provider, config)
     VALUES ($1, $2, $3, $4, $5, '{}'::jsonb)
     RETURNING id, name, channel_type, provider, is_active, created_at`,
    [payload.tenantId, clientId, name, channelType, provider],
  )
  const row = rows[0]
  return NextResponse.json({
    inbox: {
      id: row.id, name: row.name, channelType: row.channel_type, provider: row.provider,
      isActive: row.is_active, createdAt: row.created_at, teamId: null, teamName: null,
      clientId, clientName: null,
    },
  }, { status: 201 })
}
