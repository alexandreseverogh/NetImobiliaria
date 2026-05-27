/**
 * UTILITÁRIO PARA EXECUTAR SQL MANUALMENTE
 * Uso: node scripts/run-sql.js <caminho_do_arquivo>
 */
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const poolConfig = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '15432'),
  ssl: false
};

const pool = new Pool(poolConfig);

async function runSql() {
  const sqlFile = process.argv[2] || 'database/migrations/060_crm_foundation_schema.sql';
  const filePath = path.join(process.cwd(), sqlFile);

  if (!fs.existsSync(filePath)) {
    console.error(`❌ Arquivo não encontrado: ${filePath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(filePath, 'utf8');

  console.log(`🚀 Executando SQL: ${sqlFile}...`);
  
  try {
    await pool.query(sql);
    console.log('✅ SQL executado com sucesso!');
  } catch (err) {
    console.error('❌ Erro ao executar SQL:', err.message);
  } finally {
    await pool.end();
  }
}

runSql();
