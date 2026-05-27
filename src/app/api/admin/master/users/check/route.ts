import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import pool from '@/lib/database/connection';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('admin_auth_token')?.value;
  const decoded = token ? await verifyToken(token) : null;

  if (!decoded || !decoded.is_system_role) {
    return NextResponse.json({ error: 'Acesso Master Requerido' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');

  if (!email) {
    return NextResponse.json({ error: 'Email requerido' }, { status: 400 });
  }

  try {
    const result = await pool.query('SELECT id, nome, email, username FROM users WHERE email = $1', [email]);
    if (result.rows.length > 0) {
      return NextResponse.json({ found: true, user: result.rows[0] });
    }
    return NextResponse.json({ found: false });
  } catch (error: any) {
    console.error('Error checking user email:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}