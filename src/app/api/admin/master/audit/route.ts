import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import pool from '@/lib/database/connection';

/**
 * API de Auditoria Global (Master)
 * Permite visualizar logs de todos os tenants
 */
export async function GET(request: NextRequest) {
  const token = request.cookies.get('admin_auth_token')?.value;
  const decoded = token ? await verifyToken(token) : null;

  if (!decoded || !(decoded as any).is_system_role) {
    return NextResponse.json({ error: 'Acesso Master Requerido' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const tenantId = searchParams.get('tenantId');
    const userId = searchParams.get('userId');
    const action = searchParams.get('action');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const offset = (page - 1) * limit;
    const params: any[] = [];
    let paramCount = 0;

    let whereClause = 'WHERE 1=1';

    if (tenantId) {
      paramCount++;
      whereClause += ` AND al.tenant_id = $${paramCount}`;
      params.push(tenantId);
    }

    if (userId) {
      paramCount++;
      whereClause += ` AND al.user_id = $${paramCount}`;
      params.push(userId);
    }

    if (action) {
      paramCount++;
      whereClause += ` AND al.action = $${paramCount}`;
      params.push(action);
    }

    if (startDate) {
      paramCount++;
      whereClause += ` AND al.timestamp >= $${paramCount}`;
      params.push(startDate);
    }

    if (endDate) {
      paramCount++;
      whereClause += ` AND al.timestamp <= $${paramCount}`;
      params.push(endDate);
    }

    const query = `
      SELECT 
        al.id,
        al.timestamp,
        al.action,
        al.resource,
        al.resource_id,
        al.details,
        al.ip_address,
        al.user_agent,
        al.user_type,
        u.nome as user_name,
        u.email as user_email,
        t.name as tenant_name
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      LEFT JOIN tenants t ON al.tenant_id = t.id
      ${whereClause}
      ORDER BY al.timestamp DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM audit_logs al
      ${whereClause}
    `;

    const [results, countResult] = await Promise.all([
      pool.query(query, [...params, limit, offset]),
      pool.query(countQuery, params)
    ]);

    const total = parseInt(countResult.rows[0].total);

    return NextResponse.json({
      logs: results.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error: any) {
    console.error('Error fetching global audit logs:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}