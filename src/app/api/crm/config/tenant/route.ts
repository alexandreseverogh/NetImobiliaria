import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { verifyAuthOrRespond } from '@/lib/auth/authHelpers'

/**
 * GET /api/crm/config/tenant
 * Retorna configurações do tenant do usuário logado relevantes para o CRM
 * (calendario, duracao_visita, google_calendar_authorized do usuário)
 */
export async function GET(request: NextRequest) {
  const auth = await verifyAuthOrRespond(request)
  if (!auth.success) return auth.response!

  const userId = auth.payload!.userId

  const { searchParams } = new URL(request.url)
  const queryTenantId = searchParams.get('tenantId')

  try {
    const targetTenantId = queryTenantId || (auth as any).payload?.tenantId;

    if (!targetTenantId) {
       return NextResponse.json({ success: false, error: 'Identificador da empresa não fornecido' }, { status: 400 })
    }

    const { rows } = await pool.query(
      `SELECT 
        COALESCE(t.calendario, false) as calendario,
        t.duracao_visita, 
        t.google_email IS NOT NULL as empresa_configurada,
        u.google_calendar_authorized,
        u.google_refresh_token IS NOT NULL as has_google_token,
        u.email as user_email
       FROM users u
       CROSS JOIN tenants t 
       WHERE u.id = $1 AND t.id = $2`,
      [userId, targetTenantId]
    )
    
    if (!rows[0]) {
      return NextResponse.json({ success: false, error: 'Configuração não encontrada' }, { status: 404 })
    }

    return NextResponse.json({ success: true, config: rows[0] })
  } catch (err: any) {
    console.error('❌ [CRM] Erro ao buscar config:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
