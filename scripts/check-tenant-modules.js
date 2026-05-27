const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@localhost:15432/net_imobiliaria', // assuming local configs
});

async function run() {
  try {
    const t = await pool.query("SELECT id, name FROM tenants WHERE name ILIKE '%XYZ%' OR slug ILIKE '%xyz%'");
    console.log("Tenants found:", t.rows);

    if(t.rows.length > 0) {
       const tenantId = t.rows[0].id;
       const tm = await pool.query(`
         SELECT sm.name, sm.slug, tm.is_enabled 
         FROM tenant_modules tm
         JOIN system_modules sm ON tm.module_id = sm.id
         WHERE tm.tenant_id = $1
       `, [tenantId]);
       console.log("Current Modules for Tenant:", tm.rows);
       
       const allModules = await pool.query('SELECT id, name, slug FROM system_modules');
       console.log("All Modules in system:", allModules.rows);
    }
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}

run();
