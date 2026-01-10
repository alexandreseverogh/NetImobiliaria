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

    const receivedQ = await pool.query(
      `
      SELECT COUNT(*)::int AS cnt
      FROM public.imovel_prospect_atribuicoes
      WHERE corretor_fk = $1::uuid
      `,
      [userId]
    )

    const lostQ = await pool.query(
      `
      SELECT COUNT(*)::int AS cnt
      FROM public.imovel_prospect_atribuicoes
      WHERE corretor_fk = $1::uuid
        AND status = 'expirado'
      `,
      [userId]
    )

    // KPI: Aceite dentro do SLA (percentual)
    // Denominador: leads "avaliados" (já tiveram resultado: aceito ou expirado)
    const slaQ = await pool.query(
      `
      SELECT
        COUNT(*) FILTER (
          WHERE status = 'aceito'
            AND data_aceite IS NOT NULL
            AND expira_em IS NOT NULL
            AND data_aceite <= expira_em
        )::int AS aceitos_no_sla,
        COUNT(*) FILTER (WHERE status IN ('aceito','expirado'))::int AS avaliados_sla
      FROM public.imovel_prospect_atribuicoes
      WHERE corretor_fk = $1::uuid
      `,
      [userId]
    )

    const aceitosNoSla = Number(slaQ.rows?.[0]?.aceitos_no_sla ?? 0) || 0
    const avaliadosSla = Number(slaQ.rows?.[0]?.avaliados_sla ?? 0) || 0
    // REGRA: nunca retornar undefined/null/NaN para KPI. Se não houver avaliados, o KPI é 0.00%.
    const rawPercent = avaliadosSla > 0 ? (aceitosNoSla / avaliadosSla) * 100 : 0
    const kpiPercent = Number.isFinite(rawPercent) ? Math.round(rawPercent * 100) / 100 : 0

    return NextResponse.json({
      success: true,
      data: {
        leads_recebidos_total: receivedQ.rows?.[0]?.cnt ?? 0,
        leads_perdidos_sla_total: lostQ.rows?.[0]?.cnt ?? 0,
        aceite_no_sla_percent: kpiPercent,
        aceite_no_sla_aceitos: aceitosNoSla,
        aceite_no_sla_avaliados: avaliadosSla
      }
    })
  } catch (e) {
    console.error('Erro ao buscar lead-stats do corretor:', e)
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}


