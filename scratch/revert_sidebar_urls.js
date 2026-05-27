const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:15432/net_imobiliaria' });

async function run() {
  try {
    const res1 = await pool.query("UPDATE sidebar_menu_items SET url = '/admin/parametros' WHERE url = '/admin/parametros-imoveis'");
    console.log(`✅ Sidebar URLs reverted (smi: ${res1.rowCount})`);
  } catch (e) {
    console.error('❌ Failed:', e);
  } finally {
    await pool.end();
  }
}

run();
