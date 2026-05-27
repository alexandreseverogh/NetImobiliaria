const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:15432/net_imobiliaria' });

async function run() {
  try {
    await pool.query(`
      UPDATE sidebar_menu_items 
      SET resource = 'parametros_imoveis', 
          permission_required = 'parametros_imoveis',
          name = CASE WHEN name = 'Parâmetros' THEN 'Parâmetros Imóveis' ELSE name END
      WHERE feature_id = 54 OR resource = 'parametros' OR permission_required = 'parametros'
    `);
    console.log('✅ Sidebar updated');
  } catch (e) {
    console.error('❌ Sidebar update failed:', e);
  } finally {
    await pool.end();
  }
}

run();
