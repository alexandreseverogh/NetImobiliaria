const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'net_imobiliaria',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Roberto@2007',
});

async function executeAutoPurge() {
  try {
    console.log(`[${new Date().toISOString()}] Iniciando expurgo automático...`);
    
    await pool.query('SELECT auto_purge_login_logs()');
    
    console.log(`[${new Date().toISOString()}] Expurgo automático executado com sucesso`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ERRO no expurgo automático:`, error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

executeAutoPurge();
