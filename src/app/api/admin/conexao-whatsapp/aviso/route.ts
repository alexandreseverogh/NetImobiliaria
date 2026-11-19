import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { getTokenPayload } from '@/lib/auth/jwt-node'
import { requireAnyApiPermission } from '@/lib/auth/apiPermissions'
import { isAvatarTtlEnabled } from '@/lib/mensageria/avatarService'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/conexao-whatsapp/aviso — a faixa de aviso da área administrativa.
 * Mostra aviso só para quem tem permissão de dados da empresa e só quando a empresa usa o canal
 * (Mensageria + geração de mensagens). Não consulta a Evolution: lê o último estado gravado.
 */
export async function GET(request: NextRequest) {
  const payload = getTokenPayload(request)
  if (!payload?.tenantId) return NextResponse.json({ show: false })
  const denied = await requireAnyApiPermission(request, ['dados-empresa'], 'READ')
  if (denied) return NextResponse.json({ show: false })
  if (!(await isAvatarTtlEnabled(payload.tenantId))) return NextResponse.json({ show: false })

  const { rows } = await pool.query(
    `SELECT evolution_disconnected_at FROM public.tenants WHERE id = $1::uuid LIMIT 1`,
    [payload.tenantId],
  )
  const since: Date | null = rows[0]?.evolution_disconnected_at ?? null
  return NextResponse.json({ show: !!since, since })
}
