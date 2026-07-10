import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { getTokenPayload } from '@/lib/auth/jwt-node'

export const dynamic = 'force-dynamic'

/**
 * Configuração operacional do bot do tenant (M4.1/M4.2) — só o flow "padrão"
 * (client_id IS NULL) é editável pela UI. A PERSONA do bot NÃO mora aqui: é dirigida
 * por segmento em /admin/master/prompts (template `mensageria_bot_persona`). Aqui só o
 * operacional do tenant: ativo/inativo e regras de handoff.
 * O schema já suporta override por cliente (bot_flows.client_id), mas isso fica para uma
 * rodada futura (ver docs/PLANO_MENSAGERIA.md seção 18.1).
 */

/** GET /api/admin/mensageria/bot-flows — retorna o flow padrão do tenant (ou null se nunca configurado) */
export async function GET(request: NextRequest) {
  const payload = getTokenPayload(request)
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { rows } = await pool.query(
    `SELECT id, name, is_active, handoff_rules
       FROM mensageria.bot_flows
      WHERE tenant_id = $1 AND client_id IS NULL
      LIMIT 1`,
    [payload.tenantId],
  )
  const row = rows[0]
  return NextResponse.json({
    flow: row ? {
      id: row.id,
      name: row.name,
      isActive: row.is_active,
      handoffKeywords: row.handoff_rules?.keywords || [],
      maxTurns: row.handoff_rules?.maxTurns ?? null,
    } : null,
  })
}

/**
 * PUT /api/admin/mensageria/bot-flows — cria ou atualiza o flow padrão do tenant.
 * Body: { isActive, handoffKeywords?, maxTurns? }
 */
export async function PUT(request: NextRequest) {
  const payload = getTokenPayload(request)
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const isActive = !!body.isActive
  const handoffKeywords: string[] = Array.isArray(body.handoffKeywords)
    ? body.handoffKeywords.map((k: any) => String(k).trim()).filter(Boolean)
    : []
  const maxTurns = Number.isFinite(body.maxTurns) && body.maxTurns > 0 ? Math.floor(body.maxTurns) : null
  const handoffRules = { keywords: handoffKeywords, maxTurns }

  const { rows: existing } = await pool.query(
    `SELECT id FROM mensageria.bot_flows WHERE tenant_id = $1 AND client_id IS NULL LIMIT 1`,
    [payload.tenantId],
  )

  let row
  if (existing[0]) {
    const { rows } = await pool.query(
      `UPDATE mensageria.bot_flows
          SET is_active = $1, handoff_rules = $2::jsonb
        WHERE id = $3
        RETURNING id, name, is_active, handoff_rules`,
      [isActive, JSON.stringify(handoffRules), existing[0].id],
    )
    row = rows[0]
  } else {
    const { rows } = await pool.query(
      `INSERT INTO mensageria.bot_flows (tenant_id, client_id, name, mode, handoff_rules, is_active)
       VALUES ($1, NULL, 'Bot padrão', 'llm', $2::jsonb, $3)
       RETURNING id, name, is_active, handoff_rules`,
      [payload.tenantId, JSON.stringify(handoffRules), isActive],
    )
    row = rows[0]
  }

  return NextResponse.json({
    flow: {
      id: row.id, name: row.name, isActive: row.is_active,
      handoffKeywords: row.handoff_rules?.keywords || [], maxTurns: row.handoff_rules?.maxTurns ?? null,
    },
  })
}
