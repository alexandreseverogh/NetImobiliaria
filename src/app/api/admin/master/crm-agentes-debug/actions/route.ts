import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { requireMaster } from '@/lib/crm/agents/debugAuth'

export async function GET(request: NextRequest) {
  const denied = await requireMaster(request)
  if (denied) return denied

  const tenantId = request.nextUrl.searchParams.get('tenantId')
  const leadUuid = request.nextUrl.searchParams.get('leadUuid')
  if (!tenantId) return NextResponse.json({ error: 'tenantId obrigatório' }, { status: 400 })

  const { rows } = await pool.query(
    `SELECT caa.id, caa.agent_key, caa.type, caa.title, caa.description, caa.suggested_message,
            caa.confidence, caa.status, caa.approval_pin, caa.approval_pin_exp, caa.payload,
            caa.created_at, caa.executed_at, ls.nome AS lead_nome
       FROM public.crm_agent_actions caa
       JOIN public.leads_staging ls ON ls.lead_uuid = caa.lead_uuid
      WHERE caa.tenant_id = $1::uuid ${leadUuid ? 'AND caa.lead_uuid = $2::uuid' : ''}
      ORDER BY caa.created_at DESC
      LIMIT 100`,
    leadUuid ? [tenantId, leadUuid] : [tenantId],
  )

  return NextResponse.json({ actions: rows })
}
