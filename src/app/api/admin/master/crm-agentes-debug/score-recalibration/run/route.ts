import { NextRequest, NextResponse } from 'next/server'
import { requireMaster } from '@/lib/crm/agents/debugAuth'
import { recalibrateScope } from '@/lib/crm/agents/scoreRecalibrationService'

/** SEMPRE scope='tenant' — nunca 'segmento' (que afetaria os tenants reais compartilhados
 *  do segmento). Chama a função escopada direto, nunca runScoreRecalibration() (global). */
export async function POST(request: NextRequest) {
  const denied = await requireMaster(request)
  if (denied) return denied

  const { tenantId, janelaDias, divergenciaMinimaPct, minLeadsAmostra } = await request.json() as {
    tenantId?: string; janelaDias?: number; divergenciaMinimaPct?: number; minLeadsAmostra?: number
  }
  if (!tenantId) return NextResponse.json({ error: 'tenantId obrigatório' }, { status: 400 })

  const result = await recalibrateScope(
    'tenant',
    tenantId,
    Number(janelaDias) || 90,
    Number(divergenciaMinimaPct) || 30,
    Number(minLeadsAmostra) || 10,
  )
  return NextResponse.json(result)
}
