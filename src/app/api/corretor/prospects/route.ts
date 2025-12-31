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

export async function GET(request: NextRequest) {
  try {
    const userId = getLoggedUserId(request)
    if (!userId) return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const status = String(searchParams.get('status') || 'atribuido').trim()

    const pool = (await import('@/lib/database/connection')).default
    const q = `
      SELECT
        a.prospect_id,
        a.status,
        a.created_at as atribuido_em,
        a.expira_em,
        a.aceito_em,
        i.id as imovel_id,
        i.codigo,
        i.titulo,
        i.preco,
        i.cidade_fk,
        i.estado_fk,
        c.nome as cliente_nome,
        c.email as cliente_email,
        c.telefone as cliente_telefone,
        ip.preferencia_contato,
        ip.mensagem
      FROM public.imovel_prospect_atribuicoes a
      INNER JOIN public.imovel_prospects ip ON ip.id = a.prospect_id
      INNER JOIN public.imoveis i ON ip.id_imovel = i.id
      INNER JOIN public.clientes c ON ip.id_cliente = c.uuid
      WHERE a.corretor_fk = $1::uuid
        AND ($2::text IS NULL OR a.status = $2)
      ORDER BY a.created_at DESC
      LIMIT 200
    `
    const res = await pool.query(q, [userId, status || null])

    return NextResponse.json({ success: true, leads: res.rows })
  } catch (e) {
    console.error('Erro ao listar prospects do corretor:', e)
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}


