import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { getTokenPayload } from '@/lib/auth/jwt-node'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/tenant-modulos — quais módulos o tenant da sessão tem contratados.
 * Usado pra decidir as abas de Integração Mídias Sociais e Comunicação.
 * Master (is_system_role) vê tudo.
 */
export async function GET(request: NextRequest) {
  const payload = getTokenPayload(request)
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { rows } = await pool.query(
    `SELECT sm.slug
       FROM public.tenant_modules tm
       JOIN public.system_modules sm ON sm.id = tm.module_id
      WHERE tm.tenant_id = $1::uuid AND tm.is_enabled = true
        AND sm.slug IN ('trafego-pago', 'crm', 'mensageria')`,
    [payload.tenantId],
  )
  const slugs = new Set(rows.map(r => r.slug as string))
  const gera = await pool.query(
    `SELECT gera_mensagens_whatsapp FROM public.tenants WHERE id = $1::uuid LIMIT 1`,
    [payload.tenantId],
  )
  const isMaster = !!payload.is_system_role
  return NextResponse.json({
    campanhas: isMaster || slugs.has('trafego-pago'),
    comunicacao: isMaster || slugs.has('mensageria') || (slugs.has('crm') && gera.rows[0]?.gera_mensagens_whatsapp === true),
    // Central de Mensagens (dentro de Comunicação): Mensageria + geração de mensagens.
    centralMensagens: isMaster || (slugs.has('mensageria') && gera.rows[0]?.gera_mensagens_whatsapp === true),
  })
}
