// Verificação completa das permissões do admin e super admin
const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'net_imobiliaria',
  password: 'Roberto@2007',
  port: 5432,
});

async function checkAdminPermissionsComplete() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 VERIFICAÇÃO COMPLETA DAS PERMISSÕES DO ADMIN/SUPER ADMIN...\n');
    
    // 1. Verificar funcionalidades do sistema
    console.log('1️⃣ FUNCIONALIDADES DO SISTEMA:');
    const featuresResult = await client.query(`
      SELECT id, name, description, url, is_active, category_id
      FROM system_features 
      ORDER BY name
    `);
    
    console.log(`✅ Total de funcionalidades: ${featuresResult.rows.length}`);
    featuresResult.rows.forEach(feature => {
      console.log(`   - ${feature.name} (ID: ${feature.id}, Ativa: ${feature.is_active}, Category ID: ${feature.category_id})`);
    });
    
    // 2. Verificar roles (perfis)
    console.log('\n2️⃣ ROLES (PERFIS):');
    const rolesResult = await client.query(`
      SELECT id, name, description, level, is_active
      FROM user_roles 
      ORDER BY level DESC
    `);
    
    console.log(`✅ Total de roles: ${rolesResult.rows.length}`);
    rolesResult.rows.forEach(role => {
      console.log(`   - ${role.name} (ID: ${role.id}, Level: ${role.level}, Ativo: ${role.is_active})`);
    });
    
    // 3. Verificar permissões
    console.log('\n3️⃣ PERMISSÕES:');
    const permissionsResult = await client.query(`
      SELECT COUNT(*) as total, action
      FROM permissions 
      GROUP BY action
      ORDER BY action
    `);
    
    console.log(`✅ Total de permissões por ação:`);
    permissionsResult.rows.forEach(row => {
      console.log(`   - ${row.action}: ${row.total} permissões`);
    });
    
    // 4. Verificar role_permissions (atribuição de permissões aos roles)
    console.log('\n4️⃣ ATRIBUIÇÃO DE PERMISSÕES AOS ROLES:');
    const rolePermissionsResult = await client.query(`
      SELECT 
        ur.name as role_name,
        COUNT(rp.permission_id) as total_permissions
      FROM user_roles ur
      LEFT JOIN role_permissions rp ON ur.id = rp.role_id
      GROUP BY ur.id, ur.name, ur.level
      ORDER BY ur.level DESC
    `);
    
    rolePermissionsResult.rows.forEach(row => {
      console.log(`   - ${row.role_name}: ${row.total_permissions} permissões`);
    });
    
    // 5. Verificar user_role_assignments (atribuição de roles aos usuários)
    console.log('\n5️⃣ ATRIBUIÇÃO DE ROLES AOS USUÁRIOS:');
    const userRoleAssignmentsResult = await client.query(`
      SELECT 
        u.username,
        u.email,
        ur.name as role_name,
        ur.level as role_level
      FROM users u
      JOIN user_role_assignments ura ON u.id = ura.user_id
      JOIN user_roles ur ON ura.role_id = ur.id
      WHERE u.username IN ('admin', 'superadmin')
      ORDER BY ur.level DESC
    `);
    
    console.log(`✅ Usuários admin/super admin:`);
    userRoleAssignmentsResult.rows.forEach(row => {
      console.log(`   - ${row.username} (${row.email}): ${row.role_name} (Level ${row.role_level})`);
    });
    
    // 6. Verificar permissões específicas do admin
    console.log('\n6️⃣ PERMISSÕES ESPECÍFICAS DO ADMIN:');
    const adminPermissionsResult = await client.query(`
      SELECT 
        sf.name as feature_name,
        sf.url as feature_url,
        p.action,
        ur.name as role_name
      FROM users u
      JOIN user_role_assignments ura ON u.id = ura.user_id
      JOIN user_roles ur ON ura.role_id = ur.id
      JOIN role_permissions rp ON ur.id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      JOIN system_features sf ON p.feature_id = sf.id
      WHERE u.username = 'admin'
        AND sf.is_active = true
      ORDER BY sf.name, p.action
    `);
    
    console.log(`✅ Permissões do admin: ${adminPermissionsResult.rows.length} total`);
    
    // Agrupar por funcionalidade
    const permissionsByFeature = {};
    adminPermissionsResult.rows.forEach(row => {
      if (!permissionsByFeature[row.feature_name]) {
        permissionsByFeature[row.feature_name] = [];
      }
      permissionsByFeature[row.feature_name].push(row.action);
    });
    
    Object.keys(permissionsByFeature).forEach(feature => {
      const actions = permissionsByFeature[feature].join(', ');
      console.log(`   - ${feature}: ${actions}`);
    });
    
    // 7. Verificar funcionalidades SEM permissões para admin
    console.log('\n7️⃣ FUNCIONALIDADES SEM PERMISSÕES PARA ADMIN:');
    const missingPermissionsResult = await client.query(`
      SELECT sf.name, sf.url, sf.description
      FROM system_features sf
      WHERE sf.is_active = true
        AND sf.id NOT IN (
          SELECT DISTINCT p.feature_id
          FROM users u
          JOIN user_role_assignments ura ON u.id = ura.user_id
          JOIN user_roles ur ON ura.role_id = ur.id
          JOIN role_permissions rp ON ur.id = rp.role_id
          JOIN permissions p ON rp.permission_id = p.id
          WHERE u.username = 'admin'
        )
      ORDER BY sf.name
    `);
    
    if (missingPermissionsResult.rows.length > 0) {
      console.log(`❌ Funcionalidades SEM permissões para admin: ${missingPermissionsResult.rows.length}`);
      missingPermissionsResult.rows.forEach(row => {
        console.log(`   - ${row.name} (${row.url})`);
      });
    } else {
      console.log(`✅ Todas as funcionalidades têm permissões para admin`);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkAdminPermissionsComplete();

