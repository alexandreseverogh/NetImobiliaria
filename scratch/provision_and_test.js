const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:15432/net_imobiliaria' });

const tenantId = 'c828d003-6213-4464-aa38-6c5d10a0aa9a';
const systemTenant = '00000000-0000-0000-0000-000000000001';

async function run() {
  try {
    console.log('1. Backfilling imoveis with NULL tenant_id to system tenant...');
    await pool.query("UPDATE imoveis SET tenant_id = $1 WHERE tenant_id IS NULL", [systemTenant]);

    console.log('2. Redeclaring provision_tenant_catalogs function...');
    const fs = require('fs');
    const path = require('path');
    const sql = fs.readFileSync(path.join(__dirname, '../database/migrations/208_provision_tenant_catalogs_fn.sql'), 'utf8');
    await pool.query(sql);

    console.log(`3. Provisioning catalogs for tenant ${tenantId}...`);
    await pool.query("SELECT provision_tenant_catalogs($1)", [tenantId]);

    console.log('4. Moving 5 properties to the user tenant and enabling highlights for testing...');
    const properties = await pool.query("SELECT id FROM imoveis WHERE tenant_id = $1 LIMIT 5", [systemTenant]);
    for (const row of properties.rows) {
      await pool.query("UPDATE imoveis SET tenant_id = $1, destaque = true, destaque_nacional = true, estado_fk = 'SP' WHERE id = $2", [tenantId, row.id]);
    }

    console.log('Done!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

run();
