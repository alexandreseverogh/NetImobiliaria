import { NextRequest, NextResponse } from 'next/server'
import { requireMaster } from '@/lib/crm/agents/debugAuth'
import { toggleScanSafety, getScanSafetyStatus } from '@/lib/crm/agents/debugTools'

export async function POST(request: NextRequest) {
  const denied = await requireMaster(request)
  if (denied) return denied

  const { tenantId, paused } = await request.json()
  if (!tenantId || typeof paused !== 'boolean') {
    return NextResponse.json({ error: 'tenantId e paused (boolean) são obrigatórios' }, { status: 400 })
  }

  await toggleScanSafety(tenantId, paused)
  const status = await getScanSafetyStatus(tenantId)
  return NextResponse.json({ status })
}
