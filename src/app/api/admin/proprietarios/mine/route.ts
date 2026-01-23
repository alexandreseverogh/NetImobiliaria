import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, getTokenFromRequest } from '@/lib/auth/jwt'
import jwt from 'jsonwebtoken'
import { AUTH_CONFIG } from '@/lib/config/auth'
import { findProprietariosPaginated } from '@/lib/database/proprietarios'

export async function GET(request: NextRequest) {
  try {
    // Autenticação explícita (não dependemos de route_permissions_config para não vazar dados)
    const token = getTokenFromRequest(request)

    if (!token) {
      return NextResponse.json({ success: false, error: 'Autenticação necessária' }, { status: 401 })
    }

    let decoded: any = null
    try {
      // Usar jsonwebtoken diretamente para garantir compatibilidade com o login
      decoded = jwt.verify(token, AUTH_CONFIG.JWT.SECRET)
    } catch (err) {
      console.error('❌ Erro na verificação do token (jwt.verify):', err)
      // Fallback para a implementação customizada (apenas por segurança)
      decoded = await verifyToken(token)
    }

    const userId = decoded?.userId || null
    const roleName = String(decoded?.role_name || decoded?.cargo || '').toLowerCase()

    console.log('🔍 /mine Debug:', { userId, roleName, hasCorretor: roleName.includes('corretor') })

    if (!roleName.includes('corretor')) {
      return NextResponse.json({
        success: false,
        error: 'Acesso negado',
        debug: {
          userId,
          roleName,
          decoded,
          message: 'Role "corretor" não encontrada no token'
        }
      }, { status: 403 })
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

