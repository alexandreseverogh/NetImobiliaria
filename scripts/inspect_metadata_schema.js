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
    'system_metadata_entities',
    'system_metadata_fields',
    'system_metadata_options'
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
