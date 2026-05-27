import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database/connection';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const result = await pool.query(`
      SELECT 
        id, 
        parent_id, 
        name, 
        url, 
        permission_required,
        system_id,
        is_active,
        order_index
      FROM sidebar_menu_items
      ORDER BY parent_id NULLS FIRST, order_index ASC
    `);
    return NextResponse.json({ data: result.rows });
  } catch (error) {
    return NextResponse.json({ error: String(error) });
  }
}
