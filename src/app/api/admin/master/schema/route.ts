import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import pool from '@/lib/database/connection';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('admin_auth_token')?.value;
  const decoded = token ? await verifyToken(token) : null;

  // Apenas Master pode descobrir schemas para mapeamento
  if (!decoded || !decoded.is_system_role) {
    if (decoded?.username !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }
  }

  const { searchParams } = new URL(request.url);
  const table = searchParams.get('table');

  if (!table) {
    return NextResponse.json({ error: 'Tabela não especificada' }, { status: 400 });
  }

  // Lista branca de tabelas permitidas para evitar SQL Injection e vazamento de dados sensíveis
  const allowedTables = ['imoveis', 'imovel_prospects', 'clientes', 'leads_kanban', 'user_roles', 'users'];
  if (!allowedTables.includes(table)) {
    return NextResponse.json({ error: 'Tabela não permitida para mapeamento' }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    const columnsRes = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = $1 
      AND table_schema = 'public'
      ORDER BY column_name ASC
    `, [table]);

    return NextResponse.json({
      success: true,
      table,
      columns: columnsRes.rows.map(r => ({
        id: r.column_name,
        label: r.column_name,
        type: r.data_type
      }))
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
