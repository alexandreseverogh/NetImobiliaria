const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres', host: '127.0.0.1', database: 'net_imobiliaria', password: 'postgres', port: 15432,
});

async function check() {
  try {
    const res = await pool.query(`
      SELECT u.username, ur.name as role_name, ur.is_system_role, 'Tenant' as scope
      FROM users u
      JOIN user_tenant_membership utm ON u.id = utm.user_id
      JOIN user_roles ur ON utm.role_id = ur.id
      WHERE u.username = 'admxyz'
      UNION ALL
      SELECT u.username, ur.name as role_name, ur.is_system_role, 'Global' as scope
      FROM users u
      JOIN user_role_assignments ura ON u.id = ura.user_id
      JOIN user_roles ur ON ura.role_id = ur.id
      WHERE u.username = 'admxyz'
    `);
    console.table(res.rows);
  } finally {
    await pool.end();
    process.exit(0);
  }
}
check();
