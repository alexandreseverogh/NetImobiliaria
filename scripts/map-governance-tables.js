const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '15432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function mapTables() {
  try {
    const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
    console.table(res.rows.filter(r => r.table_name.includes('segment') || r.table_name.includes('module') || r.table_name.includes('feature')));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

mapTables();
