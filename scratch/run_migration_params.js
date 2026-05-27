const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:15432/net_imobiliaria' });

async function run() {
  try {
    // 1. Rename table
    await pool.query('ALTER TABLE parametros RENAME TO parametros_imoveis');
    
    // 2. Update system_features
    await pool.query("UPDATE system_features SET slug = 'parametros_imoveis', name = 'Parâmetros Imóveis' WHERE slug = 'parametros'");
    
    console.log('✅ DB Migration successful');
  } catch (e) {
    console.error('❌ DB Migration failed:', e);
  } finally {
    await pool.end();
  }
}

run();
