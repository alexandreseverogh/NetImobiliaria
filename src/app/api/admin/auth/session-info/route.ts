import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { verifyTokenNode } from '@/lib/auth/jwt-node'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('accessToken')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json(
        { error: 'Token de autenticação não fornecido' },
        { status: 401 }
      )
    }

    // Verificar token (compatível com nosso padrão HS256/base64url)
    const decoded: any = verifyTokenNode(token)
    
    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { error: 'Token inválido: userId não encontrado' },
        { status: 401 }
      )
    }

    // Fallback: expiração pelo próprio JWT (caso user_sessions esteja indisponível)
    const jwtExpiresAt =
      decoded?.exp && typeof decoded.exp === 'number' ? new Date(decoded.exp * 1000) : null

    // Buscar informações da sessão ativa
    const query = `
      SELECT 
        us.id as session_id,
        us.user_id,
        us.expires_at,
        us.created_at,
        us.ip_address,
        u.username,
        u.nome
      FROM user_sessions us
      JOIN users u ON us.user_id = u.id
      WHERE us.user_id = $1 
        AND us.expires_at > NOW()
      ORDER BY us.created_at DESC
      LIMIT 1
    `

    let result
    try {
      result = await pool.query(query, [decoded.userId])
    } catch (dbError: any) {
      console.error('Erro ao buscar sessão no banco:', dbError?.message || dbError)

      // Se o banco falhar, ainda conseguimos informar expiração aproximada pelo JWT
      if (jwtExpiresAt) {
        const now = new Date()
        const minutesRemaining = Math.floor((jwtExpiresAt.getTime() - now.getTime()) / (1000 * 60))
        return NextResponse.json({
          success: true,
          session: {
            id: null,
            userId: decoded.userId,
            username: decoded.username || null,
            nome: null,
            expiresAt: jwtExpiresAt.toISOString(),
            createdAt: null,
            timeRemaining: minutesRemaining,
            source: 'jwt'
          }
        })
      }

      return NextResponse.json({ error: 'Erro ao buscar informações da sessão' }, { status: 500 })
    }

    if (result.rows.length === 0) {
      // Se não há sessão ativa no banco, usar expiração do JWT (se existir)
      if (jwtExpiresAt) {
        const now = new Date()
        const minutesRemaining = Math.floor((jwtExpiresAt.getTime() - now.getTime()) / (1000 * 60))
        return NextResponse.json({
          success: true,
          session: {
            id: null,
            userId: decoded.userId,
            username: decoded.username || null,
            nome: null,
            expiresAt: jwtExpiresAt.toISOString(),
            createdAt: null,
            timeRemaining: minutesRemaining,
            source: 'jwt'
          }
        })
      }

      return NextResponse.json(
        { success: false, message: 'Nenhuma sessão ativa encontrada' },
        { status: 200 }
      )
    }

    const session = result.rows[0]
    
    // Calcular tempo restante
    const expiresAt = new Date(session.expires_at)
    const now = new Date()
    const timeDiff = expiresAt.getTime() - now.getTime()
    const minutesRemaining = Math.floor(timeDiff / (1000 * 60))

    return NextResponse.json({
      success: true,
      session: {
        id: session.session_id,
        userId: session.user_id,
        username: session.username,
        nome: session.nome,
        expiresAt: session.expires_at,
        createdAt: session.created_at,
        timeRemaining: minutesRemaining,
        source: 'db'
      }
    })

  } catch (error) {
    console.error('Erro ao buscar informações da sessão:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
