import { NextRequest } from 'next/server'
import { extractRequestData as getRequestData } from '@/lib/utils/ipUtils'
import pool from '@/lib/database/connection'

interface AuditLogData {
  userId?: string | null
  publicUserUuid?: string | null
  userType?: 'admin' | 'cliente' | 'proprietario' | string | null
  action: string
  resource: string
  resourceId: string | number | null
  details?: any
  ipAddress?: string
  userAgent?: string
}

/**
 * Função segura para registrar logs de auditoria
 * Falha de auditoria NÃO afeta a operação principal
 */
export async function logAuditEvent(data: AuditLogData): Promise<void> {
  try {
    const resolvedUserType =
      data.userType ?? (data.userId ? 'admin' : null)

    await pool.query(
      `
        INSERT INTO audit_logs (
          user_id,
          public_user_uuid,
          user_type,
          action,
          resource,
          resource_id,
          details,
          ip_address,
          user_agent,
          timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      `,
      [
        data.userId ?? null,
        data.publicUserUuid ?? null,
        resolvedUserType,
        data.action,
        data.resource,
        data.resourceId,
        data.details !== undefined ? JSON.stringify(data.details) : null,
        data.ipAddress || null,
        data.userAgent || null
      ]
    )
  } catch (error) {
    // Log do erro mas NÃO falha a operação principal
    console.error('❌ Erro ao registrar auditoria (não crítico):', error)
  }
}

/**
 * Função para extrair dados do request (IP, User-Agent)
 * Reutiliza a função centralizada já testada
 */
export function extractRequestData(request: NextRequest): { ipAddress: string; userAgent: string } {
  return getRequestData(request);
}

/**
 * Função para extrair userId do token JWT
 */
export function extractUserIdFromToken(request: Request): string | null {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.substring(7)
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret'
    
    const jwt = require('jsonwebtoken')
    const decoded = jwt.verify(token, jwtSecret)
    return decoded.userId || null
  } catch (error) {
    return null
  }
}
