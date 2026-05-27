import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import pool from '@/lib/database/connection';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('admin_auth_token')?.value;
  const decoded = token ? await verifyToken(token) : null;

  if (!decoded || !decoded.is_system_role) {
    return NextResponse.json({ error: 'Acesso Master Requerido' }, { status: 403 });
  }

  try {
    // Buscar segmentos com seus respectivos módulos (motores)
    const result = await pool.query(`
      SELECT 
        s.*,
        string_agg(m.name, ', ') as module_names,
        array_agg(m.id) as module_ids
      FROM system_segments s
      LEFT JOIN system_segment_modules sm ON s.id = sm.segment_id
      LEFT JOIN system_modules m ON sm.module_id = m.id
      GROUP BY s.id
      ORDER BY s.name ASC
    `);

    // Também buscar módulos disponíveis para o formulário de edição
    const modulesRes = await pool.query('SELECT id, name, slug FROM system_modules ORDER BY name');

    return NextResponse.json({ 
      segments: result.rows,
      availableModules: modulesRes.rows
    });
  } catch (error: any) {
    console.error('Error fetching segments:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}