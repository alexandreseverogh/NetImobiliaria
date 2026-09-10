import { NextRequest, NextResponse } from 'next/server'
import { requireMaster } from '@/lib/crm/agents/debugAuth'
import { rejectReactivation } from '@/lib/crm/agents/reactivationExecutor'

export async function POST(request: NextRequest) {
  const denied = await requireMaster(request)
  if (denied) return denied

  const { actionId } = await request.json()
  if (!actionId) return NextResponse.json({ error: 'actionId obrigatório' }, { status: 400 })

  try {
    await rejectReactivation(actionId)
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Falha ao rejeitar' }, { status: 400 })
  }
}
