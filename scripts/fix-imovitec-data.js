const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'net_imobiliaria',
  password: process.env.DB_PASSWORD || 'password',
  port: parseInt(process.env.DB_PORT || '15432')
});

async function run() {
  try {
    const imovitecId = '3f04ab1c-627c-4ce8-a804-aaaf91cf896a';
    const crmModuleId = 'a5e8f2df-f47f-400c-b33e-6820b9c8f6b1';
    
    await pool.query(
      "UPDATE public.tenant_modules SET is_enabled = true WHERE tenant_id = $1 AND module_id = $2",
      [imovitecId, crmModuleId]
    );
    console.log("SUCCESS: CRM Enabled for Imovitec.");
    
    // Also check if features are linked
    const featCount = await pool.query(
      "SELECT count(*) FROM public.tenant_feature_overrides WHERE tenant_id = $1 AND is_active = true",
      [imovitecId]
    );
    console.log(`INFO: Imovitec has ${featCount.rows[0].count} features active.`);
    
  } catch (err) {
    console.error("ERROR:", err);
  } finally {
    await pool.end();
  }
}

run();
