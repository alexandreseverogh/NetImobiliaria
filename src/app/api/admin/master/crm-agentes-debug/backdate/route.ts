import { NextRequest, NextResponse } from 'next/server'
import { requireMaster } from '@/lib/crm/agents/debugAuth'
import { backdateForAgent } from '@/lib/crm/agents/debugTools'

export async function POST(request: NextRequest) {
  const denied = await requireMaster(request)
  if (denied) return denied

  const { agentKey, leadUuid, amount, unit } = await request.json()
  if (!leadUuid || !['pendencia_atendimento', 'reactivation', 'stage_stagnation'].includes(agentKey)) {
    return NextResponse.json({ error: 'agentKey/leadUuid inválidos' }, { status: 400 })
  }
  const n = Number(amount)
  if (!Number.isFinite(n) || n <= 0 || !['minutes', 'hours', 'days'].includes(unit)) {
    return NextResponse.json({ error: 'amount/unit inválidos' }, { status: 400 })
  }

  await backdateForAgent(agentKey, leadUuid, n, unit)
  return NextResponse.json({ ok: true })
}
