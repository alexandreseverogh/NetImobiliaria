const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:15432/net_imobiliaria' });

const tenantId = 'c828d003-6213-4464-aa38-6c5d10a0aa9a';

async function check() {
  const res = await pool.query("SELECT COUNT(*) FROM imoveis WHERE tenant_id = $1", [tenantId]);
  console.log('Total imoveis do tenant:', res.rows[0].count);
  
  const destacaNacional = await pool.query("SELECT COUNT(*) FROM imoveis WHERE tenant_id = $1 AND destaque_nacional = true", [tenantId]);
  console.log('Destaque Nacional:', destacaNacional.rows[0].count);

  const destacaLocal = await pool.query("SELECT COUNT(*) FROM imoveis WHERE tenant_id = $1 AND destaque = true", [tenantId]);
  console.log('Destaque Local:', destacaLocal.rows[0].count);

  await pool.end();
}

check();
