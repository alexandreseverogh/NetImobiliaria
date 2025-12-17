require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function checkUsers() {
  console.log('🔍 Verificando usuários no banco...\n');

  try {
    const query = `
      SELECT 
        u.id,
        u.username,
        u.email,
        u.nome,
        u.ativo,
        ur.name as role_name,
        ur.level as role_level
      FROM users u
      JOIN user_role_assignments ura ON u.id = ura.user_id
      JOIN user_roles ur ON ura.role_id = ur.id
      ORDER BY u.created_at DESC
    `;
    
    const result = await pool.query(query);
    
    console.log(`👥 Usuários encontrados (${result.rows.length} total):\n`);
    
    result.rows.forEach((user, index) => {
      console.log(`${index + 1}. ${user.username} (${user.nome})`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Perfil: ${user.role_name} (Nível ${user.role_level})`);
      console.log(`   Ativo: ${user.ativo ? 'Sim' : 'Não'}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

checkUsers();


