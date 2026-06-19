import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres', host: '127.0.0.1', database: 'net_imobiliaria',
  password: 'postgres', port: 15432,
});

// Get the full function definition
const fn = await pool.query(`
  SELECT pg_get_functiondef(oid) AS def
  FROM pg_proc
  WHERE proname = 'get_sidebar_menu_for_user'
`);
console.log('=== get_sidebar_menu_for_user ===');
console.log(fn.rows[0]?.def ?? 'NOT FOUND');

// Also check system_features columns
const cols = await pool.query(`
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='system_features'
  ORDER BY ordinal_position
`);
console.log('\n=== system_features columns ===');
console.log(cols.rows.map(r => r.column_name).join(', '));

// Sample a feature that maps to a menu item (e.g. dashboard)
const feat = await pool.query(`
  SELECT sf.id, sf.name, sf.url, sf.category_id, sf.is_active, smi.id as menu_item_id, smi.name as menu_name
  FROM public.system_features sf
  LEFT JOIN public.sidebar_menu_items smi ON smi.feature_id = sf.id
  WHERE sf.url LIKE '%campanha%' OR sf.url LIKE '%desperdicio%'
  LIMIT 20
`);
console.log('\n=== system_features linked to campanhas ===');
console.log(JSON.stringify(feat.rows, null, 2));

await pool.end();
