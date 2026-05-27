
import { NextResponse } from 'next/server';
import pool from '@/lib/database/connection';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const table = 'permissions';
    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = $1
    `, [table]);
    
    const table2 = 'role_permissions';
    const res2 = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = $1
    `, [table2]);

    return NextResponse.json({
      permissions: res.rows,
      role_permissions: res2.rows
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
