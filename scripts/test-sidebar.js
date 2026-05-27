const { pool } = require('../src/lib/database/connection');

async function check() {
  try {
    const userRes = await pool.query(`SELECT id, username, tenant_id, role, perfis_id FROM users WHERE username = 'admdm'`);
    const user = userRes.rows[0];
    console.log("User:", user);
    
    if (!user) return;

    const tenantRes = await pool.query(`SELECT id, name, slug FROM system_tenants WHERE id = $1`, [user.tenant_id]);
    console.log("Tenant:", tenantRes.rows[0]);

    const overridesRes = await pool.query(`SELECT * FROM tenant_feature_overrides WHERE tenant_id = $1`, [user.tenant_id]);
    console.log("Tenant Overrides (provisioned features):", overridesRes.rows.map(r => r.feature_id));

    const perfisRes = await pool.query(`SELECT * FROM perfis WHERE id = $1`, [user.perfis_id]);
    console.log("Perfil:", perfisRes.rows[0]?.name);
    console.log("Perfil Permissions:", perfisRes.rows[0]?.permissions);

  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
check();
