const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@localhost:15432/net_imobiliaria', // assuming local configs
});

async function run() {
  try {
    await pool.query("UPDATE system_modules SET is_active = true WHERE slug = 'crm'");
    console.log("Módulo CRM reativado no catálogo global.");

    const res = await pool.query(`
      INSERT INTO tenant_modules (tenant_id, module_id, is_enabled)
      SELECT tenants.id, system_modules.id, true
      FROM tenants
      CROSS JOIN system_modules
      WHERE tenants.name ILIKE '%XYZ%' AND system_modules.slug = 'crm'
      ON CONFLICT (tenant_id, module_id) DO UPDATE SET is_enabled = true
    `);
    
    console.log("Módulo CRM devolvido para a Imobiliária XYZ.");

  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}

run();
