const pool = require('./src/lib/database/connection').default;

async function checkSchema() {
  const client = await pool.connect();
  try {
    console.log('Checking activity_logs schema...');
    const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'activity_logs'
    `);
    console.table(res.rows);

    console.log('\nChecking user_preferences schema...');
    const res2 = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'user_preferences'
    `);
    console.table(res2.rows);
  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    process.exit();
  }
}

checkSchema();
