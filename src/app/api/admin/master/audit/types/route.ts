import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import pool from '@/lib/database/connection';

/**
 * API de Tipos de Auditoria (Master)
 * Retorna as ações distintas registradas nos logs
 */
export async function GET(request: NextRequest) {
  const token = request.cookies.get('admin_auth_token')?.value;
  const decoded = token ? await verifyToken(token) : null;

  if (!decoded || !(decoded as any).is_system_role) {
    return NextResponse.json({ error: 'Acesso Master Requerido' }, { status: 403 });
  }

  try {
    const result = await pool.query('SELECT DISTINCT action FROM audit_logs ORDER BY action ASC');
    const actions = result.rows.map(row => row.action);
    
    return NextResponse.json({ actions });
  } catch (error: any) {
    console.error('Error fetching audit types:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
