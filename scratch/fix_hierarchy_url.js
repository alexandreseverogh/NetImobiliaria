const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:15432/net_imobiliaria' });

async function run() {
  try {
    const res = await pool.query("UPDATE sidebar_menu_items SET url = '/admin/hierarquia-perfis' WHERE url = '/admin/perfis-hierarquias'");
    console.log(`✅ Sidebar Hierarchy URL fixed (smi: ${res.rowCount})`);
  } catch (e) {
    console.error('❌ Failed:', e);
  } finally {
    await pool.end();
  }
}

run();
