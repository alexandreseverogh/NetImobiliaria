const { Client } = require('pg');

async function run() {
  const client = new Client({
    user: 'postgres', host: 'localhost', database: 'net_imobiliaria', password: 'postgres', port: 15432,
  });

  try {
    await client.connect();
    
    console.log('--- Entities ---');
    const entities = await client.query('SELECT * FROM system_metadata_entities');
    console.table(entities.rows);

    console.log('--- Fields (Sample) ---');
    const fields = await client.query('SELECT * FROM system_metadata_fields LIMIT 5');
    console.table(fields.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
