
import { NextResponse } from 'next/server';
import pool from '@/lib/database/connection';

export const dynamic = 'force-dynamic';

export async function GET() {
  const userId = '56f4b07b-0133-4e21-a634-6269b5f03a60'; // admxyz
  const tenantId = 'c828d003-6213-4464-aa38-6c5d10a0aa9a'; // Imobiliaria XYZ

  try {
    const res = await pool.query("SELECT get_sidebar_menu_for_user($1::uuid, 'admin', $2::uuid) as menu", [userId, tenantId]);
    const menu = res.rows[0]?.menu || [];
    
    const crmItems = menu.filter((item: any) => item.name.toLowerCase().includes('crm') || item.path?.includes('crm'));

    return NextResponse.json({
      success: true,
      crm_items_found: crmItems.length,
      crm_items: crmItems,
      total_items: menu.length
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
