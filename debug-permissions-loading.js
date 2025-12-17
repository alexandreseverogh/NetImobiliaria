// Debug completo do carregamento de permissões
const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'net_imobiliaria',
  password: 'Roberto@2007',
  port: 5432,
});

async function debugPermissionsLoading() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 DEBUG COMPLETO DO CARREGAMENTO DE PERMISSÕES...\n');
    
    // 1. Verificar usuário admin
    console.log('1️⃣ USUÁRIO ADMIN:');
    const userResult = await client.query(`
      SELECT id, username, email, role_name, role_level
      FROM users u
      LEFT JOIN user_role_assignments ura ON u.id = ura.user_id
      LEFT JOIN user_roles ur ON ura.role_id = ur.id
      WHERE u.username = 'admin'
    `);
    
    if (userResult.rows.length === 0) {
      console.log('❌ Usuário admin não encontrado!');
      return;
    }
    
    const adminUser = userResult.rows[0];
    console.log(`✅ Admin: ${adminUser.username} (ID: ${adminUser.id})`);
    console.log(`✅ Role: ${adminUser.role_name} (Level: ${adminUser.role_level})`);
    
    // 2. Verificar permissões do admin usando a query do login
    console.log('\n2️⃣ QUERY DE PERMISSÕES DO LOGIN:');
    const permissionsQuery = `
      SELECT 
        'default' as resource,
        'ADMIN' as permission_level
      FROM users u
      WHERE u.id = $1 AND u.ativo = true
      LIMIT 1
    `;
    
    const permissionsResult = await client.query(permissionsQuery, [adminUser.id]);
    console.log(`✅ Permissões retornadas: ${permissionsResult.rows.length}`);
    console.log(`✅ Permissões:`, permissionsResult.rows);
    
    // 3. Verificar permissões reais do admin
    console.log('\n3️⃣ PERMISSÕES REAIS DO ADMIN:');
    const realPermissionsQuery = `
      SELECT 
        sf.name as feature_name,
        p.action,
        COALESCE(sc.slug, 'default') as resource
      FROM users u
      JOIN user_role_assignments ura ON u.id = ura.user_id
      JOIN user_roles ur ON ura.role_id = ur.id
      JOIN role_permissions rp ON ur.id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      JOIN system_features sf ON p.feature_id = sf.id
      LEFT JOIN system_categorias sc ON sf.category_id = sc.id
      WHERE u.username = 'admin'
        AND u.ativo = true
        AND sf.is_active = true
      ORDER BY sf.name, p.action
    `;
    
    const realPermissionsResult = await client.query(realPermissionsQuery);
    console.log(`✅ Permissões reais: ${realPermissionsResult.rows.length}`);
    
    // Agrupar por funcionalidade
    const permissionsMap = {};
    realPermissionsResult.rows.forEach(row => {
      const key = row.resource || 'default';
      if (!permissionsMap[key]) {
        permissionsMap[key] = [];
      }
      permissionsMap[key].push(row.action);
    });
    
    console.log('\n✅ Mapa de permissões por recurso:');
    Object.keys(permissionsMap).forEach(resource => {
      console.log(`   - ${resource}: ${permissionsMap[resource].join(', ')}`);
    });
    
    // 4. Verificar funcionalidades específicas do sidebar
    console.log('\n4️⃣ FUNCIONALIDADES DO SIDEBAR:');
    const sidebarFeatures = [
      'Funcinalidades do Sistema',
      'Categorias de Funcionalidades', 
      'Hierarquia de Perfis',
      'Gestão de Perfis',
      'Gestão de permissões',
      'Usuários',
      'Tipos de Documentos'
    ];
    
    sidebarFeatures.forEach(featureName => {
      const hasPermission = permissionsMap[featureName] || permissionsMap['default'];
      console.log(`   - ${featureName}: ${hasPermission ? 'TEM PERMISSÃO' : 'SEM PERMISSÃO'}`);
      if (hasPermission) {
        console.log(`     Ações: ${hasPermission.join(', ')}`);
      }
    });
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

debugPermissionsLoading();

