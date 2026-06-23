const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({ connectionString: process.env.MARKETING_DATABASE_URL });

async function run() {
  const sql = fs.readFileSync(
    path.join(__dirname, '../prisma/migration-2026-06-22-imagens-por-ia.sql'),
    'utf8'
  );
  try {
    await pool.query(sql);
    console.log('✅ Migration executada com sucesso');
  } catch (err) {
    console.error('❌ Erro:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
