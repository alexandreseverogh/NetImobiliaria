const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function cleanup() {
  const pool = new Pool({
    user: process.env.DB_USER,
    host: '127.0.0.1',
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT),
  });

  try {
    console.log('🧹 Iniciando limpeza da coluna legada...');
    await pool.query('ALTER TABLE tenants DROP COLUMN IF EXISTS segment;');
    console.log('✅ Coluna redundant "segment" removida com sucesso de "tenants"!');
  } catch (err) {
    console.error('❌ Erro ao remover coluna:', err.message);
  } finally {
    await pool.end();
  }
}

cleanup();
