const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:15432/net_imobiliaria' });

async function check() {
  const res = await pool.query("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'imoveis' AND column_name = 'tenant_id'");
  console.table(res.rows);
  await pool.end();
}

check();
