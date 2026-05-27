const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'net_imobiliaria',
  password: process.env.DB_PASSWORD || 'password',
  port: parseInt(process.env.DB_PORT || '15432')
});

async function check() {
  try {
    const mods = await pool.query("SELECT id, name FROM public.system_modules");
    console.log("ALL SYSTEM MODULES:");
    console.table(mods.rows);

    const imovitec = await pool.query("SELECT id FROM tenants WHERE name ILIKE '%IMOVITEC%'");
    if (imovitec.rows.length > 0) {
      const id = imovitec.rows[0].id;
      console.log(`IMOVITEC ID: ${id}`);
      
      const tmods = await pool.query("SELECT module_id, is_enabled FROM tenant_modules WHERE tenant_id = $1", [id]);
      console.log("Provisioned Modules for IMOVITEC:");
      console.table(tmods.rows);

      // Join to see names
      const tmodNames = await pool.query(`
        SELECT m.name, tm.is_enabled 
        FROM tenant_modules tm 
        JOIN system_modules m ON tm.module_id = m.id 
        WHERE tm.tenant_id = $1
      `, [id]);
      console.log("Provisioned Module Names for IMOVITEC:");
      console.table(tmodNames.rows);
    }
    
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

check();
