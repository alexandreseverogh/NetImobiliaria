import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, getTokenFromRequest } from '@/lib/auth/jwt'

export const runtime = 'nodejs'

async function getLoggedUserId(request: NextRequest): Promise<string | null> {
  const token = getTokenFromRequest(request)
  if (!token) return null
  try {
    const decoded: any = await verifyToken(token)
    return decoded?.userId || null
  } catch {
    return null
  }
}

export async function POST(request: NextRequest, { params }: { params: { prospectId: string } }) {
  try {
    const userId = await getLoggedUserId(request)
    if (!userId) return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })

    const prospectId = Number(params.prospectId)
    if (!prospectId) return NextResponse.json({ success: false, error: 'Prospect inválido' }, { status: 400 })

    const pool = (await import('@/lib/database/connection')).default
    const q = `
      UPDATE public.imovel_prospect_atribuicoes
      SET status = 'aceito',
          data_aceite = NOW()
      WHERE prospect_id = $1
        AND corretor_fk = $2::uuid
        AND status = 'atribuido'
        AND (expira_em IS NULL OR expira_em > NOW())
      RETURNING id, prospect_id, status, data_aceite as aceito_em, created_at
    `
    const res = await pool.query(q, [prospectId, userId])
    if (res.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Lead não encontrado, já aceito ou SLA expirado' },
        { status: 400 }
      )
    }

    // Gamification: Registrar Aceite
    try {
      const { GamificationService } = await import('@/lib/gamification/gamificationService')
      const row = res.rows[0]
      const ca = new Date(row.created_at)
      const aa = new Date(row.aceito_em)
      const diffSeconds = Math.floor((aa.getTime() - ca.getTime()) / 1000)

      // Executar em background (sem await) para não travar resposta
      GamificationService.recordLeadAcceptance(userId, diffSeconds).catch(err => {
        console.error('Erro ao registrar XP de gamificação:', err)
      })
    } catch (gError) {
      console.error('Erro ao carregar serviço de gamificação:', gError)
    }

    // ATUALIZAÇÃO DO IMÓVEL (Regra de Negócio: Se imóvel sem corretor, quem aceita assume)
    try {
      await pool.query(`
        UPDATE imoveis i
        SET corretor_fk = $1::uuid
        FROM imovel_prospects ip
        WHERE ip.id = $2
          AND ip.id_imovel = i.id
          AND i.corretor_fk IS NULL
      `, [userId, prospectId]);
    } catch (updateErr) {
      console.error('Erro ao vincular corretor ao imóvel após aceite:', updateErr);
    }

    return NextResponse.json({ success: true, data: res.rows[0] })
  } catch (e) {
    console.error('Erro ao aceitar lead:', e)
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}


