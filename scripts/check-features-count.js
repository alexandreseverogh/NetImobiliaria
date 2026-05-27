const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '15432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function checkFeatures() {
  try {
    const res = await pool.query('SELECT COUNT(id) FROM system_features');
    console.log(`📦 Total de Funcionalidades no Banco: ${res.rows[0].count}`);
    
    if (parseInt(res.rows[0].count) === 0) {
      console.log('⚠️ ALERTA: O banco de dados de funcionalidades está VAZIO!');
    }
  } catch (err) {
    console.error('Erro ao consultar banco:', err);
  } finally {
    await pool.end();
  }
}

checkFeatures();
