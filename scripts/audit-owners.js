const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '15432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function auditOwners() {
  try {
    const res = await pool.query(`
      SELECT t.name as tenant_name, u.nome as user_name, utm.is_owner
      FROM user_tenant_membership utm
      JOIN tenants t ON utm.tenant_id = t.id
      JOIN users u ON utm.user_id = u.id
      WHERE utm.is_owner = true
      ORDER BY t.name
    `);
    console.log('📋 Auditoria de Owners:');
    res.rows.forEach(r => console.log(`- [${r.tenant_name}] Owner: ${r.user_name}`));
  } catch (err) {
    console.error('Erro:', err);
  } finally {
    await pool.end();
  }
}

auditOwners();
