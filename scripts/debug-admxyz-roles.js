const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '15432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function findMembership() {
  try {
    const user = await pool.query("SELECT id FROM users WHERE username = 'admxyz'");
    if (user.rows.length === 0) throw new Error('User not found');
    const userId = user.id;

    console.log('--- USER TENANT MEMBERSHIP ---');
    const membership = await pool.query(`
      SELECT utm.tenant_id, t.name as tenant_name, utm.role_id, r.name as role_name
      FROM user_tenant_membership utm
      JOIN tenants t ON utm.tenant_id = t.id
      LEFT JOIN user_roles r ON utm.role_id = r.id
      WHERE utm.user_id = (SELECT id FROM users WHERE username = 'admxyz')
    `);
    console.table(membership.rows);

    console.log('--- GLOBAL ASSIGNMENTS ---');
    const global = await pool.query(`
      SELECT ura.role_id, r.name as role_name, r.is_system_role
      FROM user_role_assignments ura
      JOIN user_roles r ON ura.role_id = r.id
      WHERE ura.user_id = (SELECT id FROM users WHERE username = 'admxyz')
    `);
    console.table(global.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

findMembership();
