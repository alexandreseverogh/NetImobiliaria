const { Client } = require('pg');

async function run() {
  const tableName = process.argv[2];
  if (!tableName) {
    console.error('Please provide a table name');
    return;
  }
  const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'net_imobiliaria',
    password: 'postgres',
    port: 15432,
  });

  try {
    await client.connect();
    
    console.log(`--- ${tableName} ---`);
    const schema = await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position`, [tableName]);
    console.table(schema.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
