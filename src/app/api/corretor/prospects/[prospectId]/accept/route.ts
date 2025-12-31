import { NextRequest, NextResponse } from 'next/server'
import { verifyTokenNode } from '@/lib/auth/jwt-node'

export const runtime = 'nodejs'

function getToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization') || ''
  if (authHeader.startsWith('Bearer ')) return authHeader.slice(7)
  const cookie = request.cookies.get('accessToken')?.value
  return cookie || null
}

function getLoggedUserId(request: NextRequest): string | null {
  const token = getToken(request)
  if (!token) return null
  try {
    const decoded: any = verifyTokenNode(token)
    return decoded?.userId || null
  } catch {
    return null
  }
}

export async function POST(request: NextRequest, { params }: { params: { prospectId: string } }) {
  try {
    const userId = getLoggedUserId(request)
    if (!userId) return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })

    const prospectId = Number(params.prospectId)
    if (!prospectId) return NextResponse.json({ success: false, error: 'Prospect inválido' }, { status: 400 })

    const pool = (await import('@/lib/database/connection')).default
    const q = `
      UPDATE public.imovel_prospect_atribuicoes
      SET status = 'aceito',
          aceito_em = NOW()
      WHERE prospect_id = $1
        AND corretor_fk = $2::uuid
        AND status = 'atribuido'
        AND (expira_em IS NULL OR expira_em > NOW())
      RETURNING id, prospect_id, status, aceito_em
    `
    const res = await pool.query(q, [prospectId, userId])
    if (res.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Lead não encontrado, já aceito ou SLA expirado' },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true, data: res.rows[0] })
  } catch (e) {
    console.error('Erro ao aceitar lead:', e)
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}


