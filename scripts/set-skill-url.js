const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '15432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function run() {
  try {
    await pool.query(
      "UPDATE system_features SET url = '/admin/skills/brainstorming' WHERE slug = 'brainstorming-sync' OR name = 'Creative Brainstorming Core'"
    );
    console.log('✅ URL da Skill definida para /admin/skills/brainstorming');
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
