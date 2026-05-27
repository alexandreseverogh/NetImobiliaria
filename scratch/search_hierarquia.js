const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:15432/net_imobiliaria' });

async function search() {
  const res = await pool.query("SELECT * FROM system_features WHERE url LIKE '%hierarquia%' OR name LIKE '%Hierarquia%'");
  console.table(res.rows);
  const res2 = await pool.query("SELECT * FROM sidebar_menu_items WHERE url LIKE '%hierarquia%' OR name LIKE '%Hierarquia%'");
  console.table(res2.rows);
  await pool.end();
}

search();
