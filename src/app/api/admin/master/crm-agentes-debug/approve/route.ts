import { NextRequest, NextResponse } from 'next/server'
import { requireMaster } from '@/lib/crm/agents/debugAuth'
import { approveReactivation } from '@/lib/crm/agents/reactivationExecutor'

/** Equivalente Master-autenticado do fluxo PIN+WhatsApp — mesma função real
 *  (approveReactivation), só sem exigir o formulário de PIN (a checagem is_system_role já
 *  prova quem é). Só se aplica a ações do agente `reactivation` (getReactivationAction já
 *  filtra agent_key='reactivation' internamente). */
export async function POST(request: NextRequest) {
  const denied = await requireMaster(request)
  if (denied) return denied

  const { actionId, editedMessage } = await request.json()
  if (!actionId) return NextResponse.json({ error: 'actionId obrigatório' }, { status: 400 })

  try {
    const result = await approveReactivation(actionId, editedMessage ?? null)
    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Falha ao aprovar' }, { status: 400 })
  }
}
