import { NextRequest, NextResponse } from 'next/server'
import { verifyTokenNode } from '@/lib/auth/jwt-node'

export const runtime = 'nodejs'

function getCurrentUser(request: NextRequest): { userId: string; cargo: string } | null {
  try {
    const token =
      request.cookies.get('accessToken')?.value || request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return null
    const decoded = verifyTokenNode(token)
    if (!decoded?.userId) return null
    const cargo = String((decoded as any)?.cargo || (decoded as any)?.role_name || '')
    return { userId: decoded.userId, cargo }
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = getCurrentUser(request)
    if (!user?.userId) {
      return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 })
    }

    const cargo = String(user.cargo || '').toLowerCase()
    if (!cargo.includes('corretor')) {
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
          i.estado_fk,
          i.cidade_fk,
          i.bairro
        FROM public.imovel_corretor ic
        JOIN public.imoveis i ON i.id = ic.imovel_fk
        WHERE ic.corretor_fk = $1::uuid
        ORDER BY ic.created_at DESC
      `,
      [user.userId]
    )

    return NextResponse.json({ success: true, data: result.rows })
  } catch (error: any) {
    console.error('❌ Erro ao listar imoveis_corretor:', error)
    return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 })
  }
}


