const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres', host: '127.0.0.1', database: 'net_imobiliaria', password: 'postgres', port: 15432,
});

async function check() {
  try {
    const res = await pool.query(`
      SELECT sc.name, sm.name as module_name, sm.is_system_module
      FROM system_categorias sc
      LEFT JOIN system_modules sm ON sc.module_id = sm.id
      WHERE sc.name IN ('Master Governance', 'Habilidades')
    `);
    console.table(res.rows);
  } finally {
    await pool.end();
    process.exit(0);
  }
}
check();
