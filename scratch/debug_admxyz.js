const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres', host: '127.0.0.1', database: 'net_imobiliaria', password: 'postgres', port: 15432,
});

async function debug() {
  try {
    // 1. Identificar o ID do usuário admxyz
    const userRes = await pool.query("SELECT id, nome FROM users WHERE username = 'admxyz'");
    if (userRes.rows.length === 0) {
      console.log('Usuário admxyz não encontrado');
      return;
    }
    const userId = userRes.rows[0].id;
    console.log(`DEBUG: Usuário ${userRes.rows[0].nome} (${userId})`);

    // 2. Ver quais perfis ele tem
    const rolesRes = await pool.query(`
      SELECT ur.id, ur.name, ur.is_system_role 
      FROM user_role_assignments ura
      JOIN user_roles ur ON ura.role_id = ur.id
      WHERE ura.user_id = $1
    `, [userId]);
    console.log('PERFIS DO USUÁRIO:', rolesRes.rows);

    // 3. Ver quantas permissões ele tem vinculadas
    const permRes = await pool.query(`
      SELECT count(*) as total
      FROM user_role_assignments ura
      JOIN role_permissions rp ON ura.role_id = rp.role_id
      WHERE ura.user_id = $1
    `, [userId]);
    console.log('TOTAL DE PERMISSÕES VINCULADAS:', permRes.rows[0].total);

    // 4. Ver se os módulos estão habilitados para o tenant dele
    const tenantRes = await pool.query(`
      SELECT tm.module_id, sm.name, tm.is_enabled
      FROM tenant_modules tm
      JOIN system_modules sm ON tm.module_id = sm.id
      WHERE tm.tenant_id = (SELECT tenant_id FROM user_tenant_mapping WHERE user_id = $1 LIMIT 1)
    `, [userId]);
    console.log('MÓDULOS HABILITADOS PARA O TENANT:', tenantRes.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
    process.exit(0);
  }
}
debug();
