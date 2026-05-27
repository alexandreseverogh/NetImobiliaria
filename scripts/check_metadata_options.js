const { Client } = require('pg');

async function run() {
  const client = new Client({
    user: 'postgres', host: 'localhost', database: 'net_imobiliaria', password: 'postgres', port: 15432,
  });

  try {
    await client.connect();
    
    console.log('--- Options Data ---');
    const options = await client.query('SELECT * FROM system_metadata_options');
    console.table(options.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
