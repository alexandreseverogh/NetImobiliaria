import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import pool from '@/lib/database/connection'

export async function POST(request: NextRequest) {
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
    const decoded = jwt.verify(token, jwtSecret) as any
    
    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { error: 'Token inválido ou expirado' },
        { status: 401 }
      )
    }

    // Verificar se existe sessão ativa
    const checkQuery = `
      SELECT id, expires_at
      FROM user_sessions
      WHERE user_id = $1::uuid 
        AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1
    `

    const checkResult = await pool.query(checkQuery, [decoded.userId])

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Nenhuma sessão ativa encontrada' },
        { status: 404 }
      )
    }

    // Renovar sessão por mais 24 horas
    const newExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 horas
    
    const updateQuery = `
      UPDATE user_sessions
      SET expires_at = $1, last_used_at = NOW()
      WHERE id = $2
      RETURNING expires_at
    `

    const updateResult = await pool.query(updateQuery, [newExpiresAt, checkResult.rows[0].id])

    // Calcular novo tempo restante
    const expiresAt = new Date(updateResult.rows[0].expires_at)
    const now = new Date()
    const timeDiff = expiresAt.getTime() - now.getTime()
    const minutesRemaining = Math.floor(timeDiff / (1000 * 60))

    return NextResponse.json({
      success: true,
      message: 'Sessão renovada com sucesso',
      session: {
        expiresAt: expiresAt.toISOString(),
        timeRemaining: minutesRemaining
      }
    })

  } catch (error) {
    console.error('Erro ao renovar sessão:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}




