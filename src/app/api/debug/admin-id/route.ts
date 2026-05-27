import { NextResponse } from 'next/server';
import pool from '@/lib/database/connection';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await pool.query(`SELECT id, username, nome FROM public.users WHERE username = 'admin'`);
    return NextResponse.json({ admin_user: result.rows[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
