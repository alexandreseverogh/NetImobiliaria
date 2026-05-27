import { NextResponse } from 'next/server';
import pool from '@/lib/database/connection';

export async function GET() {

  try {
    const sql = "UPDATE public.sidebar_menu_items SET permission_required = 'crm-settings', system_id = 'admin' WHERE id = 67";
    await pool.query(sql);
    
    return NextResponse.json({ success: true, message: 'ID 67 updated to crm-settings' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
