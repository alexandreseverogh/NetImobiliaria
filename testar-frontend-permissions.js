const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  user: 'postgres',
  password: 'Roberto@2007',
  database: 'net_imobiliaria'
});

async function testarFrontendPermissions() {
  try {
    console.log('🔍 Testando simulação completa do frontend...\n');

    // Simular exatamente a query do getUserPermissions
    const query = `
      SELECT 
        sf.name as funcionalidade,
        p.action
      FROM users u
      JOIN user_role_assignments ura ON u.id = ura.user_id
      JOIN role_permissions rp ON ura.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      JOIN system_features sf ON p.feature_id = sf.id
      WHERE u.username = 'admin'
        AND u.ativo = true
        AND ura.role_id IN (
          SELECT id FROM user_roles WHERE is_active = true
        )
        AND sf.is_active = true
      ORDER BY sf.name, p.action
    `;

    const result = await pool.query(query);
    
    console.log('📋 Resultado da query getUserPermissions:');
    console.log(`Total de registros: ${result.rows.length}`);
    
    // Simular o mapeamento exato do frontend
    const featureMapping = {
      'Categorias de Funcionalidades': 'system-features',
      'Funcionalidades do Sistema': 'system-features',
      'Gestão de Perfis': 'roles',
      'Gestão de permissões': 'permissions',
      'Hierarquia de Perfis': 'hierarchy',
      'Usuários': 'usuarios'
    };

    const actionMapping = {
      'READ': 'READ',
      'WRITE': 'WRITE', 
      'DELETE': 'DELETE',
      'ADMIN': 'ADMIN'
    };

    const permissionsMap = {};
    
    // Processar exatamente como o frontend
    result.rows.forEach(row => {
      const frontendResource = mapFeatureToResource(row.funcionalidade, featureMapping);
      const permissionLevel = mapActionToPermissionLevel(row.action, actionMapping);
      
      // Manter o nível mais alto de permissão para cada recurso
      if (!permissionsMap[frontendResource] || 
          getPermissionLevel(permissionLevel) > getPermissionLevel(permissionsMap[frontendResource])) {
        permissionsMap[frontendResource] = permissionLevel;
      }
    });

    console.log('\n🎯 Mapa final de permissões (como o frontend veria):');
    Object.keys(permissionsMap).sort().forEach(resource => {
      console.log(`✅ ${resource}: ${permissionsMap[resource]}`);
    });

    // Verificar especificamente os recursos que devem aparecer na sidebar
    console.log('\n🔍 Verificando recursos específicos da sidebar:');
    const recursosSidebar = [
      'Funcinalidades do Sistema',
      'Categorias de Funcionalidades',
      'Hierarquia de Perfis',
      'Gestão de Perfis', 
      'Gestão de permissões',
      'Usuários'
    ];

    recursosSidebar.forEach(recurso => {
      const frontendResource = mapFeatureToResource(recurso, featureMapping);
      const temPermissao = permissionsMap[frontendResource] !== undefined;
      const status = temPermissao ? '✅' : '❌';
      console.log(`${status} ${recurso} → ${frontendResource}: ${permissionsMap[frontendResource] || 'SEM PERMISSÃO'}`);
    });

    // Verificar se o problema pode ser no nome exato
    console.log('\n🔍 Verificando nomes exatos das funcionalidades:');
    const nomesExatos = result.rows
      .map(row => row.funcionalidade)
      .filter((nome, index, array) => array.indexOf(nome) === index)
      .sort();

    console.log('Nomes exatos encontrados:');
    nomesExatos.forEach(nome => {
      const frontendResource = mapFeatureToResource(nome, featureMapping);
      console.log(`"${nome}" → ${frontendResource}`);
    });

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

function mapFeatureToResource(funcionalidade, featureMapping) {
  return featureMapping[funcionalidade] || funcionalidade.toLowerCase().replace(/\s+/g, '-');
}

function mapActionToPermissionLevel(action, actionMapping) {
  return actionMapping[action] || action;
}

function getPermissionLevel(permission) {
  const levels = {
    'READ': 1,
    'WRITE': 2,
    'DELETE': 3,
    'ADMIN': 4
  };
  return levels[permission] || 0;
}

testarFrontendPermissions();
