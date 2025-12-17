// Diagnóstico completo do problema de login
const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'net_imobiliaria',
  password: 'Roberto@2007',
  port: 5432,
});

async function debugLoginComplete() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 DIAGNÓSTICO COMPLETO DO LOGIN...\n');
    
    // 1. Verificar usuário admin
    console.log('1️⃣ VERIFICANDO USUÁRIO ADMIN:');
    const userResult = await client.query(`
      SELECT id, username, email, ativo, password IS NOT NULL as has_password
      FROM users 
      WHERE username = 'admin' OR email = 'admin@netimobiliaria.com'
    `);
    
    if (userResult.rows.length === 0) {
      console.log('❌ Usuário Admin não encontrado!');
      return;
    }
    
    const adminUser = userResult.rows[0];
    console.log(`✅ Admin encontrado: ID=${adminUser.id}, Username=${adminUser.username}, Ativo=${adminUser.ativo}`);
    
    // 2. Verificar senha (hash)
    const passwordResult = await client.query(`
      SELECT password FROM users WHERE username = 'admin'
    `);
    console.log(`🔑 Senha hash: ${passwordResult.rows[0].password.substring(0, 20)}...`);
    
    // 3. Verificar roles
    console.log('\n2️⃣ VERIFICANDO ROLES:');
    const rolesResult = await client.query(`
      SELECT r.name as role_name, r.is_active
      FROM user_role_assignments ura
      JOIN user_roles r ON ura.role_id = r.id
      WHERE ura.user_id = $1
    `, [adminUser.id]);
    
    console.log(`✅ Roles encontrados: ${rolesResult.rows.length}`);
    rolesResult.rows.forEach(role => {
      console.log(`   - ${role.role_name} (ativo: ${role.is_active})`);
    });
    
    // 4. Verificar funcionalidades
    console.log('\n3️⃣ VERIFICANDO FUNCIONALIDADES:');
    const featuresResult = await client.query(`
      SELECT COUNT(*) as total FROM system_features WHERE is_active = true
    `);
    console.log(`✅ Funcionalidades ativas: ${featuresResult.rows[0].total}`);
    
    // 5. Verificar permissões
    console.log('\n4️⃣ VERIFICANDO PERMISSÕES:');
    const permissionsResult = await client.query(`
      SELECT COUNT(*) as total FROM permissions
    `);
    console.log(`✅ Total de permissões: ${permissionsResult.rows[0].total}`);
    
    // 6. Verificar permissões do admin
    console.log('\n5️⃣ VERIFICANDO PERMISSÕES DO ADMIN:');
    const adminPermissionsResult = await client.query(`
      SELECT 
        sf.name as feature_name,
        COUNT(p.id) as permissions_count
      FROM users u
      JOIN user_role_assignments ura ON u.id = ura.user_id
      JOIN role_permissions rp ON ura.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      JOIN system_features sf ON p.feature_id = sf.id
      WHERE u.username = 'admin'
      GROUP BY sf.name
      ORDER BY sf.name
    `);
    
    console.log(`✅ Permissões do admin: ${adminPermissionsResult.rows.length} funcionalidades`);
    adminPermissionsResult.rows.forEach(row => {
      console.log(`   - ${row.feature_name}: ${row.permissions_count} permissões`);
    });
    
    // 7. Testar query de login
    console.log('\n6️⃣ TESTANDO QUERY DE LOGIN:');
    const loginQuery = `
      SELECT 
        COALESCE(sc.slug, 'default') as resource,
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
      LEFT JOIN system_categorias sc ON sf.category_id = sc.id
      WHERE u.id = $1 
        AND u.ativo = true
        AND ura.role_id IN (
          SELECT id FROM user_roles WHERE is_active = true
        )
        AND sf.is_active = true
      ORDER BY sc.sort_order, p.action
    `;
    
    try {
      const loginResult = await client.query(loginQuery, [adminUser.id]);
      console.log(`✅ Query de login executada com sucesso: ${loginResult.rows.length} permissões`);
      
      // Organizar permissões
      const permissionsMap = {};
      loginResult.rows.forEach(row => {
        const { resource, permission_level } = row;
        if (!permissionsMap[resource] || permission_level === 'ADMIN') {
          permissionsMap[resource] = permission_level;
        }
      });
      
      console.log(`✅ Mapa de permissões gerado: ${Object.keys(permissionsMap).length} recursos`);
      Object.keys(permissionsMap).forEach(resource => {
        console.log(`   - ${resource}: ${permissionsMap[resource]}`);
      });
      
    } catch (queryError) {
      console.error('❌ ERRO na query de login:', queryError.message);
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

debugLoginComplete();

