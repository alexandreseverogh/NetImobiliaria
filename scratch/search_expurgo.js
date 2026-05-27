const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:15432/net_imobiliaria' });

async function search() {
  const res = await pool.query("SELECT * FROM system_features WHERE url LIKE '%expurgo%' OR name LIKE '%Expurgo%'");
  console.table(res.rows);
  await pool.end();
}

search();
