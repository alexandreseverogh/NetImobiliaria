const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'net_imobiliaria',
  password: 'postgres',
  port: 15432,
});

async function checkSchema() {
  try {
    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'system_features'
    `);
    console.table(res.rows);

    const dupCheck = await pool.query(`
      SELECT id, name, COUNT(*) 
      FROM system_features 
      GROUP BY id, name 
      HAVING COUNT(*) > 1
    `);
    if (dupCheck.rows.length > 0) {
      console.log('⚠️ ALERTA: Existem IDs ou Nomes DUPLICADOS na tabela!');
      console.table(dupCheck.rows);
    } else {
      console.log('✅ Nenhuma duplicata de ID encontrada na tabela.');
    }

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkSchema();
