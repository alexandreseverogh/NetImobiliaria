const pool = require('./src/lib/database/connection');
require('dotenv').config({ path: '.env.local' });

async function checkSchema() {
  try {
    console.log('--- COLUNAS DAS TABELAS ---');
    const res = await pool.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name IN ('clientes', 'proprietarios') 
      ORDER BY table_name, ordinal_position
    `);
    
    const tables = {};
    res.rows.forEach(row => {
      if (!tables[row.table_name]) tables[row.table_name] = [];
      tables[row.table_name].push(`${row.column_name} (${row.data_type})`);
    });
    
    console.log(JSON.stringify(tables, null, 2));
  } catch (err) {
    console.error('Erro:', err.message);
  } finally {
    process.exit(0);
  }
}

checkSchema();
