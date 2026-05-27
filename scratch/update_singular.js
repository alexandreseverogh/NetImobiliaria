const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:15432/net_imobiliaria' });

async function run() {
  await pool.query("UPDATE system_features SET url = '/admin/mudanca-status' WHERE slug = 'mudanca-status'");
  await pool.query("UPDATE sidebar_menu_items SET url = '/admin/mudanca-status' WHERE url = '/admin/mudancas-status'");
  console.log('Database updated to singular');
  await pool.end();
}

run();
