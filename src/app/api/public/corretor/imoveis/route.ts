import { NextRequest, NextResponse } from 'next/server'
import { verifyTokenNode } from '@/lib/auth/jwt-node'

export const runtime = 'nodejs'

function getToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization') || ''
  if (authHeader.startsWith('Bearer ')) return authHeader.slice(7)
  const cookie = request.cookies.get('accessToken')?.value
  return cookie || null
}

export async function GET(request: NextRequest) {
  try {
    const token = getToken(request)
    if (!token) {
      return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 })
    }

    const decoded: any = verifyTokenNode(token)
    const userId = decoded?.userId || null
    const roleName = String(decoded?.role_name || decoded?.cargo || '').toLowerCase()

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Token inválido ou expirado' }, { status: 401 })
    }

    if (!roleName.includes('corretor')) {
      return NextResponse.json({ success: false, error: 'Acesso negado' }, { status: 403 })
    }

    const pool = (await import('@/lib/database/connection')).default
    const result = await pool.query(
      `
        SELECT
          ic.id,
          ic.imovel_fk,
          ic.corretor_fk,
          ic.created_at,
          ic.created_by,
          i.titulo,
          i.preco,
          i.quartos,
          i.suites,
          i.banheiros,
          i.varanda,
          i.vagas_garagem,
          i.preco_condominio,
          i.preco_iptu,
          i.taxa_extra,
          i.area_total,
          i.area_construida,
          i.andar,
          i.total_andares,
          i.endereco,
          i.numero,
          i.cep,
          i.estado_fk,
          i.cidade_fk,
          i.bairro
        FROM public.imovel_corretor ic
        JOIN public.imoveis i ON i.id = ic.imovel_fk
        WHERE ic.corretor_fk = $1::uuid
        ORDER BY ic.created_at DESC
      `,
      [userId]
    )

    return NextResponse.json({ success: true, data: result.rows })
  } catch (error: any) {
    console.error('❌ Erro ao listar imóveis do corretor (public):', error)
    return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 })
  }
}


