const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'Roberto@2007',
  database: 'net_imobiliaria',
});

async function testAdminLoginPermissions() {
  const client = await pool.connect();
  try {
    console.log('🔍 Testando permissões do admin no login...\n');
    
    // 1. Buscar dados do admin
    const adminQuery = `
      SELECT 
        u.id, u.username, u.email, u.nome, u.ativo,
        ur.name as role_name, ur.description as role_description, ur.level as role_level
      FROM users u
      LEFT JOIN user_role_assignments ura ON u.id = ura.user_id
      LEFT JOIN user_roles ur ON ura.role_id = ur.id
      WHERE u.username = 'admin'
    `;
    
    const adminResult = await client.query(adminQuery);
    
    if (adminResult.rows.length === 0) {
      console.log('❌ Usuário admin não encontrado');
      return;
    }
    
    const admin = adminResult.rows[0];
    console.log('👤 Dados do admin:');
    console.log(`   ID: ${admin.id}`);
    console.log(`   Username: ${admin.username}`);
    console.log(`   Ativo: ${admin.ativo}`);
    console.log(`   Perfil: ${admin.role_name || 'Sem perfil'}`);
    
    // 2. Simular a query de permissões do login
    const permissionsQuery = `
      SELECT 
        sf.category as resource,
        CASE 
          WHEN p.action = 'create' OR p.action = 'update' THEN 'WRITE'
          WHEN p.action = 'delete' THEN 'DELETE'
          WHEN p.action = 'read' OR p.action = 'list' THEN 'READ'
          WHEN p.action = 'admin' THEN 'ADMIN'
          ELSE p.action
        END as permission_level
      FROM users u
      JOIN user_role_assignments ura ON u.id = ura.user_id
      JOIN role_permissions rp ON ura.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      JOIN system_features sf ON p.feature_id = sf.id
      WHERE u.id = $1 
        AND u.ativo = true
        AND ura.role_id IN (
          SELECT id FROM user_roles WHERE is_active = true
        )
        AND sf.is_active = true
      ORDER BY sf.category, p.action
    `;
    
    const permissionsResult = await client.query(permissionsQuery, [admin.id]);
    
    console.log('\n📋 Permissões encontradas:');
    permissionsResult.rows.forEach(row => {
      console.log(`   ${row.resource}: ${row.permission_level}`);
    });
    
    // 3. Organizar permissões como no login
    const permissionsMap = {};
    permissionsResult.rows.forEach(row => {
      const { resource, permission_level } = row;
      if (!permissionsMap[resource] || getPermissionLevel(permission_level) > getPermissionLevel(permissionsMap[resource])) {
        permissionsMap[resource] = permission_level;
      }
    });
    
    console.log('\n🗂️ Permissões organizadas:');
    Object.entries(permissionsMap).forEach(([resource, level]) => {
      console.log(`   ${resource}: ${level}`);
    });
    
    // 4. Verificar especificamente permissão de usuários
    console.log('\n🎯 Verificação específica para usuários:');
    const userPermission = permissionsMap['usuarios'];
    console.log(`   Permissão para 'usuarios': ${userPermission || 'NÃO ENCONTRADA'}`);
    
    if (userPermission) {
      console.log(`   ✅ Admin tem permissão ${userPermission} para usuários`);
      console.log(`   ✅ Pode editar: ${['WRITE', 'DELETE', 'ADMIN'].includes(userPermission) ? 'SIM' : 'NÃO'}`);
    } else {
      console.log(`   ❌ Admin NÃO tem permissão para usuários`);
    }
    
    // 5. Verificar se perfil está ativo
    const roleActiveQuery = `
      SELECT is_active FROM user_roles ur
      JOIN user_role_assignments ura ON ur.id = ura.role_id
      WHERE ura.user_id = $1
    `;
    
    const roleActiveResult = await client.query(roleActiveQuery, [admin.id]);
    
    console.log('\n🔍 Status do perfil:');
    if (roleActiveResult.rows.length > 0) {
      console.log(`   Perfil ativo: ${roleActiveResult.rows[0].is_active ? 'SIM' : 'NÃO'}`);
    } else {
      console.log('   ❌ Nenhum perfil atribuído ao admin');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

// Função auxiliar para determinar o nível de permissão (copiada do login)
function getPermissionLevel(permission) {
  const levels = {
    'READ': 1,
    'WRITE': 2,
    'DELETE': 3,
    'ADMIN': 4
  };
  
  return levels[permission] || 0;
}

testAdminLoginPermissions();


