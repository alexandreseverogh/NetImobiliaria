const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:15432/net_imobiliaria' });

async function check() {
  const res = await pool.query("SELECT id, codigo, ativo, tenant_id FROM imoveis WHERE id = 13");
  console.table(res.rows);
  await pool.end();
}

check();
