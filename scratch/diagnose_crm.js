const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function diagnose() {
  const pool = new Pool({
    user: process.env.DB_USER, host: '127.0.0.1',
    database: process.env.DB_NAME, password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT),
  });
  const tenantId = 'c828d003-6213-4464-aa38-6c5d10a0aa9a';

  try {
    console.log('\n=== sidebar_menu_items CRM ===');
    const sidebarCrm = await pool.query(`
      SELECT smi.id, smi.name, smi.url, smi.feature_id, smi.permission_id
      FROM sidebar_menu_items smi
      WHERE smi.name ILIKE '%crm%' OR smi.url ILIKE '%crm%' OR smi.name ILIKE '%lead%' OR smi.name ILIKE '%kanban%'
      ORDER BY smi.name
    `);
    console.log('CRM sidebar items:', sidebarCrm.rows.length > 0 ? sidebarCrm.rows : '(nenhum)');

    console.log('\n=== sidebar_menu_item_modules CRM ===');
    const simmCrm = await pool.query(`
      SELECT simm.menu_item_id, smi.name, smi.url, sm.name as module_name
      FROM sidebar_menu_item_modules simm
      JOIN sidebar_menu_items smi ON simm.menu_item_id = smi.id
      JOIN system_modules sm ON simm.module_id = sm.id
      WHERE sm.slug = 'crm'
    `);
    console.log('CRM sidebar-module links:', simmCrm.rows.length > 0 ? simmCrm.rows : '(NENHUM LINK CONFIGURADO)');

    console.log('\n=== sidebar_item_roles ===');
    const sirCols = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'sidebar_item_roles' ORDER BY ordinal_position`);
    console.log('sidebar_item_roles cols:', sirCols.rows.map(r => r.column_name));

    console.log('\n=== getUserWithPermissions query: o que chega para admxyz? ===');
    // Simula a query principal de permissões
    const adminPerms = await pool.query(`
      SELECT DISTINCT sf.id, sf.name, sf.slug, sf.url,
        ARRAY_AGG(DISTINCT p.action) as actions
      FROM system_features sf
      JOIN permissions p ON p.feature_id = sf.id
      JOIN role_permissions rp ON rp.permission_id = p.id
      JOIN user_tenant_membership utm ON utm.role_id = rp.role_id
      JOIN users u ON u.id = utm.user_id
      WHERE u.username = 'admxyz'
      GROUP BY sf.id, sf.name, sf.slug, sf.url
    `);
    console.log('Features permissões admxyz:', adminPerms.rows.length > 0 ? adminPerms.rows : '(ZERO — confirmado sem permissões)');

    // Check if is_default_tenant_admin_feature matters
    console.log('\n=== Features com is_default_tenant_admin_feature = true ===');
    const defaults = await pool.query(`
      SELECT sf.id, sf.name, sf.slug, sf.url
      FROM system_features sf
      WHERE sf.is_default_tenant_admin_feature = true
      ORDER BY sf.name
    `);
    console.log(defaults.rows.length > 0 ? defaults.rows : '(nenhuma)');

  } catch (err) {
    console.error('Erro:', err.message);
  } finally {
    await pool.end();
  }
}
diagnose();
