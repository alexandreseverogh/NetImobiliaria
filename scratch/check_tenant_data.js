const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:15432/net_imobiliaria' });

const tenantId = 'c828d003-6213-4464-aa38-6c5d10a0aa9a';

async function check() {
  const imoveisDestaque = await pool.query("SELECT COUNT(*) FROM imoveis WHERE tenant_id = $1 AND (destaque = true OR destaque_nacional = true)", [tenantId]);
  const valorLocal = await pool.query("SELECT COUNT(*) FROM valor_destaque_local WHERE tenant_id = $1", [tenantId]);
  const parametros = await pool.query("SELECT COUNT(*) FROM parametros WHERE tenant_id = $1", [tenantId]);
  const parametrosGlobal = await pool.query("SELECT COUNT(*) FROM parametros WHERE tenant_id = '00000000-0000-0000-0000-000000000001'");

  console.log('Imóveis com destaque:', imoveisDestaque.rows[0].count);
  console.log('Valores locais configurados:', valorLocal.rows[0].count);
  console.log('Registros em parametros (tenant):', parametros.rows[0].count);
  console.log('Registros em parametros (global):', parametrosGlobal.rows[0].count);

  await pool.end();
}

check();
