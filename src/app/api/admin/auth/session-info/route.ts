import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import pool from '@/lib/database/connection'

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

    // Verificar token
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret'
    let decoded: any
    
    try {
      decoded = jwt.verify(token, jwtSecret) as any
    } catch (jwtError: any) {
      console.error('Erro ao verificar token JWT:', jwtError.message)
      return NextResponse.json(
        { error: 'Token inválido ou expirado', details: jwtError.message },
        { status: 401 }
      )
    }
    
    if (!decoded || !decoded.userId) {
      console.error('Token decodificado sem userId:', decoded)
      return NextResponse.json(
        { error: 'Token inválido: userId não encontrado' },
        { status: 401 }
      )
    }

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
      console.error('Erro ao buscar sessão no banco:', dbError.message)
      return NextResponse.json(
        { error: 'Erro ao buscar informações da sessão', details: dbError.message },
        { status: 500 }
      )
    }

    if (result.rows.length === 0) {
      // Não é erro crítico, apenas informa que não há sessão ativa
      return NextResponse.json({
        success: false,
        message: 'Nenhuma sessão ativa encontrada'
      }, { status: 200 }) // Retorna 200, não 500
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
        timeRemaining: minutesRemaining
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
