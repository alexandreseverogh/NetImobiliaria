const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'net_imobiliaria',
  password: 'Roberto@2007',
  port: 5432,
});

async function debugFinalStructure() {
  try {
    console.log('🔍 Verificando estrutura final das tabelas...');
    
    // Verificar usuários ativos
    const users = await pool.query(`
      SELECT id, username, email, ativo
      FROM users
      WHERE ativo = true
      ORDER BY username
    `);
    
    console.log('\n👥 Usuários ativos:');
    users.rows.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.username} (${user.email}) - ID: ${user.id}`);
    });
    
    // Verificar roles
    const roles = await pool.query(`
      SELECT id, name, description, level
      FROM user_roles
      WHERE is_active = true
      ORDER BY level DESC
    `);
    
    console.log('\n🎭 Roles ativas:');
    roles.rows.forEach((role, index) => {
      console.log(`  ${index + 1}. ${role.name} (${role.description}) - Level: ${role.level} - ID: ${role.id}`);
    });
    
    // Verificar user_role_assignments
    const assignments = await pool.query(`
      SELECT user_id, role_id
      FROM user_role_assignments
      LIMIT 5
    `);
    
    console.log('\n🔗 User-Role assignments:');
    assignments.rows.forEach((assign, index) => {
      console.log(`  ${index + 1}. User: ${assign.user_id}, Role: ${assign.role_id}`);
    });
    
    // Verificar permissões para login-logs
    const permissions = await pool.query(`
      SELECT 
        p.id,
        p.action,
        p.description,
        p.resource
      FROM permissions p
      WHERE p.resource = 'login-logs'
      ORDER BY p.action
    `);
    
    console.log('\n🔐 Permissões para login-logs:');
    permissions.rows.forEach((perm, index) => {
      console.log(`  ${index + 1}. ${perm.action} - ${perm.description} (${perm.resource})`);
    });
    
    // Verificar role_permissions para login-logs
    const rolePermissions = await pool.query(`
      SELECT 
        rp.role_id,
        r.name as role_name,
        p.action,
        p.resource
      FROM role_permissions rp
      JOIN permissions p ON rp.permission_id = p.id
      JOIN user_roles r ON rp.role_id = r.id
      WHERE p.resource = 'login-logs'
      ORDER BY r.name, p.action
    `);
    
    console.log('\n🔗 Role-Permission assignments para login-logs:');
    rolePermissions.rows.forEach((rp, index) => {
      console.log(`  ${index + 1}. Role: ${rp.role_name} (${rp.role_id}) - Action: ${rp.action}`);
    });
    
    // Verificar funcionalidade login-logs no system_features
    const feature = await pool.query(`
      SELECT id, name, resource, type, active
      FROM system_features
      WHERE resource = 'login-logs' OR name ILIKE '%login%log%'
    `);
    
    console.log('\n⚙️ Funcionalidades relacionadas a login-logs:');
    feature.rows.forEach((feat, index) => {
      console.log(`  ${index + 1}. ${feat.name} (${feat.resource}) - Type: ${feat.type} - Active: ${feat.active}`);
    });
    
    // Testar a função userHasPermission para um usuário específico
    if (users.rows.length > 0) {
      const testUser = users.rows[0];
      console.log(`\n🧪 Testando permissões para usuário: ${testUser.username} (${testUser.id})`);
      
      // Verificar se o usuário tem role
      const userRole = await pool.query(`
        SELECT r.name, r.level
        FROM user_role_assignments ura
        JOIN user_roles r ON ura.role_id = r.id
        WHERE ura.user_id = $1
      `, [testUser.id]);
      
      if (userRole.rows.length > 0) {
        console.log(`  Role do usuário: ${userRole.rows[0].name} (Level: ${userRole.rows[0].level})`);
        
        // Verificar permissões diretas
        const userPermissions = await pool.query(`
          SELECT p.action, p.resource
          FROM role_permissions rp
          JOIN permissions p ON rp.permission_id = p.id
          WHERE rp.role_id IN (
            SELECT role_id FROM user_role_assignments WHERE user_id = $1
          )
          AND p.resource = 'login-logs'
        `, [testUser.id]);
        
        console.log(`  Permissões para login-logs: ${userPermissions.rows.length}`);
        userPermissions.rows.forEach((perm, index) => {
          console.log(`    ${index + 1}. ${perm.action} (${perm.resource})`);
        });
      } else {
        console.log('  ❌ Usuário não tem role atribuída');
      }
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

debugFinalStructure();




