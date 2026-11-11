import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { verifyAuthOrRespond } from '@/lib/auth/authHelpers'

/**
 * GET /api/crm/config/tenant
 * Retorna configurações do tenant do usuário logado relevantes para o CRM
 * (calendario, crm_clientes, duracao_visita, google_calendar_authorized do usuário)
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
        COALESCE(t.crm_clientes, false) as crm_clientes,
        t.duracao_visita,
        t.tipo_atividade_mensagem_id,
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

/**
 * PATCH /api/crm/config/tenant — escreve SÓ o tipo de atividade que representa mensagens
 * trocadas. Escrita sempre no tenant do token (nunca aceita tenantId do corpo/query), e o
 * tipo escolhido precisa pertencer ao próprio tenant e estar ativo.
 */
export async function PATCH(request: NextRequest) {
  const auth = await verifyAuthOrRespond(request)
  if (!auth.success) return auth.response!

  const tenantId = (auth as any).payload?.tenantId
  if (!tenantId) return NextResponse.json({ success: false, error: 'Sem empresa no token' }, { status: 400 })

  const body = await request.json().catch(() => ({}))
  const raw = body?.tipo_atividade_mensagem_id
  const tipoId = raw === null || raw === '' || raw === undefined ? null : parseInt(String(raw), 10)
  if (tipoId !== null && Number.isNaN(tipoId)) {
    return NextResponse.json({ success: false, error: 'Tipo inválido' }, { status: 400 })
  }

  try {
    if (tipoId !== null) {
      const { rows } = await pool.query(
        `SELECT 1 FROM public.tipos_atividade WHERE id = $1 AND tenant_id = $2 AND ativo = true`,
        [tipoId, tenantId],
      )
      if (!rows[0]) {
        return NextResponse.json({ success: false, error: 'Tipo não pertence à empresa ou está inativo' }, { status: 400 })
      }
    }
    await pool.query(
      `UPDATE public.tenants SET tipo_atividade_mensagem_id = $1, updated_at = NOW() WHERE id = $2`,
      [tipoId, tenantId],
    )
    return NextResponse.json({ success: true, tipo_atividade_mensagem_id: tipoId })
  } catch (err: any) {
    console.error('❌ [CRM] Erro ao salvar tipo de mensagem:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
