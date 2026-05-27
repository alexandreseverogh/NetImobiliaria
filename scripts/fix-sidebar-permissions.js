const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  port: 15432,
  database: 'net_imobiliaria',
  user: 'postgres',
  password: 'postgres'
});

async function run() {
  try {
    // 1. Vincular itens da "Ponto Zero" (Master Hub)
    const res1 = await pool.query(`
      UPDATE sidebar_menu_items 
      SET permission_required = 'master-provisioning-hub' 
      WHERE (url LIKE '/admin/master/%' OR url = '/admin/master')
        AND (permission_required IS NULL OR permission_required = '')
    `);
    console.log(`Updated ${res1.rowCount} master items to 'master-provisioning-hub'`);

    // 2. Vincular itens específicos se ainda estiverem órfãos
    const res2 = await pool.query(`
      UPDATE sidebar_menu_items 
      SET permission_required = 'master-modules' 
      WHERE url = '/admin/modules' 
        AND (permission_required IS NULL OR permission_required = '')
    `);
    console.log(`Updated ${res2.rowCount} module items to 'master-modules'`);

    const res3 = await pool.query(`
      UPDATE sidebar_menu_items 
      SET permission_required = 'master-segments' 
      WHERE url = '/admin/segments' 
        AND (permission_required IS NULL OR permission_required = '')
    `);
    console.log(`Updated ${res3.rowCount} segment items to 'master-segments'`);

    // 3. Verificar se ainda tem algo do Master exposto
    const check = await pool.query(`
      SELECT id, name, url 
      FROM sidebar_menu_items 
      WHERE (url LIKE '/admin/master/%' OR name LIKE '%Master%')
        AND (permission_required IS NULL OR permission_required = '')
    `);
    
    if (check.rows.length > 0) {
      console.log('⚠️ Warning: Still found exposed master items:', check.rows);
    } else {
      console.log('✅ All master items are now protected by permissions.');
    }

  } catch (err) {
    console.error('Error updating sidebar units:', err);
  } finally {
    await pool.end();
  }
}

run();
