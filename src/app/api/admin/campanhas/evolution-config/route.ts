import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { getTokenPayload } from '@/lib/auth/jwt-node'
import { requireAnyApiPermission } from '@/lib/auth/apiPermissions'

export const dynamic = 'force-dynamic'

const WEBHOOK_BASE = process.env.NEXTAUTH_URL || 'https://artemis4.com.br'

// Peça 3 do desacoplamento (docs/CHECKPOINT.md, 2026-09-02) — achado real: esta rota nunca
// teve NENHUM gate de permissão além de "tem algum JWT válido pra algum tenant" — qualquer
// usuário autenticado, de qualquer role, conseguia LER o token secreto do webhook (GET) e
// REGENERÁ-LO (POST, ação destrutiva que derruba o fluxo de mensagens em produção até alguém
// colar a URL nova na Evolution API). Mesmo padrão OR das Peças 1/2: qualquer um dos 3 módulos
// que legitimamente dependem deste portão de entrada (Campanhas via CTA WhatsApp, CRM via
// processInboundWhatsAppMessage, Mensageria via a mesma função) já prova acesso legítimo.
const EVOLUTION_WEBHOOK_RESOURCES = ['crm-agentes-config', 'mensageria-config', 'configuracoes-campanhas']

/** GET — retorna config Evolution + webhook URL do tenant */
export async function GET(request: NextRequest) {
  const denied = await requireAnyApiPermission(request, EVOLUTION_WEBHOOK_RESOURCES, 'READ')
  if (denied) return denied

  const payload = getTokenPayload(request)
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { rows } = await pool.query(
    `SELECT evolution_api_url, evolution_instance, numero_whatsapp,
            evolution_webhook_secret
       FROM public.tenants WHERE id = $1`,
    [payload.tenantId],
  )
  const row = rows[0] || {}

  const webhookUrl = row.evolution_webhook_secret
    ? `${WEBHOOK_BASE}/api/public/evolution/webhook?token=${row.evolution_webhook_secret}`
    : null

  return NextResponse.json({
    evolution_api_url: row.evolution_api_url ?? null,
    evolution_instance: row.evolution_instance ?? null,
    numero_whatsapp: row.numero_whatsapp ?? null,
    evolution_webhook_secret: row.evolution_webhook_secret ?? null,
    webhook_url: webhookUrl,
  })
}

/** POST — regenera o webhook secret (ação destrutiva — ver EVOLUTION_WEBHOOK_RESOURCES acima) */
export async function POST(request: NextRequest) {
  const denied = await requireAnyApiPermission(request, EVOLUTION_WEBHOOK_RESOURCES, 'UPDATE')
  if (denied) return denied

  const payload = getTokenPayload(request)
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { rows } = await pool.query(
    `UPDATE public.tenants
        SET evolution_webhook_secret = gen_random_uuid()::text
      WHERE id = $1
     RETURNING evolution_webhook_secret`,
    [payload.tenantId],
  )
  const secret = rows[0]?.evolution_webhook_secret
  const webhookUrl = `${WEBHOOK_BASE}/api/public/evolution/webhook?token=${secret}`

  return NextResponse.json({ evolution_webhook_secret: secret, webhook_url: webhookUrl })
}
