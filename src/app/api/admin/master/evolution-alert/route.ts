import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth/jwt'
import pool from '@/lib/database/connection'

export const dynamic = 'force-dynamic'

/**
 * GET/PUT /api/admin/master/evolution-alert
 * Número do Master que RECEBE os alertas de conexão do WhatsApp. Fica no próprio tenant Master
 * (public.tenants.whatsapp_alerta). Só o Master acessa; o tenant é o da sessão do Master.
 */
async function requireMaster(request: NextRequest) {
  const token = request.cookies.get('admin_auth_token')?.value
  const decoded = token ? await verifyToken(token) : null
  if (!decoded || !decoded.is_system_role || !decoded.tenantId) return null
  return decoded
}

export async function GET(request: NextRequest) {
  const decoded = await requireMaster(request)
  if (!decoded) return NextResponse.json({ error: 'Acesso Master Requerido' }, { status: 403 })
  const { rows } = await pool.query(`SELECT whatsapp_alerta FROM public.tenants WHERE id = $1::uuid`, [decoded.tenantId])
  return NextResponse.json({ whatsappAlerta: rows[0]?.whatsapp_alerta ?? null })
}

export async function PUT(request: NextRequest) {
  const decoded = await requireMaster(request)
  if (!decoded) return NextResponse.json({ error: 'Acesso Master Requerido' }, { status: 403 })
  const body = await request.json()
  const raw = String(body.whatsappAlerta ?? '').replace(/\D/g, '')
  if (raw && !/^\d{10,13}$/.test(raw)) {
    return NextResponse.json({ error: 'Número deve conter apenas dígitos, com DDD (10 a 13 dígitos)' }, { status: 400 })
  }
  await pool.query(
    `UPDATE public.tenants SET whatsapp_alerta = $1, updated_at = now() WHERE id = $2::uuid`,
    [raw || null, decoded.tenantId],
  )
  return NextResponse.json({ success: true, whatsappAlerta: raw || null })
}
