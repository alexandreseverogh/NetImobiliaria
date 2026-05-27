const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '15432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function listAllTenants() {
  try {
    const res = await pool.query("SELECT id, name, created_at FROM tenants ORDER BY created_at DESC LIMIT 10");
    console.log('📋 Últimos 10 Tenants:');
    res.rows.forEach(t => console.log(`- [${t.created_at}] ${t.name} (ID: ${t.id})`));
  } catch (err) {
    console.error('Erro:', err);
  } finally {
    await pool.end();
  }
}

listAllTenants();
