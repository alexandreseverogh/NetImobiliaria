import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { getTokenPayload } from '@/lib/auth/jwt-node'
import { requireAnyApiPermission } from '@/lib/auth/apiPermissions'
import { buildWebhookUrl, rotateWebhookSecret } from '@/lib/mensageria/evolutionWebhook'

export const dynamic = 'force-dynamic'

// Peça 3 do desacoplamento (docs/CHECKPOINT.md, 2026-09-02) — esta rota nunca teve gate de
// permissão além de "tem algum JWT válido". Qualquer usuário conseguia LER o token e REGENERÁ-LO
// (ação que derruba o fluxo de mensagens até a Evolution receber a URL nova). Mesmo padrão OR
// das Peças 1/2: qualquer um dos 3 módulos que dependem deste portão de entrada já prova acesso.
const EVOLUTION_WEBHOOK_RESOURCES = ['crm-agentes-config', 'mensageria-config', 'configuracoes-campanhas']

/** GET — config Evolution + URL do webhook do tenant (mesmo gerador usado pela criação). */
export async function GET(request: NextRequest) {
  const denied = await requireAnyApiPermission(request, EVOLUTION_WEBHOOK_RESOURCES, 'READ')
  if (denied) return denied

  const payload = getTokenPayload(request)
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { rows } = await pool.query(
    `SELECT evolution_api_url, evolution_instance, numero_whatsapp, evolution_webhook_secret
       FROM public.tenants WHERE id = $1`,
    [payload.tenantId],
  )
  const row = rows[0] || {}
  const secret: string | null = row.evolution_webhook_secret ?? null

  return NextResponse.json({
    evolution_api_url: row.evolution_api_url ?? null,
    evolution_instance: row.evolution_instance ?? null,
    numero_whatsapp: row.numero_whatsapp ?? null,
    evolution_webhook_secret: secret,
    webhook_url: secret ? buildWebhookUrl(secret) : null,
  })
}

/**
 * POST — troca o segredo e aplica a URL nova na Evolution. Ação destrutiva: se a Evolution
 * não aceitar, o segredo atual é mantido e o erro volta explícito (nunca "atualizado" falso).
 */
export async function POST(request: NextRequest) {
  const denied = await requireAnyApiPermission(request, EVOLUTION_WEBHOOK_RESOURCES, 'UPDATE')
  if (denied) return denied

  const payload = getTokenPayload(request)
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  try {
    const { secret, webhookUrl } = await rotateWebhookSecret(payload.tenantId)
    return NextResponse.json({ evolution_webhook_secret: secret, webhook_url: webhookUrl, webhook_synced: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message, webhook_synced: false }, { status: 502 })
  }
}
