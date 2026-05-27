const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres', host: '127.0.0.1', database: 'net_imobiliaria', password: 'postgres', port: 15432,
});

async function fixMaster() {
  try {
    // 1. Achar o ID do perfil Master real
    const roleRes = await pool.query("SELECT id, name FROM user_roles WHERE is_system_role = true LIMIT 1");
    if (roleRes.rows.length === 0) {
      console.log('ERRO: Nenhum perfil com is_system_role = true encontrado!');
      return;
    }
    const roleId = roleRes.rows[0].id;
    console.log(`Perfil Master encontrado: ${roleRes.rows[0].name} (${roleId})`);

    // 2. Achar seu usuário
    const userRes = await pool.query("SELECT id FROM users WHERE username = 'alexandre' OR email ILIKE '%alexandre%' LIMIT 1");
    if (userRes.rows.length === 0) {
       console.log('Usuário Alexandre não encontrado');
       return;
    }
    const userId = userRes.rows[0].id;

    // 3. Vincular
    console.log(`Vinculando usuário ${userId} ao perfil ${roleId}...`);
    await pool.query(`
      INSERT INTO user_role_assignments (user_id, role_id) 
      VALUES ($1, $2) 
      ON CONFLICT DO NOTHING
    `, [userId, roleId]);
    
    console.log('✅ Usuário vinculado com sucesso! Agora você é Master oficial.');

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
    process.exit(0);
  }
}
fixMaster();
