const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:15432/net_imobiliaria' });

async function run() {
  const res = await pool.query("SELECT * FROM route_permissions_config WHERE route_pattern LIKE '%valordestaque%'");
  console.table(res.rows);
  await pool.end();
}

run();
