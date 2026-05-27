const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:15432/net_imobiliaria' });

async function run() {
  try {
    const res1 = await pool.query("UPDATE system_features SET url = '/admin/valordestaque' WHERE url = '/admin/valoresdestaque'");
    const res2 = await pool.query("UPDATE sidebar_menu_items SET url = '/admin/valordestaque' WHERE url = '/admin/valoresdestaque'");
    
    // Also ensure route_permissions_config exists for both singular and plural (just in case)
    // Actually, user wants rigor, so let's use singular everywhere.
    
    // Check if feature ID 55 exists in route_permissions_config
    const res3 = await pool.query("INSERT INTO route_permissions_config (route_pattern, method, feature_id, default_action, requires_auth, is_active) VALUES ('/admin/valordestaque', 'GET', 55, 'EXECUTE', true, true), ('/api/admin/valordestaque', 'GET', 55, 'EXECUTE', true, true), ('/api/admin/valordestaque', 'PUT', 55, 'EXECUTE', true, true) ON CONFLICT (route_pattern, method) DO UPDATE SET is_active = true");

    console.log(`✅ Valordestaque URLs fixed to singular (sf: ${res1.rowCount}, smi: ${res2.rowCount}, rpc: ${res3.rowCount})`);
  } catch (e) {
    console.error('❌ Failed:', e);
  } finally {
    await pool.end();
  }
}

run();
