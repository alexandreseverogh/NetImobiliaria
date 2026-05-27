const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:15432/net_imobiliaria' });

const tenantId = 'c828d003-6213-4464-aa38-6c5d10a0aa9a';
const systemTenant = '00000000-0000-0000-0000-000000000001';

async function run() {
  try {
    console.log(`1. Moving ALL properties from system tenant to user tenant ${tenantId}...`);
    const resImoveis = await pool.query("UPDATE imoveis SET tenant_id = $1 WHERE tenant_id = $2", [tenantId, systemTenant]);
    console.log(`${resImoveis.rowCount} properties moved.`);

    console.log(`2. Moving ALL document types to user tenant ${tenantId}...`);
    const resDocs = await pool.query("UPDATE tipo_documento_imovel SET tenant_id = $1 WHERE tenant_id = $2", [tenantId, systemTenant]);
    console.log(`${resDocs.rowCount} document types moved.`);

    console.log('Done!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

run();
