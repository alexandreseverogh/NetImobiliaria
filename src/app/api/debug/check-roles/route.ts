
import { NextResponse } from 'next/server';
import pool from '@/lib/database/connection';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const res = await pool.query("SELECT * FROM user_roles WHERE id = 42 OR name ILIKE '%admin%'");
    return NextResponse.json({
      roles: res.rows
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
