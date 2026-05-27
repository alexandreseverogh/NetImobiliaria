const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '15432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function checkRoberto() {
  try {
    const res = await pool.query("SELECT * FROM users WHERE nome ILIKE '%Roberto%'");
    console.log('👤 Usuário Roberto:', res.rows);
  } catch (err) {
    console.error('Erro:', err);
  } finally {
    await pool.end();
  }
}

checkRoberto();
