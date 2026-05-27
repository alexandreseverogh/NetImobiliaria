
import { NextResponse } from 'next/server';
import pool from '@/lib/database/connection';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sqlPath = path.join(process.cwd(), 'database', 'migrations', 'PILAR_5_AUTOMATED_PROVISIONING.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // O PostgreSQL não gosta de múltiplos comandos em uma única chamada pool.query se houver blocos DO ou transações complexas às vezes.
    // Mas vamos tentar.
    await pool.query(sql);
    
    return NextResponse.json({ success: true, message: 'Migration applied successfully.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
