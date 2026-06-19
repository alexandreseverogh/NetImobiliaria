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

// Check all children of parent 110
const items = await pool.query(`
  SELECT id, name, url, parent_id, order_index, icon_name
  FROM public.sidebar_menu_items
  WHERE parent_id = 110
  ORDER BY order_index
`);
console.log('All campanhas children:', JSON.stringify(items.rows, null, 2));

// Also check next available id
const maxId = await pool.query(`SELECT MAX(id) as max_id FROM public.sidebar_menu_items`);
console.log('Max ID:', maxId.rows[0].max_id);

await pool.end();
