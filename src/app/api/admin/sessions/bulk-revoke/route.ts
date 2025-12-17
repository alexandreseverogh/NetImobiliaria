import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { unifiedPermissionMiddleware } from '@/lib/middleware/UnifiedPermissionMiddleware'

interface BulkRevokeRequest {
  type: 'user' | 'all' | 'selected'
  userId?: string
  sessionIds?: string[]
}

// POST - Revogação em massa de sessões
export async function POST(request: NextRequest) {
  try {
    // Verificar permissão
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) {
      return permissionCheck
    }

    const body: BulkRevokeRequest = await request.json()
    const { type, userId, sessionIds } = body

    // Obter informações do administrador
    const adminInfo = await getAdminInfo(request)

    let deletedCount = 0
    let deletedSessions: any[] = []

    if (type === 'user' && userId) {
      // Revogar todas as sessões de um usuário específico
      const sessionsQuery = `
        SELECT us.id, us.user_id, u.username, u.nome, us.ip_address, us.created_at
        FROM user_sessions us
        JOIN users u ON us.user_id = u.id
        WHERE us.user_id = $1
      `
      const sessionsResult = await pool.query(sessionsQuery, [userId])
      deletedSessions = sessionsResult.rows

      const deleteQuery = 'DELETE FROM user_sessions WHERE user_id = $1::uuid'
      const deleteResult = await pool.query(deleteQuery, [userId])
      deletedCount = deleteResult.rowCount || 0

    } else if (type === 'selected' && sessionIds && sessionIds.length > 0) {
      // Revogar sessões selecionadas
      const sessionsQuery = `
        SELECT us.id, us.user_id, u.username, u.nome, us.ip_address, us.created_at
        FROM user_sessions us
        JOIN users u ON us.user_id = u.id
        WHERE us.id = ANY($1)
      `
      const sessionsResult = await pool.query(sessionsQuery, [sessionIds])
      deletedSessions = sessionsResult.rows

      const deleteQuery = 'DELETE FROM user_sessions WHERE id = ANY($1)'
      const deleteResult = await pool.query(deleteQuery, [sessionIds])
      deletedCount = deleteResult.rowCount || 0

    } else if (type === 'all') {
      // Revogar todas as sessões ativas
      const sessionsQuery = `
        SELECT us.id, us.user_id, u.username, u.nome, us.ip_address, us.created_at
        FROM user_sessions us
        JOIN users u ON us.user_id = u.id
        WHERE us.expires_at > NOW()
      `
      const sessionsResult = await pool.query(sessionsQuery)
      deletedSessions = sessionsResult.rows

      const deleteQuery = 'DELETE FROM user_sessions WHERE expires_at > NOW()'
      const deleteResult = await pool.query(deleteQuery)
      deletedCount = deleteResult.rowCount || 0

    } else {
      return NextResponse.json(
        { error: 'Parâmetros inválidos para revogação em massa' },
        { status: 400 }
      )
    }

    // Registrar auditoria para cada sessão revogada
    for (const session of deletedSessions) {
      await logSessionRevocation({
        sessionId: session.id,
        userId: session.user_id,
        username: session.username,
        nome: session.nome,
        ipAddress: session.ip_address,
        created_at: session.created_at,
        revokedBy: adminInfo.userId,
        revokedByUsername: adminInfo.username,
        revokedByIp: adminInfo.ipAddress
      })
    }

    return NextResponse.json({
      success: true,
      message: `${deletedCount} sessão(ões) revogada(s) com sucesso`,
      deletedCount,
      type,
      revokedBy: adminInfo.username
    })

  } catch (error) {
    console.error('Erro na revogação em massa:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// Função para obter informações do administrador
async function getAdminInfo(request: NextRequest) {
  try {
    // Extrair token do header Authorization ou cookie
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || 
                  request.cookies.get('accessToken')?.value ||
                  request.cookies.get('auth-token')?.value

    if (!token) {
      return {
        userId: 'unknown',
        username: 'unknown',
        ipAddress: 'unknown'
      }
    }

    // Decodificar JWT para obter informações do usuário
    const jwt = require('jsonwebtoken')
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret')
    
    // Obter IP do administrador
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
                     request.headers.get('x-real-ip') ||
                     request.ip ||
                     'unknown'

    return {
      userId: decoded.userId,
      username: decoded.username,
      ipAddress
    }
  } catch (error) {
    console.error('Erro ao obter informações do administrador:', error)
    return {
      userId: 'unknown',
      username: 'unknown',
      ipAddress: 'unknown'
    }
  }
}

// Função para registrar auditoria de revogação
async function logSessionRevocation(data: {
  sessionId: string
  userId: string
  username: string
  nome: string
  ipAddress: string
  created_at: string
  revokedBy: string
  revokedByUsername: string
  revokedByIp: string
}) {
  try {
    const auditQuery = `
      INSERT INTO audit_logs (
        user_id, action, resource, resource_id, 
        details, ip_address, user_agent, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    `
    
    const details = JSON.stringify({
      session_id: data.sessionId,
      revoked_user: {
        id: data.userId,
        username: data.username,
        nome: data.nome
      },
      session_info: {
        ip_address: data.ipAddress,
        created_at: data.created_at
      },
      revoked_by: {
        id: data.revokedBy,
        username: data.revokedByUsername,
        ip_address: data.revokedByIp
      }
    })

    await pool.query(auditQuery, [
      data.revokedBy,
      'session_revoked',
      'user_sessions',
      data.sessionId,
      details,
      data.revokedByIp,
      'Admin Panel'
    ])

    console.log(`✅ Auditoria registrada: Sessão ${data.sessionId} revogada por ${data.revokedByUsername}`)
  } catch (error) {
    console.error('❌ Erro ao registrar auditoria de revogação:', error)
  }
}




