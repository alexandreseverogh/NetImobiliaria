const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:15432/net_imobiliaria' });

async function check() {
  const res = await pool.query("SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'valor_destaque_local'");
  console.table(res.rows);
  await pool.end();
}

check();
