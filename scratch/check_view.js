const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:15432/net_imobiliaria' });

async function check() {
  const res = await pool.query("SELECT pg_get_viewdef('imoveis_completos', true)");
  console.log(res.rows[0].pg_get_viewdef);
  await pool.end();
}

check();
