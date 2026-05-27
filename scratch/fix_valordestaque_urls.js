const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:15432/net_imobiliaria' });

async function run() {
  try {
    const res1 = await pool.query("UPDATE system_features SET url = '/admin/valoresdestaque' WHERE url = '/admin/valordestaque'");
    const res2 = await pool.query("UPDATE sidebar_menu_items SET url = '/admin/valoresdestaque' WHERE url = '/admin/valordestaque'");
    console.log(`✅ Valordestaque URLs fixed to plural (sf: ${res1.rowCount}, smi: ${res2.rowCount})`);
  } catch (e) {
    console.error('❌ Failed:', e);
  } finally {
    await pool.end();
  }
}

run();
