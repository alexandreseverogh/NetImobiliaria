const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:15432/net_imobiliaria' });

async function run() {
  try {
    await pool.query("UPDATE role_permissions SET resource = 'parametros_imoveis' WHERE resource = 'parametros'");
    console.log('✅ Role Permissions updated');
  } catch (e) {
    console.error('❌ Role Permissions update failed:', e);
  } finally {
    await pool.end();
  }
}

run();
