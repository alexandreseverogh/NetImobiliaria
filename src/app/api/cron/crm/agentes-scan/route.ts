import { NextRequest, NextResponse } from 'next/server'
import { runCrmAgentScans } from '@/lib/crm/agents/runner'
import { runRescueRetries } from '@/lib/crm/pendencia/rescueQueue'

export const dynamic = 'force-dynamic'

/**
 * POST /api/cron/crm/agentes-scan
 * Varre candidatos de TODOS os agentes de aceleração do CRM com trigger SCHEDULED_SCAN
 * (docs/PLANO_AGENTES_ACELERACAO_CRM.md — pendencia_atendimento, stage_stagnation,
 * reactivation; next_best_action é ON_STAGE_CHANGE, não passa por aqui) e dispara alerta
 * quando algum agente decide que deve. Protegido por CRON_SECRET, mesmo padrão dos
 * demais crons do projeto (ver src/app/api/cron/mensageria/sla-check/route.ts).
 *
 * Roda também a retentativa de resgate (G3): lead pendente SEM responsável volta a ser
 * oferecido à distribuição a cada rodada — antes disso, lead que o motor não conseguiu
 * atribuir na captação ficava órfão pra sempre (Buraco A). É silenciosa de propósito: quem
 * alerta sobre a fila é o agente (degrau 4), uma vez por episódio.
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  // Resgate ANTES da varredura: um lead que acabou de ganhar responsável nesta rodada já é
  // avaliado com o dono correto, em vez de gerar um alerta "sem responsável" já obsoleto.
  const resgate = await runRescueRetries().catch((err) => {
    console.error('[cron/agentes-scan] retentativa de resgate falhou:', err)
    return { examinados: 0, atribuidos: 0 }
  })

  const result = await runCrmAgentScans()
  return NextResponse.json({ success: true, ...result, resgate })
}
