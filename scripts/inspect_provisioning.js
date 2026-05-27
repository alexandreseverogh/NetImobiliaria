const { Client } = require('pg');

async function run() {
  const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'net_imobiliaria',
    password: 'postgres',
    port: 15432,
  });

  const tables = ['tenants', 'segments', 'system_modules', 'system_features', 'tenant_modules', 'tenant_feature_overrides', 'module_features'];

  try {
    await client.connect();
    
    for (const table of tables) {
      console.log(`--- ${table} ---`);
      const res = await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${table}' ORDER BY ordinal_position`);
      if (res.rows.length > 0) {
        console.table(res.rows);
      } else {
        console.log(`Table '${table}' not found or has no columns.`);
      }
    }

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
