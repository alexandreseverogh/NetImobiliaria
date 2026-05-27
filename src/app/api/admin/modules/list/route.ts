import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database/connection';
import { getTokenFromRequest, verifyToken } from '@/lib/auth/jwt';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {

    const token = getTokenFromRequest(request);
    const decoded = token ? await verifyToken(token) : null;
    
    const isMasterAdmin = (decoded as any)?.is_system_role === true;
    
    if (!decoded || !isMasterAdmin) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }
    const { rows } = await pool.query(`
      SELECT id, name, slug 
      FROM system_modules 
      ORDER BY name ASC
    `);

    return NextResponse.json({
      success: true,
      modules: rows
    });
  } catch (error) {
    console.error('Erro ao listar módulos:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
