const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '15432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function check() {
  try {
    console.log('--- SYSTEM_CATEGORIAS ---');
    const cat = await pool.query("SELECT column_name, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'system_categorias'");
    console.table(cat.rows);

    console.log('--- SYSTEM_FEATURES ---');
    const feat = await pool.query("SELECT column_name, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'system_features'");
    console.table(feat.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

check();
