const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'net_imobiliaria',
  password: 'postgres',
  port: 15432,
});

async function restoreUrl() {
  try {
    const res = await pool.query(`
      UPDATE system_features 
      SET url = '/admin/proprietarios' 
      WHERE slug = 'proprietarios'
    `);
    console.log('✅ URL de Proprietários restaurada com sucesso!');
    console.log(`Linhas afetadas: ${res.rowCount}`);
  } catch (err) {
    console.error('❌ Erro ao restaurar URL:', err);
  } finally {
    await pool.end();
  }
}

restoreUrl();
