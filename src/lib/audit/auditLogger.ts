import { NextRequest } from 'next/server'
import { extractRequestData as getRequestData } from '@/lib/utils/ipUtils'
import pool from '@/lib/database/connection'
import { QueryResult } from 'pg'

export interface AuditLogData {
  userId?: string | null
  publicUserUuid?: string | null
  userType?: 'admin' | 'cliente' | 'proprietario' | string | null
  tenantId?: string | null
  action: string
  resource: string
  resourceId?: string | number | null
  resourceType?: string // Aliás para compatibilidade legada
  details?: any
  ipAddress?: string
  userAgent?: string
}

export interface AuditLog {
  id: number
  user_id: string | null
  public_user_uuid: string | null
  user_type: string | null
  tenant_id: string | null
  action: string
  resource: string
  resource_id: number | null
  details: any
  ip_address: string | null
  user_agent: string | null
  timestamp: Date
  username?: string | null
  nome?: string | null
}

/**
 * Função segura para registrar logs de auditoria
 * Falha de auditoria NÃO afeta a operação principal
 */
export async function logAuditEvent(data: AuditLogData): Promise<void> {
  try {
    const resolvedUserType =
      data.userType ?? (data.userId ? 'admin' : null)

    const resource = data.resource || data.resourceType || 'UNKNOWN'
    
    // O resourceId agora é gravado como string para suportar UUIDs e IDs legados sem truncamento
    const resourceIdStr = data.resourceId !== undefined && data.resourceId !== null 
      ? data.resourceId.toString() 
      : null;

    await pool.query(
      `
        INSERT INTO audit_logs (
          user_id,
          public_user_uuid,
          user_type,
          tenant_id,
          action,
          resource,
          resource_id,
          details,
          ip_address,
          user_agent,
          timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      `,
      [
        data.userId ?? null,
        data.publicUserUuid ?? null,
        resolvedUserType,
        data.tenantId ?? null,
        data.action,
        resource,
        resourceIdStr,
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
 * Buscar logs de auditoria com isolamento multi-tenant
 */
export async function findAuditLogs(filters: {
  tenantId: string | null // null = master sees all
  userId?: string
  action?: string
  resource?: string
  startDate?: string
  endDate?: string
  search?: string
  page?: number
  limit?: number
}): Promise<{ logs: AuditLog[]; total: number }> {
  try {
    const { tenantId, userId, action, resource, startDate, endDate, search, page = 1, limit = 50 } = filters
    const offset = (page - 1) * limit
    
    const conditions: string[] = []
    const params: any[] = []
    let paramCount = 0

    // Isolamento Multi-Tenant
    if (tenantId !== null) {
      paramCount++
      conditions.push(`al.tenant_id = $${paramCount}`)
      params.push(tenantId)
    }

    if (userId) {
      paramCount++
      conditions.push(`al.user_id = $${paramCount}`)
      params.push(userId)
    }

    if (action) {
      paramCount++
      conditions.push(`al.action = $${paramCount}`)
      params.push(action)
    }

    if (resource) {
      paramCount++
      conditions.push(`al.resource = $${paramCount}`)
      params.push(resource)
    }

    if (startDate) {
      paramCount++
      conditions.push(`al.timestamp >= $${paramCount}`)
      params.push(startDate)
    }

    if (endDate) {
      paramCount++
      conditions.push(`al.timestamp <= $${paramCount}`)
      params.push(endDate)
    }

    if (search) {
      paramCount++
      conditions.push(`(
        al.action ILIKE $${paramCount} OR 
        al.resource ILIKE $${paramCount} OR 
        u.nome ILIKE $${paramCount} OR 
        u.username ILIKE $${paramCount}
      )`)
      params.push(`%${search}%`)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // Query Total
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ${whereClause}
    `
    const countResult = await pool.query(countQuery, params)
    const total = parseInt(countResult.rows[0].total)

    // Query Data
    paramCount++
    const limitIdx = paramCount
    params.push(limit)

    paramCount++
    const offsetIdx = paramCount
    params.push(offset)

    const dataQuery = `
      SELECT 
        al.*, 
        u.username, 
        u.nome
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ${whereClause}
      ORDER BY al.timestamp DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `
    const dataResult: QueryResult<AuditLog> = await pool.query(dataQuery, params)

    return {
      logs: dataResult.rows,
      total
    }
  } catch (error) {
    console.error('❌ Erro ao buscar logs de auditoria:', error)
    throw error
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
      // Tentar cookies
      if ('cookies' in request) {
        const cookies = (request as any).cookies
        const token = cookies.get('accessToken')?.value || cookies.get('admin_auth_token')?.value
        if (token) {
          return decodeAndExtractUserId(token)
        }
      }
      return null
    }

    const token = authHeader.substring(7)
    return decodeAndExtractUserId(token)
  } catch (error) {
    return null
  }
}

function decodeAndExtractUserId(token: string): string | null {
  try {
    const jwt = require('jsonwebtoken')
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret'
    const decoded = jwt.verify(token, jwtSecret)
    return decoded.userId || null
  } catch {
    return null
  }
}
