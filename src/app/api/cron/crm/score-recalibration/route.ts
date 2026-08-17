import { NextRequest, NextResponse } from 'next/server'
import { runScoreRecalibration } from '@/lib/crm/agents/scoreRecalibrationService'

export const dynamic = 'force-dynamic'

/**
 * POST /api/cron/crm/score-recalibration
 * F5 (docs/PLANO_AGENTES_ACELERACAO_CRM.md §3.2) — job DIÁRIO, deliberadamente separado do
 * cron de 5 em 5 minutos (/api/cron/crm/agentes-scan): score_recalibration não é lead-scoped
 * como os outros 4 agentes, então nunca passa por runCrmAgentScans(). Protegido por
 * CRON_SECRET, mesmo padrão dos demais crons do projeto.
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const result = await runScoreRecalibration()
  return NextResponse.json({ success: true, ...result })
}
