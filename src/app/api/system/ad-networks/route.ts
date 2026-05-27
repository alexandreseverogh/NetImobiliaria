import { NextResponse } from 'next/server';
import pool from '@/lib/database/connection';

export const dynamic = 'force-dynamic';

/**
 * GET /api/system/ad-networks
 * Returns all ad networks for use in selectors — never hardcode.
 */
export async function GET() {
  try {
    const res = await pool.query(
      `SELECT id, code, name, icon, color, is_active, capabilities, sort_order
       FROM public.ad_networks
       ORDER BY sort_order, name`,
    );
    return NextResponse.json({ networks: res.rows });
  } catch (err: any) {
    return NextResponse.json({ error: 'Erro ao buscar redes', detail: err.message }, { status: 500 });
  }
}
