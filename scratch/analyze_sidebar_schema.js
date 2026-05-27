const pool = require('./src/lib/database/connection');

async function listSchema() {
  try {
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    console.log('--- TABLES ---');
    console.log(tables.rows.map(r => r.table_name).join(', '));

    const columns = await pool.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND (table_name = 'functionalities' OR table_name = 'system_functionalities' OR table_name = 'categories' OR table_name = 'system_categorias')
      ORDER BY table_name, ordinal_position
    `);
    console.log('\n--- KEY COLUMNS ---');
    console.table(columns.rows);

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

listSchema();
