const { Client } = require('pg');

async function run() {
  const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'net_imobiliaria',
    password: 'postgres',
    port: 15432,
  });

  const tables = [
    'system_segments',
    'system_modules',
    'system_segment_modules',
    'system_features',
    'system_feature_modules',
    'system_categorias',
    'tenant_modules',
    'tenant_feature_overrides'
  ];

  try {
    await client.connect();
    
    for (const table of tables) {
      console.log(`--- ${table} ---`);
      const res = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = '${table}' 
        ORDER BY ordinal_position
      `);
      console.table(res.rows);
    }

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
