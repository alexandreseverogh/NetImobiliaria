import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres', host: '127.0.0.1', database: 'net_imobiliaria',
  password: 'postgres', port: 15432,
});

// 1. The item we just inserted
const item = await pool.query(`
  SELECT * FROM public.sidebar_menu_items WHERE id = 119
`);
console.log('\n=== sidebar_menu_items[119] ===');
console.log(JSON.stringify(item.rows[0], null, 2));

// 2. Check desperdicio (id=116) as reference — what does it have?
const desp = await pool.query(`
  SELECT * FROM public.sidebar_menu_items WHERE id = 116
`);
console.log('\n=== desperdicio item (116) ===');
console.log(JSON.stringify(desp.rows[0], null, 2));

// 3. Check sidebar_menu_item_modules for desperdicio
const modules116 = await pool.query(`
  SELECT * FROM public.sidebar_menu_item_modules WHERE menu_item_id = 116
`);
console.log('\n=== sidebar_menu_item_modules for 116 ===');
console.log(JSON.stringify(modules116.rows, null, 2));

// 4. Check sidebar_item_roles for desperdicio
const roles116 = await pool.query(`
  SELECT * FROM public.sidebar_item_roles WHERE menu_item_id = 116
`);
console.log('\n=== sidebar_item_roles for 116 ===');
console.log(JSON.stringify(roles116.rows, null, 2));

// 5. Check system_features related to desperdicio
const feat = await pool.query(`
  SELECT * FROM public.system_features WHERE url LIKE '%desperdicio%' OR url LIKE '%tracking%' OR url LIKE '%auditoria%'
`);
console.log('\n=== system_features (desperdicio/tracking/auditoria) ===');
console.log(JSON.stringify(feat.rows, null, 2));

// 6. Check permissions table for dashboard-campanhas
const perms = await pool.query(`
  SELECT * FROM public.permissions WHERE slug LIKE '%campanha%' OR slug LIKE '%dashboard-campanha%'
  LIMIT 10
`);
console.log('\n=== permissions (campanhas) ===');
console.log(JSON.stringify(perms.rows, null, 2));

// 7. Check how the sidebar menu API works — look for sidebar_menu_with_permissions view
const viewDef = await pool.query(`
  SELECT view_definition FROM information_schema.views
  WHERE table_schema = 'public' AND table_name = 'sidebar_menu_with_permissions'
`);
console.log('\n=== sidebar_menu_with_permissions view def (first 500 chars) ===');
console.log((viewDef.rows[0]?.view_definition ?? 'N/A').substring(0, 800));

await pool.end();
