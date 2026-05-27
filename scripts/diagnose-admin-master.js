const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '15432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function checkAdminStatus() {
  try {
    console.log('--- DIAGNÓSTICO DE USUÁRIO MASTER ---');
    const userRes = await pool.query(`
      SELECT 
        u.id, u.username, u.email,
        ur.name as role_name, ur.level as role_level, ur.is_system_role
      FROM users u
      LEFT JOIN user_role_assignments ura ON u.id = ura.user_id
      LEFT JOIN user_roles ur ON ura.role_id = ur.id
      WHERE u.username = 'admin'
    `);

    console.table(userRes.rows);

    if (userRes.rows.length === 0) {
      console.log('❌ Usuário admin não encontrado!');
      return;
    }

    const isMaster = userRes.rows.some(r => r.is_system_role === true);
    if (!isMaster) {
      console.log('⚠️ ALERTA: O usuário admin NÃO possui o flag is_system_role=true no banco!');
      
      // Tentativa de correção se for o caso
      console.log('Tentando localizar o cargo de Administrador Master...');
      const masterRole = await pool.query("SELECT id, name FROM user_roles WHERE is_system_role = true OR name ILIKE '%Master%' LIMIT 1");
      
      if (masterRole.rows.length > 0) {
        console.log(`Cargo Master encontrado: ${masterRole.rows[0].name} (ID: ${masterRole.rows[0].id})`);
        console.log(`Para corrigir, execute: INSERT INTO user_role_assignments (user_id, role_id) VALUES ('${userRes.rows[0].id}', '${masterRole.rows[0].id}');`);
      }
    } else {
      console.log('✅ Tudo okay no banco: Usuário admin é Master.');
    }

  } catch (err) {
    console.error('Erro no diagnóstico:', err);
  } finally {
    await pool.end();
  }
}

checkAdminStatus();
