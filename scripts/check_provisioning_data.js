const { Client } = require('pg');

async function run() {
  const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'net_imobiliaria',
    password: 'postgres',
    port: 15432,
  });

  try {
    await client.connect();
    
    console.log('--- Sample Segments ---');
    const segments = await client.query('SELECT id, name FROM system_segments LIMIT 5');
    console.table(segments.rows);

    console.log('--- Sample Modules ---');
    const modules = await client.query('SELECT id, name FROM system_modules LIMIT 5');
    console.table(modules.rows);

    console.log('--- Sample Features ---');
    const features = await client.query('SELECT id, name FROM system_features LIMIT 5');
    console.table(features.rows);

    console.log('--- Segment-Module Links ---');
    const smLinks = await client.query('SELECT segment_id, module_id FROM system_segment_modules LIMIT 5');
    console.table(smLinks.rows);

    console.log('--- Module-Feature Links ---');
    const mfLinks = await client.query('SELECT module_id, feature_id FROM system_feature_modules LIMIT 5');
    console.table(mfLinks.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
