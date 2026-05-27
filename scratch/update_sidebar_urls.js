const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:15432/net_imobiliaria' });

async function run() {
  try {
    await pool.query("UPDATE sidebar_menu_items SET url = '/admin/parametros-imoveis' WHERE url = '/admin/parametros'");
    console.log('✅ Sidebar URLs updated');
  } catch (e) {
    console.error('❌ Sidebar URLs update failed:', e);
  } finally {
    await pool.end();
  }
}

run();
