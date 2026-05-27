const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:15432/net_imobiliaria' });

async function check() {
  const res = await pool.query("SELECT * FROM sidebar_menu_items WHERE feature_id = 54");
  console.table(res.rows);
  await pool.end();
}

check();
