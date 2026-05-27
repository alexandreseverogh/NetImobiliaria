const pool = require('./src/lib/database/connection').pool;

async function checkColumns() {
  try {
    const result = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'system_segments'");
    console.log('--- COLUNAS DE system_segments ---');
    console.log(result.rows.map(r => r.column_name).join(', '));
    process.exit(0);
  } catch (err) {
    console.error('Erro:', err);
    process.exit(1);
  }
}

checkColumns();
