const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:15432/net_imobiliaria' });

async function check() {
  const res = await pool.query("SELECT id, codigo, tenant_id FROM imoveis WHERE tenant_id = 'c828d003-6213-4464-aa38-6c5d10a0aa9a'");
  console.table(res.rows);
  await pool.end();
}

check();
