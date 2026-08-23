import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { verifyAuthOrRespond } from '@/lib/auth/authHelpers'
import {
  getAvailableSlots,
  getUserRefreshToken,
  getTenantCalendarConfig,
} from '@/lib/google/calendarService'

/**
 * GET /api/crm/agendamentos/disponibilidade
 * Retorna slots disponíveis para uma data combinando calendário do usuário + empresa
 */
export async function GET(request: NextRequest) {
  const auth = await verifyAuthOrRespond(request)
  if (!auth.success) return auth.response!

  const userId = auth.payload!.userId
  const { searchParams } = request.nextUrl
  const data = searchParams.get('data')
  const queryTenantId = searchParams.get('tenantId')

  if (!data || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    return NextResponse.json(
      { error: 'Parâmetro "data" obrigatório no formato YYYY-MM-DD' },
      { status: 400 }
    )
  }

  try {
    // Buscar tenant_id ativo do usuário (priorizando o que veio na query)
    const targetTenantId = queryTenantId || (auth as any).payload?.tenantId;

    if (!targetTenantId) {
       return NextResponse.json({ error: 'Tenant ID não fornecido' }, { status: 400 })
    }

    const { rows: userRows } = await pool.query(
      `SELECT utm.tenant_id, u.google_calendar_authorized
       FROM users u
       JOIN user_tenant_membership utm ON u.id = utm.user_id
       WHERE u.id = $1 AND utm.tenant_id = $2 AND utm.is_active = true
       LIMIT 1`,
      [userId, targetTenantId]
    )

    if (!userRows[0]) {
      return NextResponse.json({ error: 'Usuário ou empresa não encontrada' }, { status: 404 })
    }

    const { tenant_id } = userRows[0]

    // Configuração do TENANT é o bloqueio real — o calendário pessoal do atendente logado é
    // só um reforço opcional (checado mais abaixo), nunca motivo de bloquear o agendamento.
    const tenantConfig = await getTenantCalendarConfig(tenant_id)
    console.log('📡 [Disponibilidade] Config do Tenant:', tenantConfig)

    if (!tenantConfig?.calendario) {
      return NextResponse.json(
        { error: 'Módulo de agendamentos não habilitado para este tenant', code: 'MODULE_DISABLED' },
        { status: 403 }
      )
    }
    if (!tenantConfig.google_email) {
      return NextResponse.json(
        { error: 'E-mail Google da empresa não configurado. Peça a um administrador para configurar em Configurações da Empresa.', code: 'NO_COMPANY_EMAIL' },
        { status: 503 }
      )
    }

    // Refresh token pessoal é opcional — sem ele, getAvailableSlots calcula a disponibilidade
    // só pelo calendário da empresa.
    const refreshToken = await getUserRefreshToken(userId)

    const slots = await getAvailableSlots(
      tenantConfig.google_email,
      refreshToken,
      data,
      tenantConfig.duracao_visita
    )

    return NextResponse.json({ success: true, slots, duracao_visita: tenantConfig.duracao_visita })
  } catch (err: any) {
    console.error('[Disponibilidade] Erro:', err.message)
    return NextResponse.json(
      { error: 'Erro ao consultar disponibilidade', details: err.message },
      { status: 500 }
    )
  }
}
