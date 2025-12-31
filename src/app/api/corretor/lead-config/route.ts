import { NextRequest, NextResponse } from 'next/server'
import { verifyTokenNode } from '@/lib/auth/jwt-node'

export const runtime = 'nodejs'

function getToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization') || ''
  if (authHeader.startsWith('Bearer ')) return authHeader.slice(7)
  const cookie = request.cookies.get('accessToken')?.value
  return cookie || null
}

function requireUserId(request: NextRequest): string | null {
  const token = getToken(request)
  if (!token) return null
  try {
    const decoded: any = verifyTokenNode(token)
    return decoded?.userId || null
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = requireUserId(request)
    if (!userId) return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })

    const pool = (await import('@/lib/database/connection')).default
    const r = await pool.query(
      `
      SELECT
        sla_minutos_aceite_lead,
        proximos_corretores_recebem_leads
      FROM public.parametros
      LIMIT 1
      `
    )

    const row = r.rows?.[0] || {}
    return NextResponse.json({
      success: true,
      data: {
        sla_minutos_aceite_lead: row.sla_minutos_aceite_lead ?? 5,
        proximos_corretores_recebem_leads: row.proximos_corretores_recebem_leads ?? 3
      }
    })
  } catch (e) {
    console.error('Erro ao buscar lead-config do corretor:', e)
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}


