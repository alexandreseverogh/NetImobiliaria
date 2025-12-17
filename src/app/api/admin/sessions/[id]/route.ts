import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { unifiedPermissionMiddleware } from '@/lib/middleware/UnifiedPermissionMiddleware'

// DELETE - Revogar sessão específica
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar permissão
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) {
      return permissionCheck
    }

    const sessionId = params.id

    if (!sessionId) {
      return NextResponse.json(
        { error: 'ID da sessão é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se a sessão existe
    const checkQuery = 'SELECT id FROM user_sessions WHERE id = $1'
    const checkResult = await pool.query(checkQuery, [sessionId])

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Sessão não encontrada' },
        { status: 404 }
      )
    }

    // Obter informações da sessão antes de deletar (para auditoria)
    const sessionInfoQuery = `
      SELECT us.user_id, u.username, u.nome, us.ip_address, us.created_at
      FROM user_sessions us
      JOIN users u ON us.user_id = u.id
      WHERE us.id = $1
    `
    const sessionInfo = await pool.query(sessionInfoQuery, [sessionId])
    const session = sessionInfo.rows[0]

    // Obter informações do administrador que está revogando
    const adminInfo = await getAdminInfo(request)

    // Remover a sessão
    const deleteQuery = 'DELETE FROM user_sessions WHERE id = $1'
    await pool.query(deleteQuery, [sessionId])

    // Registrar auditoria
    await logSessionRevocation({
      sessionId,
      userId: session.user_id,
      username: session.username,
      nome: session.nome,
      ipAddress: session.ip_address,
      created_at: session.created_at,
      revokedBy: adminInfo.userId,
      revokedByUsername: adminInfo.username,
      revokedByIp: adminInfo.ipAddress
    })

    return NextResponse.json({
      success: true,
      message: 'Sessão revogada com sucesso',
      revokedUser: {
        username: session.username,
        nome: session.nome
      }
    })

  } catch (error) {
    console.error('Erro ao revogar sessão:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// GET - Obter detalhes de uma sessão específica
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar permissão
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) {
      return permissionCheck
    }

    const sessionId = params.id

    const query = `
      SELECT 
        us.id,
        us.user_id,
        u.username,
        u.nome,
        u.email,
        COALESCE(us.ip_address::text, 'Desconhecido') as ip_address,
        'Desconhecido' as user_agent,
        false as is_2fa_verified,
        us.created_at,
        us.expires_at,
        EXTRACT(EPOCH FROM (us.expires_at - NOW())) / 60 as time_remaining_minutes
      FROM user_sessions us
      JOIN users u ON us.user_id = u.id
      WHERE us.id = $1
    `

    const result = await pool.query(query, [sessionId])

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Sessão não encontrada' },
        { status: 404 }
      )
    }

    const session = result.rows[0]

    return NextResponse.json({
      success: true,
      session: {
        ...session,
        time_remaining: formatTimeRemaining(session.time_remaining_minutes)
      }
    })

  } catch (error) {
    console.error('Erro ao obter detalhes da sessão:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// Função auxiliar para formatar tempo restante
function formatTimeRemaining(minutes: number): string {
  if (minutes < 0) return 'Expirada'
  if (minutes < 60) return `${Math.round(minutes)}min`
  
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = Math.round(minutes % 60)
  
  if (hours < 24) {
    return `${hours}h ${remainingMinutes}min`
  }
  
  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24
  
  return `${days}d ${remainingHours}h`
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
