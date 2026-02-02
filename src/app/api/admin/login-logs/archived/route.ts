import { NextRequest, NextResponse } from 'next/server';
import { safeParseInt } from '@/lib/utils/safeParser';
import { unifiedPermissionMiddleware } from '@/lib/middleware/UnifiedPermissionMiddleware';
import pool from '@/lib/database/connection';

// GET /api/admin/login-logs/archived - Listar logs arquivados
export async function GET(request: NextRequest) {
  try {
    // Verificar permissões via middleware unificado
    const permissionCheck = await unifiedPermissionMiddleware(request);
    if (permissionCheck) return permissionCheck;

    // Obter parâmetros de consulta
    const { searchParams } = new URL(request.url);
    const page = safeParseInt(searchParams.get('page'), 1, 1);
    const limit = safeParseInt(searchParams.get('limit'), 20, 1, 100);
    const action = searchParams.get('action') || '';
    const username = searchParams.get('username') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const purgedBy = searchParams.get('purgedBy') || '';

    const offset = (page - 1) * limit;

    const client = await pool.connect();

    try {
      // Construir query base
      let whereConditions = [];
      let queryParams = [];
      let paramIndex = 1;

      if (action) {
        whereConditions.push(`action ILIKE $${paramIndex}`);
        queryParams.push(`%${action}%`);
        paramIndex++;
      }

      if (username) {
        whereConditions.push(`username ILIKE $${paramIndex}`);
        queryParams.push(`%${username}%`);
        paramIndex++;
      }

      if (startDate) {
        whereConditions.push(`created_at::date >= $${paramIndex}`);
        queryParams.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        whereConditions.push(`created_at::date <= $${paramIndex}`);
        queryParams.push(endDate);
        paramIndex++;
      }

      if (purgedBy) {
        whereConditions.push(`purged_by::text ILIKE $${paramIndex}`);
        queryParams.push(`%${purgedBy}%`);
        paramIndex++;
      }

      const whereClause = whereConditions.length > 0
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

      // Query para obter logs arquivados
      const logsQuery = `
        SELECT 
          id,
          user_id,
          username,
          action,
          ip_address,
          user_agent,
          two_fa_used,
          two_fa_method,
          success,
          failure_reason,
          session_id,
          created_at,
          purged_at,
          purged_by,
          purge_reason
        FROM login_logs_purged
        ${whereClause}
        ORDER BY purged_at DESC, created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      queryParams.push(limit, offset);

      const logsResult = await client.query(logsQuery, queryParams);

      // Query para contar total de registros
      const countQuery = `
        SELECT COUNT(*) as total
        FROM login_logs_purged
        ${whereClause}
      `;

      const countResult = await client.query(countQuery, queryParams.slice(0, -2));
      const total = parseInt(countResult.rows[0].total);

      // Estatísticas dos logs arquivados
      const statsQuery = `
        SELECT 
          COUNT(*) as total_archived,
          COUNT(CASE WHEN success = true THEN 1 END) as successful_logins,
          COUNT(CASE WHEN success = false THEN 1 END) as failed_logins,
          COUNT(CASE WHEN two_fa_used = true THEN 1 END) as two_fa_used,
          MIN(created_at) as oldest_log,
          MAX(created_at) as newest_log,
          MIN(purged_at) as first_purge,
          MAX(purged_at) as last_purge
        FROM login_logs_purged
        ${whereClause}
      `;

      const statsResult = await client.query(statsQuery, queryParams.slice(0, -2));

      return NextResponse.json({
        success: true,
        logs: logsResult.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        },
        stats: statsResult.rows[0]
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Erro ao buscar logs arquivados:', error);
    return NextResponse.json(
      {
        message: 'Erro interno do servidor',
        error: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined
      },
      { status: 500 }
    );
  }
}




