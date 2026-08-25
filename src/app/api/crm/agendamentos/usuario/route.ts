import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { verifyAuthOrRespond } from '@/lib/auth/authHelpers'
import { resolveAtivoConfig, IDENT_RE } from '@/lib/crm/resolveAtivoConfig'

export async function GET(request: NextRequest) {
  const auth = await verifyAuthOrRespond(request)
  if (!auth.success) return auth.response!

  const userId = auth.payload!.userId
  const tenantId = request.nextUrl.searchParams.get('tenantId')

  if (!tenantId) {
    return NextResponse.json({ error: 'tenantId obrigatório' }, { status: 400 })
  }

  try {
    // CRM agnóstico de segmento — mesmo mecanismo de src/app/api/crm/agendamentos/route.ts
    // (resolveAtivoConfig), o "ativo" vinculado nunca é hardcoded na tabela `imoveis`.
    const ativoConfig = await resolveAtivoConfig(tenantId)
    const hasAtivo = !!(
      ativoConfig?.targetTable && ativoConfig?.targetNameColumn &&
      IDENT_RE.test(ativoConfig.targetTable) && IDENT_RE.test(ativoConfig.targetNameColumn)
    )

    const { rows } = await pool.query(
      hasAtivo
        ? `SELECT a.*, ls.nome as lead_nome, ls.email as lead_email, i."${ativoConfig!.targetNameColumn}" as imovel_nome
           FROM agendamentos a
           JOIN leads_staging ls ON ls.lead_uuid = a.lead_uuid
           LEFT JOIN "${ativoConfig!.targetTable}" i ON i.id = a.imovel_id
           WHERE a.usuario_id = $1 AND a.tenant_id = $2
           ORDER BY a.data_hora_inicio ASC`
        : `SELECT a.*, ls.nome as lead_nome, ls.email as lead_email, NULL::text as imovel_nome
           FROM agendamentos a
           JOIN leads_staging ls ON ls.lead_uuid = a.lead_uuid
           WHERE a.usuario_id = $1 AND a.tenant_id = $2
           ORDER BY a.data_hora_inicio ASC`,
      [userId, tenantId]
    )

    return NextResponse.json({ success: true, agendamentos: rows })
  } catch (err: any) {
    console.error('❌ [API Agenda] Erro:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
