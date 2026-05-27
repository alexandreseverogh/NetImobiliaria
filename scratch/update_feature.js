const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:15432/net_imobiliaria' });

async function run() {
  const res = await pool.query("UPDATE system_features SET url = '/admin/mudancas-status' WHERE slug = 'mudanca-status'");
  console.log('system_features updated:', res.rowCount);
  await pool.end();
}

run();
