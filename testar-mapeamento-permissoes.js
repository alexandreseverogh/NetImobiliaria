const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  user: 'postgres',
  password: 'Roberto@2007',
  database: 'net_imobiliaria'
});

async function testarMapeamento() {
  try {
    console.log('🔍 Testando mapeamento de permissões para o admin...\n');

    // Buscar permissões do admin (simulando a query do sistema)
    const result = await pool.query(`
      SELECT 
        COALESCE(sc.slug, 'default') as resource,
        p.action,
        sf.name as funcionalidade,
        sc.name as categoria_nome
      FROM users u
      JOIN user_role_assignments ura ON u.id = ura.user_id
      JOIN role_permissions rp ON ura.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      JOIN system_features sf ON p.feature_id = sf.id
      LEFT JOIN system_categorias sc ON sf.category_id = sc.id
      WHERE u.username = 'admin'
        AND u.ativo = true
        AND sf.is_active = true
      ORDER BY sc.slug, p.action
    `);

    console.log('📋 Permissões encontradas para o admin:');
    
    // Simular o mapeamento do frontend
    const categoryMapping = {
      'sistema': 'admin-panel',
      'permissoes': 'permissions', 
      'administrativo': 'usuarios',
      'imoveis': 'imoveis',
      'clientes': 'clientes',
      'proprietarios': 'proprietarios',
      'dashboard-relatorios': 'dashboards'
    };

    const actionMapping = {
      'READ': 'READ',
      'WRITE': 'WRITE', 
      'DELETE': 'DELETE',
      'ADMIN': 'ADMIN'
    };

    const permissionsMap = {};
    
    result.rows.forEach(row => {
      const frontendResource = categoryMapping[row.resource] || row.resource;
      const permissionLevel = actionMapping[row.action] || row.action;
      
      // Manter o nível mais alto de permissão para cada recurso
      if (!permissionsMap[frontendResource] || 
          getPermissionLevel(permissionLevel) > getPermissionLevel(permissionsMap[frontendResource])) {
        permissionsMap[frontendResource] = permissionLevel;
      }
      
      console.log(`- ${row.funcionalidade} (${row.categoria_nome}) → ${row.resource} → ${frontendResource} [${row.action} → ${permissionLevel}]`);
    });

    console.log('\n🎯 Mapa final de permissões para o admin:');
    Object.keys(permissionsMap).sort().forEach(resource => {
      console.log(`✅ ${resource}: ${permissionsMap[resource]}`);
    });

    console.log('\n📊 Resumo:');
    console.log(`Total de recursos únicos: ${Object.keys(permissionsMap).length}`);
    console.log(`Recursos esperados na sidebar: admin-panel, permissions, hierarchy, roles, usuarios, imoveis, clientes, proprietarios, amenidades, proximidades, tipos-documentos, finalidades, status-imovel, tipos-imoveis, dashboards, relatorios`);

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
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

testarMapeamento();
