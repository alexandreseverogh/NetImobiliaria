import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth/jwt'
import { findProprietariosPaginated } from '@/lib/database/proprietarios'

export async function GET(request: NextRequest) {
  try {
    // Autenticação explícita (não dependemos de route_permissions_config para não vazar dados)
    const authHeader = request.headers.get('authorization') || ''
    const token =
      authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : request.cookies.get('accessToken')?.value || null

    if (!token) {
      return NextResponse.json({ success: false, error: 'Autenticação necessária' }, { status: 401 })
    }

    const decoded: any = await verifyToken(token)
    const userId = decoded?.userId || null
    const roleName = String(decoded?.role_name || decoded?.cargo || '').toLowerCase()

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Token inválido ou expirado' }, { status: 401 })
    }

    if (!roleName.includes('corretor')) {
      return NextResponse.json({ success: false, error: 'Acesso negado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '1000')

    const nome = searchParams.get('nome') || undefined
    const cpf = searchParams.get('cpf') || undefined
    const estado = searchParams.get('estado') || undefined
    const cidade = searchParams.get('cidade') || undefined
    const bairro = searchParams.get('bairro') || undefined

    const result = await findProprietariosPaginated(page, limit, {
      nome,
      cpf,
      estado,
      cidade,
      bairro,
      corretor_fk: userId
    })

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error('❌ Erro ao buscar proprietários do corretor:', error)
    return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 })
  }
}


