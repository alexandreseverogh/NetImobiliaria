const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'Roberto@2007',
  database: 'net_imobiliaria',
});

async function debugAdminPermissions() {
  const client = await pool.connect();
  try {
    console.log('🔍 Debugando permissões do admin para edição de usuários...\n');
    
    // 1. Buscar usuário admin
    const adminUser = await client.query(`
      SELECT 
        u.id, u.username, u.email, u.nome,
        ur.name as role_name, ur.description as role_description
      FROM users u
      LEFT JOIN user_role_assignments ura ON u.id = ura.user_id
      LEFT JOIN user_roles ur ON ura.role_id = ur.id
      WHERE u.username = 'admin'
    `);
    
    if (adminUser.rows.length === 0) {
      console.log('❌ Usuário admin não encontrado');
      return;
    }
    
    const admin = adminUser.rows[0];
    console.log('👤 Usuário admin encontrado:');
    console.log(`   ID: ${admin.id}`);
    console.log(`   Username: ${admin.username}`);
    console.log(`   Perfil: ${admin.role_name || 'Sem perfil'}`);
    
    // 2. Buscar permissões do admin para usuários
    const permissions = await client.query(`
      SELECT 
        sf.category,
        p.action,
        p.description,
        rp.granted,
        rp.granted_at
      FROM users u
      JOIN user_role_assignments ura ON u.id = ura.user_id
      JOIN role_permissions rp ON ura.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      JOIN system_features sf ON p.feature_id = sf.id
      WHERE u.username = 'admin'
        AND sf.category = 'usuarios'
      ORDER BY p.action
    `);
    
    console.log('\n📋 Permissões do admin para "usuarios":');
    if (permissions.rows.length === 0) {
      console.log('   ❌ Nenhuma permissão encontrada');
    } else {
      permissions.rows.forEach(perm => {
        console.log(`   ${perm.granted ? '✅' : '❌'} ${perm.action} - ${perm.description}`);
      });
    }
    
    // 3. Verificar se tem permissão WRITE especificamente
    const writePermission = permissions.rows.find(p => 
      p.action === 'update' || p.action === 'create'
    );
    
    console.log('\n🔍 Verificação específica para edição:');
    console.log(`   Permissão de escrita encontrada: ${writePermission ? '✅ SIM' : '❌ NÃO'}`);
    
    if (writePermission) {
      console.log(`   Tipo: ${writePermission.action}`);
      console.log(`   Concedida: ${writePermission.granted ? 'SIM' : 'NÃO'}`);
    }
    
    // 4. Verificar todas as permissões do admin
    const allPermissions = await client.query(`
      SELECT 
        sf.category,
        COUNT(*) as total_permissions,
        SUM(CASE WHEN rp.granted THEN 1 ELSE 0 END) as granted_permissions
      FROM users u
      JOIN user_role_assignments ura ON u.id = ura.user_id
      JOIN role_permissions rp ON ura.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      JOIN system_features sf ON p.feature_id = sf.id
      WHERE u.username = 'admin'
      GROUP BY sf.category
      ORDER BY sf.category
    `);
    
    console.log('\n📊 Resumo de todas as permissões do admin:');
    allPermissions.rows.forEach(perm => {
      console.log(`   ${perm.category}: ${perm.granted_permissions}/${perm.total_permissions} concedidas`);
    });
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

debugAdminPermissions();


