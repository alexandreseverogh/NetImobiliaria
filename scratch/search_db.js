const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:15432/net_imobiliaria' });

async function check() {
  const res = await pool.query("SELECT * FROM system_features WHERE url LIKE '%mudanca%'");
  console.log('System Features:');
  console.table(res.rows);
  
  // Try to find where the menu items are stored
  const res2 = await pool.query("SELECT table_name FROM information_schema.columns WHERE column_name = 'path' OR column_name = 'url'");
  console.log('Tables with path/url columns:');
  console.table(res2.rows);

  await pool.end();
}

check();
