const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost', port: 15432, database: 'net_imobiliaria', user: 'postgres', password: 'postgres'
});

async function run() {
  const username = 'admxyz';
  
  // 1. O que o login faz primeiro
  const userRes = await pool.query(`
    SELECT u.id, u.username, ur.is_system_role
    FROM users u
    LEFT JOIN user_role_assignments ura ON u.id = ura.user_id
    LEFT JOIN user_roles ur ON ura.role_id = ur.id
    WHERE u.username = $1
  `, [username]);
  
  const user = userRes.rows[0];
  console.log('User Global Data:', user);

  // 2. O que o login faz depois de selecionar tenant (assumindo tenant de Imobiliária XYZ)
  const membershipRes = await pool.query(`
    SELECT ur.name, ur.is_system_role
    FROM user_tenant_membership utm
    JOIN user_roles ur ON utm.role_id = ur.id
    WHERE utm.user_id = $1
  `, [user.id]);
  
  console.log('User Membership Data:', membershipRes.rows);

  // 3. Resultado final da flag is_system_role
  const finalIsSystemRole = user.is_system_role || membershipRes.rows.some(r => r.is_system_role);
  console.log('Final is_system_role determination:', !!finalIsSystemRole);

  await pool.end();
}

run();
