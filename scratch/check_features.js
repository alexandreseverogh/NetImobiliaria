const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:15432/net_imobiliaria' });

async function check() {
  const res = await pool.query("SELECT * FROM system_features WHERE slug LIKE '%mudanca%'");
  console.table(res.rows);
  await pool.end();
}

check();
