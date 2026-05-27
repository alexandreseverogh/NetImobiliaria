import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import pool from '@/lib/database/connection';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('admin_auth_token')?.value;
  const decoded = token ? await verifyToken(token) : null;

  // Apenas Master pode listar o esquema bruto
  if (!decoded || (!decoded.is_system_role && decoded.username !== 'admin')) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

    return NextResponse.json({
      success: true,
      tables: res.rows.map(r => r.table_name)
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    client.release();
  }
}
