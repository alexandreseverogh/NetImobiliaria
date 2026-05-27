
import { NextResponse } from 'next/server';
import pool from '@/lib/database/connection';

export const dynamic = 'force-dynamic';

export async function GET() {
  const data: any = {};
  const userId = '56f4b07b-0133-4e21-a634-6269b5f03a60';
  const tenantId = 'c828d003-6213-4464-aa38-6c5d10a0aa9a';

  try {
    const itemsRes = await pool.query(`
      SELECT s.id, s.name, s.url, s.permission_required,
             ARRAY(SELECT f.slug FROM system_features f JOIN system_feature_modules fm ON f.id = fm.feature_id JOIN sidebar_menu_item_modules smim ON fm.module_id = smim.module_id WHERE smim.menu_item_id = s.id) as feature_slugs
      FROM sidebar_menu_items s
      WHERE s.name ILIKE '%CRM%' OR s.url ILIKE '%crm%'
    `);
    data.crm_items_detail = itemsRes.rows;

    // Verificar se o usuário tem as permissões necessárias
    const permsRes = await pool.query(`
        SELECT f.slug, f.name
        FROM role_permissions rp
        JOIN user_tenant_membership utm ON rp.role_id = utm.role_id
        JOIN permissions p ON rp.permission_id = p.id
        JOIN system_features f ON p.feature_id = f.id
        WHERE utm.user_id = $1 AND utm.tenant_id = $2
    `, [userId, tenantId]);
    data.user_permissions = permsRes.rows.map(r => r.slug);

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
