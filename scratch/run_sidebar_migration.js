const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configurações extraídas do seu .env.local
const pool = new Pool({
  user: 'postgres',
  host: '127.0.0.1',
  database: 'net_imobiliaria',
  password: 'postgres',
  port: 15432,
});

async function migrate() {
  try {
    const sqlPath = path.join(__dirname, '../database/migrate_sidebar_surgery.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('🚀 Iniciando migração da Sidebar...');
    await pool.query(sql);
    console.log('✅ Função get_sidebar_menu_for_user atualizada com sucesso!');

  } catch (err) {
    console.error('❌ Erro na migração:', err);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

migrate();
