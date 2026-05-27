
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '15432'),
  ssl: false
});

async function run() {
  const query = process.argv[2];
  try {
    const result = await pool.query(query);
    console.log(JSON.stringify(result.rows, null, 2));
  } catch (err) {
    console.error(err.message);
  } finally {
    await pool.end();
  }
}

run();
