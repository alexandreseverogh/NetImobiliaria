const pool = require('./src/lib/database/connection').pool;

async function checkTenants() {
  try {
    const result = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'tenants'");
    console.log('--- COLUNAS DE tenants ---');
    console.log(JSON.stringify(result.rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('Erro:', err);
    process.exit(1);
  }
}

checkTenants();
