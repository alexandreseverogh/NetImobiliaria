const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres', host: '127.0.0.1', database: 'net_imobiliaria', password: 'postgres', port: 15432,
});

async function check() {
  try {
    const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'system_features'");
    console.log('COLUMNS IN SYSTEM_FEATURES:', res.rows.map(r => r.column_name).join(', '));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
    process.exit(0);
  }
}
check();
