import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database/connection';

export const dynamic = 'force-dynamic';

// GET /api/cron/agent-expire
// Marca como EXPIRED todas as AgentActions PENDING_APPROVAL com PIN vencido.
// Chamado pelo cron (ex: a cada hora). Protegido por CRON_SECRET.
export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') ?? req.nextUrl.searchParams.get('secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { rowCount } = await pool.query(
      `UPDATE campanhasmarketingdigital."AgentAction"
       SET status = 'EXPIRED', "executedAt" = NOW()
       WHERE status = 'PENDING_APPROVAL'
         AND approval_pin_exp IS NOT NULL
         AND approval_pin_exp < NOW()`,
    );

    return NextResponse.json({ ok: true, expired: rowCount });
  } catch (err: any) {
    console.error('[agent-expire cron]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
