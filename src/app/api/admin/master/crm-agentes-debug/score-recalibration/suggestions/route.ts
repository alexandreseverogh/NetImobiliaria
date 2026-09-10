import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { requireMaster } from '@/lib/crm/agents/debugAuth'

export async function GET(request: NextRequest) {
  const denied = await requireMaster(request)
  if (denied) return denied

  const tenantId = request.nextUrl.searchParams.get('tenantId')
  if (!tenantId) return NextResponse.json({ error: 'tenantId obrigatório' }, { status: 400 })

  const { rows } = await pool.query(
    `SELECT id, tag_resultante, score_atual, score_sugerido, leads_gerados, leads_convertidos,
            taxa_conversao_observada, status, created_at, decided_at
       FROM public.crm_score_recalibration_suggestions
      WHERE scope = 'tenant' AND tenant_id = $1::uuid
      ORDER BY created_at DESC`,
    [tenantId],
  )
  return NextResponse.json({ suggestions: rows })
}
