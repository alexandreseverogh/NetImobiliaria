import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: '127.0.0.1',
  database: 'net_imobiliaria',
  password: 'postgres',
  port: 15432,
});

// Insert "Auditoria" sidebar item as child of campanhas (parent_id=110)
const result = await pool.query(`
  INSERT INTO public.sidebar_menu_items
    (parent_id, name, icon_name, url, resource, order_index, is_active,
     roles_required, permission_required, permission_action, description, system_id)
  SELECT
    110,
    'Auditoria',
    'ClipboardList',
    '/admin/campanhas/auditoria',
    'dashboard-campanhas',
    113,
    true,
    '[]'::jsonb,
    'dashboard-campanhas',
    'READ',
    'Relatório de auditoria mensal/semanal com scorecard, problemas e plano de ação',
    'admin'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.sidebar_menu_items WHERE url = '/admin/campanhas/auditoria'
  )
  RETURNING id, name, url, order_index
`);

if (result.rows.length > 0) {
  console.log('✅ Sidebar item inserted:', JSON.stringify(result.rows[0]));
} else {
  console.log('ℹ️ Sidebar item already exists, skipped.');
}

await pool.end();
