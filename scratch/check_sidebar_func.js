const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres', host: '127.0.0.1', database: 'net_imobiliaria', password: 'postgres', port: 15432,
});

async function check() {
  try {
    const res = await pool.query(`
      SELECT pg_get_functiondef(oid) 
      FROM pg_proc 
      WHERE proname = 'get_sidebar_menu_for_user'
    `);
    console.log(res.rows[0].pg_get_functiondef);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
    process.exit(0);
  }
}
check();
