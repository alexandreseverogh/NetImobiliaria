const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres', host: '127.0.0.1', database: 'net_imobiliaria', password: 'postgres', port: 15432,
});

async function checkDb() {
  try {
    const res1 = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'system_modules'");
    console.log('system_modules:', res1.rows.map(r => r.column_name).join(', '));
    
    const res2 = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'system_segment_modules'");
    console.log('system_segment_modules:', res2.rows.map(r => r.column_name).join(', '));
    
    const res3 = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_name LIKE '%segment%'");
    console.log('Segment Tables:', res3.rows.map(r => r.table_name).join(', '));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
    process.exit(0);
  }
}
checkDb();
