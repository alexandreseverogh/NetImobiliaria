import { NextRequest, NextResponse } from 'next/server'
import { requireMaster } from '@/lib/crm/agents/debugAuth'
import { setWhatsAppRole, getWhatsAppRoleStatus, type WhatsAppRole } from '@/lib/crm/agents/debugTools'

export async function GET(request: NextRequest) {
  const denied = await requireMaster(request)
  if (denied) return denied
  const tenantId = request.nextUrl.searchParams.get('tenantId')
  if (!tenantId) return NextResponse.json({ error: 'tenantId obrigatório' }, { status: 400 })
  return NextResponse.json(await getWhatsAppRoleStatus(tenantId))
}

export async function POST(request: NextRequest) {
  const denied = await requireMaster(request)
  if (denied) return denied

  const { tenantId, role, leadUuid } = await request.json() as {
    tenantId?: string; role?: WhatsAppRole; leadUuid?: string | null
  }
  if (!tenantId || (role !== 'admin-real' && role !== 'lead-real')) {
    return NextResponse.json({ error: 'tenantId e role (admin-real|lead-real) são obrigatórios' }, { status: 400 })
  }

  await setWhatsAppRole(tenantId, role, leadUuid ?? null)
  return NextResponse.json(await getWhatsAppRoleStatus(tenantId))
}
