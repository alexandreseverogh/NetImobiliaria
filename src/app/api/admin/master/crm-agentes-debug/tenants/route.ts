import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { requireMaster } from '@/lib/crm/agents/debugAuth'
import { getScanSafetyStatus, getWhatsAppRoleStatus } from '@/lib/crm/agents/debugTools'

/** Os 2 tenants desta frente de teste — hardcoded de propósito (é um painel temporário, não
 *  um seletor genérico de tenant da plataforma). */
const TEST_TENANT_IDS = [
  'c3fc15b7-7033-4e13-8e24-951c2e087dfb', // CRM SOZINHO — Venda de Carros
  'bf299a5c-6e84-43f7-8735-da44730c6637', // CRM SOZINHO — IMOBILIÁRIO
]

export async function GET(request: NextRequest) {
  const denied = await requireMaster(request)
  if (denied) return denied

  const { rows } = await pool.query(
    `SELECT t.id, t.name, s.name AS segment_name, s.id AS segment_id
       FROM public.tenants t
       JOIN public.system_segments s ON s.id = t.segment_id
      WHERE t.id = ANY($1::uuid[])
      ORDER BY t.name`,
    [TEST_TENANT_IDS],
  )

  const tenants = await Promise.all(
    rows.map(async (t) => ({
      id: t.id,
      name: t.name,
      segmentId: t.segment_id,
      segmentName: t.segment_name,
      scanSafety: await getScanSafetyStatus(t.id),
      whatsappRole: await getWhatsAppRoleStatus(t.id),
    })),
  )

  return NextResponse.json({ tenants })
}
