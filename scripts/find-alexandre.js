const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '15432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function findAlexandre() {
  try {
    const res = await pool.query("SELECT id, nome, email, username FROM users WHERE email = 'alexandreseverog@gmail.com'");
    console.log('👤 Usuário Alexandre:', res.rows);
  } catch (err) {
    console.error('Erro:', err);
  } finally {
    await pool.end();
  }
}

findAlexandre();
