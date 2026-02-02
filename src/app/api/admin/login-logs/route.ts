import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database/connection';
import { safeParseInt } from '@/lib/utils/safeParser';
import { unifiedPermissionMiddleware } from '@/lib/middleware/UnifiedPermissionMiddleware';

// GET /api/admin/login-logs - Listar logs de login/logout
export async function GET(request: NextRequest) {
  // Verificar permissões via middleware unificado
  const permissionCheck = await unifiedPermissionMiddleware(request);
  if (permissionCheck) return permissionCheck;

  try {

    // Extrair parâmetros de consulta
    const { searchParams } = new URL(request.url);
    const page = safeParseInt(searchParams.get('page'), 1, 1);
    const limit = safeParseInt(searchParams.get('limit'), 20, 1, 100);
    const offset = (page - 1) * limit;

    // Filtros
    const username = searchParams.get('username');
    const action = searchParams.get('action');
    const twoFaUsed = searchParams.get('two_fa_used');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const ipAddress = searchParams.get('ip_address');

    const client = await pool.connect();

    try {
      // Construir query com filtros
      let whereConditions = [];
      let queryParams = [];
      let paramIndex = 1;

      if (username) {
        whereConditions.push(`username ILIKE $${paramIndex}`);
        queryParams.push(`%${username}%`);
        paramIndex++;
      }

      if (action) {
        whereConditions.push(`action = $${paramIndex}`);
        queryParams.push(action);
        paramIndex++;
      }

      if (twoFaUsed !== null && twoFaUsed !== '') {
        whereConditions.push(`two_fa_used = $${paramIndex}`);
        queryParams.push(twoFaUsed === 'true');
        paramIndex++;
      }

      if (startDate) {
        whereConditions.push(`created_at >= $${paramIndex}::date`);
        queryParams.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        whereConditions.push(`created_at < ($${paramIndex}::date + interval '1 day')`);
        queryParams.push(endDate);
        paramIndex++;
      }

      if (ipAddress) {
        whereConditions.push(`ip_address::text ILIKE $${paramIndex}`);
        queryParams.push(`%${ipAddress}%`);
        paramIndex++;
      }

      const whereClause = whereConditions.length > 0
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';


      // Query principal
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
          created_at
        FROM login_logs
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      queryParams.push(limit, offset);

      const logsResult = await client.query(logsQuery, queryParams);

      // Query para contar total
      const countQuery = `
        SELECT COUNT(*) as total
        FROM login_logs
        ${whereClause}
      `;

      const countResult = await client.query(countQuery, queryParams.slice(0, -2));
      const total = parseInt(countResult.rows[0].total);

      // Estatísticas
      const statsQuery = `
        SELECT 
          COUNT(*) as total_logs,
          COUNT(CASE WHEN action = 'login' THEN 1 END) as total_logins,
          COUNT(CASE WHEN action = 'logout' THEN 1 END) as total_logouts,
          COUNT(CASE WHEN action = 'login_failed' THEN 1 END) as total_failed,
          COUNT(CASE WHEN two_fa_used = true THEN 1 END) as total_2fa_used,
          COUNT(CASE WHEN success = false THEN 1 END) as total_failures,
          COUNT(DISTINCT user_id) as unique_users_in_logs
        FROM login_logs
        ${whereClause}
      `;

      // Total de usuários cadastrados no sistema
      const totalUsersQuery = `
        SELECT COUNT(*) as total_users
        FROM users 
        WHERE ativo = true
      `;

      const statsResult = await client.query(statsQuery, queryParams.slice(0, -2));
      const stats = statsResult.rows[0];

      const totalUsersResult = await client.query(totalUsersQuery);
      const totalUsers = parseInt(totalUsersResult.rows[0].total_users);

      return NextResponse.json({
        success: true,
        logs: logsResult.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        },
        stats: {
          total_logs: parseInt(stats.total_logs),
          total_logins: parseInt(stats.total_logins),
          total_logouts: parseInt(stats.total_logouts),
          total_failed: parseInt(stats.total_failed),
          total_2fa_used: parseInt(stats.total_2fa_used),
          total_failures: parseInt(stats.total_failures),
          unique_users_in_logs: parseInt(stats.unique_users_in_logs),
          total_users_registered: totalUsers
        }
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Erro ao buscar logs de login:', error);
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
