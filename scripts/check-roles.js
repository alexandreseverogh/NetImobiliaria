const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '15432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function checkRoles() {
  try {
    const tenantId = '883658a7-3115-4a95-92e1-5b3727156d91';
    const res = await pool.query("SELECT * FROM user_roles WHERE tenant_id = $1", [tenantId]);
    console.log(`📋 Roles for Tenant ${tenantId}:`);
    res.rows.forEach(r => console.log(`- ${r.name} (ID: ${r.id})`));
  } catch (err) {
    console.error('Erro:', err);
  } finally {
    await pool.end();
  }
}

checkRoles();
