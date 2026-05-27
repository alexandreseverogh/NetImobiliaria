const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:15432/net_imobiliaria' });

async function check() {
  const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'sidebar_menu_items'");
  console.table(res.rows);
  await pool.end();
}

check();
