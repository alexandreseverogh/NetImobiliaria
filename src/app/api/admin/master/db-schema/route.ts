import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import pool from '@/lib/database/connection';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_auth_token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = await verifyToken(token);
    // Segurança: Apenas Master Admins (is_system_role) podem ver o esquema do banco
    if (!decoded || !(decoded as any).is_system_role) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const client = await pool.connect();
    try {
      // 1. Buscar todas as tabelas (exceto as de sistema do postgres)
      const tablesQuery = `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name ASC
      `;
      const tablesRes = await client.query(tablesQuery);

      // 2. Buscar todas as colunas de todas as tabelas
      const columnsQuery = `
        SELECT table_name, column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        ORDER BY table_name ASC, ordinal_position ASC
      `;
      const columnsRes = await client.query(columnsQuery);

      // Organizar os dados em um mapa
      const schema: Record<string, any[]> = {};
      tablesRes.rows.forEach(t => {
        schema[t.table_name] = columnsRes.rows
          .filter(c => c.table_name === t.table_name)
          .map(c => ({ name: c.column_name, type: c.data_type }));
      });

      return NextResponse.json({
        success: true,
        schema
      });

    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('❌ Error fetching DB Schema:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
