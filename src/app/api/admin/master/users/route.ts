import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { requireApiPermission } from '@/lib/auth/apiPermissions';
import pool from '@/lib/database/connection';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('admin_auth_token')?.value;
  const decoded = token ? await verifyToken(token) : null;

  if (!decoded || !decoded.is_system_role) {
    return NextResponse.json({ error: 'Acesso Master Requerido' }, { status: 403 });
  }

  try {
    const totalQuery = `SELECT COUNT(*) FROM users u WHERE u.ativo = true`;
    const usersQuery = `
      SELECT u.id, u.username, u.email, u.nome, u.ativo, u.created_at,
             ur.name as role_name, ur.level as role_level
      FROM users u
      LEFT JOIN user_role_assignments ura ON u.id = ura.user_id
      LEFT JOIN user_roles ur ON ura.role_id = ur.id
      WHERE u.ativo = true
      ORDER BY u.created_at DESC
    `;
    
    const result = await pool.query(usersQuery);
    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching master users:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get('admin_auth_token')?.value;
  const decoded = token ? await verifyToken(token) : null;

  if (!decoded || !decoded.is_system_role) {
    return NextResponse.json({ error: 'Acesso Master Requerido' }, { status: 403 });
  }

  try {
    const denied = await requireApiPermission(request, 'master', 'ADMIN')
    if (denied) return denied
    const { userId, roleId } = await request.json();

    if (!userId || !roleId) {
      return NextResponse.json({ error: 'userId and roleId are required' }, { status: 400 });
    }

    // Verify if the role is actually a system role
    const roleCheck = await pool.query('SELECT is_system_role FROM user_roles WHERE id = $1', [roleId]);
    if (roleCheck.rows.length === 0 || !roleCheck.rows[0].is_system_role) {
       return NextResponse.json({ error: 'Role must be a system role' }, { status: 400 });
    }

    await pool.query(
      'INSERT INTO user_role_assignments (user_id, role_id, assigned_by) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [userId, roleId, (decoded as any).userId]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error assigning master role:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}